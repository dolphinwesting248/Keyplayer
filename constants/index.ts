import type { AppMode, InstrumentId, InstrumentPreset, SamplePoint } from "~/types";

export const KEY_MAP: Record<string, number> = {
  q: 0, w: 2, e: 4, r: 5, t: 7, y: 9, u: 11, i: 12, o: 14, p: 16,
  a: 1, s: 3, d: 6, f: 8, g: 10, h: 13, j: 15, k: 18, l: 20,
  z: -12, x: -10, c: -8, v: -7, b: -5, n: -3, m: -1,
};

export const NOTE_NAMES: Record<number, string> = {
  0: "C", 1: "C#", 2: "D", 3: "D#", 4: "E", 5: "F",
  6: "F#", 7: "G", 8: "G#", 9: "A", 10: "A#", 11: "B",
};

export const INSTRUMENTS: Record<InstrumentId, InstrumentPreset> = {
  piano: {
    id: "piano", label: "Piano",
    samplePoints: [
      { noteName: "C0", semitone: -48, file: "piano/piano-c0.wav" },
      { noteName: "C1", semitone: -36, file: "piano/piano-c1.wav" },
      { noteName: "C2", semitone: -24, file: "piano/piano-c2.wav" },
      { noteName: "C3", semitone: -12, file: "piano/piano-c3.wav" },
      { noteName: "C4", semitone: 0,   file: "piano/piano-c4.wav" },
      { noteName: "C5", semitone: 12,  file: "piano/piano-c5.wav" },
      { noteName: "C6", semitone: 24,  file: "piano/piano-c6.wav" },
      { noteName: "C7", semitone: 36,  file: "piano/piano-c7.wav" },
      { noteName: "C8", semitone: 48,  file: "piano/piano-c8.wav" },
    ],
    semitoneMin: -48, semitoneMax: 48, baseGain: 1.5,
  },
  chip: {
    id: "chip", label: "chip",
    samplePoints: [],
    semitoneMin: -48, semitoneMax: 48,
    synthesis: true, baseGain: 0.1,
  },
  guitar: {
    id: "guitar", label: "Guitar",
    samplePoints: [
      { noteName: "C1", semitone: -36, file: "guitar/guitar-c1.wav" },
      { noteName: "C2", semitone: -24, file: "guitar/guitar-c2.wav" },
      { noteName: "C3", semitone: -12, file: "guitar/guitar-c3.wav" },
      { noteName: "C4", semitone: 0,   file: "guitar/guitar-c4.wav" },
      { noteName: "C5", semitone: 12,  file: "guitar/guitar-c5.wav" },
      { noteName: "C6", semitone: 24,  file: "guitar/guitar-c6.wav" },
      { noteName: "C7", semitone: 36,  file: "guitar/guitar-c7.wav" },
    ],
    semitoneMin: -48, semitoneMax: 48,
    baseGain: 1.2,
  },
  eguitar: {
    id: "eguitar", label: "E-Guitar",
    samplePoints: [
      { noteName: "C1", semitone: -36, file: "eguitar/eguitar-c1.wav" },
      { noteName: "C2", semitone: -24, file: "eguitar/eguitar-c2.wav" },
      { noteName: "C3", semitone: -12, file: "eguitar/eguitar-c3.wav" },
      { noteName: "C5", semitone: 12,  file: "eguitar/eguitar-c5.wav" },
      { noteName: "C6", semitone: 24,  file: "eguitar/eguitar-c6.wav" },
    ],
    semitoneMin: -48, semitoneMax: 48,
    baseGain: 0.9,
  },
  bass: {
    id: "bass", label: "Bass",
    samplePoints: [
      { noteName: "C0", semitone: -48, file: "bass/bass-c0.wav" },
      { noteName: "C1", semitone: -36, file: "bass/bass-c1.wav" },
      { noteName: "C2", semitone: -24, file: "bass/bass-c2.wav" },
      { noteName: "C3", semitone: -12, file: "bass/bass-c3.wav" },
      { noteName: "C4", semitone: 0,   file: "bass/bass-c4.wav" },
    ],
    semitoneMin: -48, semitoneMax: 48,
    baseGain: 1.0,
  },
  sax: {
    id: "sax", label: "Saxophone",
    samplePoints: [
      { noteName: "C1", semitone: -36, file: "sax/sax-c1.wav" },
      { noteName: "C2", semitone: -24, file: "sax/sax-c2.wav" },
      { noteName: "C3", semitone: -12, file: "sax/sax-c3.wav" },
      { noteName: "C4", semitone: 0,   file: "sax/sax-c4.wav" },
      { noteName: "C5", semitone: 12,  file: "sax/sax-c5.wav" },
      { noteName: "C6", semitone: 24,  file: "sax/sax-c6.wav" },
      { noteName: "C7", semitone: 36,  file: "sax/sax-c7.wav" },
    ],
    semitoneMin: -48, semitoneMax: 48,
    baseGain: 1.0,
  },
  organ: {
    id: "organ", label: "Organ",
    samplePoints: [
      { noteName: "C0", semitone: -48, file: "organ/organ-c0.wav" },
      { noteName: "C1", semitone: -36, file: "organ/organ-c1.wav" },
      { noteName: "C2", semitone: -24, file: "organ/organ-c2.wav" },
      { noteName: "C3", semitone: -12, file: "organ/organ-c3.wav" },
      { noteName: "C4", semitone: 0,   file: "organ/organ-c4.wav" },
      { noteName: "C5", semitone: 12,  file: "organ/organ-c5.wav" },
      { noteName: "C6", semitone: 24,  file: "organ/organ-c6.wav" },
      { noteName: "C7", semitone: 36,  file: "organ/organ-c7.wav" },
    ],
    semitoneMin: -48, semitoneMax: 48,
    baseGain: 0.8,
  },
};

export const MODE_CYCLE: AppMode[] = ["play", "hybrid", "silent"];
export const MODE_LABELS: Record<string, string> = { play: "Play", hybrid: "Hybrid", silent: "Silent" };

export const DEFAULT_INSTRUMENT: InstrumentId = "piano";
export const DEFAULT_INSTRUMENT_LIST: InstrumentId[] = ["piano"];
export const OCTAVE_MIN = -5;
export const OCTAVE_MAX = 5;
export const SEMITONE_MIN = -48;
export const SEMITONE_MAX = 48;
export const VOLUME_STEP = 0.1;
export const VELOCITY_BOOST = 1.3;
export const MAX_NOTE_HISTORY = 3;

export function getNoteName(semitoneOffset: number, octaveOffset: number): string {
  const total = semitoneOffset + octaveOffset * 12;
  const clamped = Math.max(SEMITONE_MIN, Math.min(SEMITONE_MAX, total));
  const octave = Math.floor((clamped + 48) / 12);
  const noteIndex = ((clamped % 12) + 12) % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}
