// utils/midi.ts — minimal MIDI file parser

export interface MidiNote {
  s: number; // semitone relative to C4 (MIDI 60)
  t: number; // start time in ms
  d: number; // duration in ms
}

export interface MidiResult {
  title: string;
  notes: MidiNote[];
  bpm: number;
}

class Reader {
  private view: DataView;
  pos = 0;

  constructor(buf: ArrayBuffer) {
    this.view = new DataView(buf);
  }

  u8() { return this.view.getUint8(this.pos++); }
  u16() { const v = this.view.getUint16(this.pos); this.pos += 2; return v; }
  u32() { const v = this.view.getUint32(this.pos); this.pos += 4; return v; }

  readVLQ(): number {
    let v = 0;
    for (let i = 0; i < 4; i++) {
      const b = this.u8();
      v = (v << 7) | (b & 0x7f);
      if (!(b & 0x80)) break;
    }
    return v;
  }

  skip(n: number) { this.pos += n; }

  readString(len: number): string {
    let s = "";
    for (let i = 0; i < len; i++) s += String.fromCharCode(this.u8());
    return s;
  }

  done() { return this.pos >= this.view.byteLength; }
}

export function parseMidi(buffer: ArrayBuffer, filename?: string): MidiResult {
  const r = new Reader(buffer);

  // Header
  if (r.readString(4) !== "MThd") throw new Error("Not a MIDI file");
  if (r.u32() !== 6) throw new Error("Bad header size");
  const format = r.u16();
  const tracks = r.u16();
  const ticksPerQuarter = r.u16();

  // Read all tracks
  const allNotes: Array<{ s: number; t: number; d: number; track: number }> = [];
  const tempos: Array<{ tick: number; usPerQuarter: number }> = [{ tick: 0, usPerQuarter: 500000 }]; // default 120 BPM

  for (let ti = 0; ti < tracks; ti++) {
    if (r.readString(4) !== "MTrk") throw new Error("Missing track header");
    const trackLen = r.u32();
    const endPos = r.pos + trackLen;

    let tick = 0;
    let runningStatus = 0;
    const openNotes: Map<number, { s: number; tick: number }> = new Map();

    while (r.pos < endPos) {
      const dt = r.readVLQ();
      tick += dt;
      let status = r.u8();

      if (status < 0x80) {
        r.pos--;
        status = runningStatus;
      } else {
        runningStatus = status;
      }

      const cmd = status & 0xf0;
      const ch = status & 0x0f;

      if (cmd === 0x90) {
        const note = r.u8();
        const vel = r.u8();
        if (vel > 0) {
          openNotes.set(note, { s: note - 60, tick });
        } else {
          const on = openNotes.get(note);
          if (on) {
            allNotes.push({ s: on.s, t: on.tick, d: tick - on.tick, track: ti });
            openNotes.delete(note);
          }
        }
      } else if (cmd === 0x80) {
        const note = r.u8();
        r.u8(); // velocity (ignore)
        const on = openNotes.get(note);
        if (on) {
          allNotes.push({ s: on.s, t: on.tick, d: tick - on.tick, track: ti });
          openNotes.delete(note);
        }
      } else if (status === 0xff) {
        const type = r.u8();
        const len = r.readVLQ();
        if (type === 0x51 && len === 3) {
          const usPerQuarter = (r.u8() << 16) | (r.u8() << 8) | r.u8();
          tempos.push({ tick, usPerQuarter });
        } else if (type === 0x03) {
          // Track name — skip
          r.skip(len);
        } else if (type === 0x2f) {
          break; // end of track
        } else {
          r.skip(len);
        }
      } else if (cmd === 0xc0 || cmd === 0xd0) {
        r.skip(1);
      } else if (cmd === 0xb0 || cmd === 0xe0) {
        r.skip(2);
      } else {
        // unknown, skip 2 bytes
        r.skip(2);
      }
    }

    // Close any remaining open notes
    for (const [, on] of openNotes) {
      allNotes.push({ s: on.s, t: on.tick, d: 500, track: ti });
    }
  }

  if (allNotes.length === 0) throw new Error("No notes in MIDI file");

  // Convert ticks to ms
  tempos.sort((a, b) => a.tick - b.tick);
  function tickToMs(t: number): number {
    let ms = 0;
    let prevTick = 0;
    let usPerQuarter = 500000;
    for (const tm of tempos) {
      if (tm.tick > t) break;
      ms += ((tm.tick - prevTick) / ticksPerQuarter) * (usPerQuarter / 1000);
      prevTick = tm.tick;
      usPerQuarter = tm.usPerQuarter;
    }
    ms += ((t - prevTick) / ticksPerQuarter) * (usPerQuarter / 1000);
    return Math.round(ms);
  }

  const notes = allNotes.map((n) => ({
    s: n.s,
    t: tickToMs(n.t),
    d: Math.max(10, Math.round(tickToMs(n.t + n.d) - tickToMs(n.t))),
  }));

  notes.sort((a, b) => a.t - b.t || a.s - b.s);

  // Trim leading silence (> 500ms)
  if (notes.length > 0 && notes[0].t > 500) {
    const offset = notes[0].t;
    for (const n of notes) n.t -= offset;
  }

  const name = filename?.replace(/\.midi?$/i, "") || "MIDI Import";

  return { title: name, notes, bpm: 120 };
}
