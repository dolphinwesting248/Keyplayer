// utils/midi-export.ts — export Song to MIDI binary

export function songToMidi(song: { title: string; octave: number; notes: Array<{ s: number; t: number; d: number }> }): Uint8Array {
  const TPQ = 480;
  const usPerQuarter = 500000;
  const msPerTick = (usPerQuarter / 1000) / TPQ;

  const name = song.title || "Export";

  // Build sorted event list
  type MidiEvent = { tick: number; data: number[] };
  const events: MidiEvent[] = [];

  // Tempo
  events.push({ tick: 0, data: [0xff, 0x51, 0x03, (usPerQuarter >> 16) & 0xff, (usPerQuarter >> 8) & 0xff, usPerQuarter & 0xff] });
  // Track name
  events.push({ tick: 0, data: [0xff, 0x03, name.length, ...strToBytes(name)] });

  for (const n of song.notes) {
    const midi = n.s + song.octave * 12 + 60;
    if (midi < 0 || midi > 127) continue;
    const start = Math.round(n.t / msPerTick);
    const end = Math.round((n.t + n.d) / msPerTick);
    if (end <= start) continue;

    events.push({ tick: start, data: [0x90, midi, 100] });
    events.push({ tick: end, data: [0x80, midi, 0] });
  }

  events.sort((a, b) => a.tick - b.tick);

  // End of track
  const lastTick = events.length > 0 ? events[events.length - 1].tick : 0;
  events.push({ tick: lastTick, data: [0xff, 0x2f, 0x00] });

  // Build track data with delta times
  const trackBytes: number[] = [];
  let prevTick = 0;
  for (const ev of events) {
    trackBytes.push(...vlq(ev.tick - prevTick));
    trackBytes.push(...ev.data);
    prevTick = ev.tick;
  }

  // Assemble MIDI file
  const hdr: number[] = [...strToBytes("MThd"), ...u32(6), ...u16(0), ...u16(1), ...u16(TPQ)];
  const trk: number[] = [...strToBytes("MTrk"), ...u32(trackBytes.length), ...trackBytes];

  const result = new Uint8Array(hdr.length + trk.length);
  result.set(hdr, 0);
  result.set(trk, hdr.length);
  return result;
}

function strToBytes(s: string): number[] { return Array.from(new TextEncoder().encode(s)); }
function u16(v: number): number[] { return [(v >> 8) & 0xff, v & 0xff]; }
function u32(v: number): number[] { return [(v >> 24) & 0xff, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff]; }
function vlq(v: number): number[] {
  if (v === 0) return [0];
  const b: number[] = [];
  let x = v;
  while (x > 0) { b.unshift(x & 0x7f); x >>= 7; }
  for (let i = 0; i < b.length - 1; i++) b[i] |= 0x80;
  return b;
}
