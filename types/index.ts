// ---- Types ----

export type AppMode = "play" | "hybrid" | "silent";
export type InstrumentId = "piano" | "chip" | "guitar" | "eguitar" | "bass" | "sax" | "organ";

export interface Settings {
  mode: AppMode;
  volume: number;
  showFloatingHint: boolean;
  octaveOffset: number;
  instrument: InstrumentId;
  instrumentList: InstrumentId[];
  reverb: number;
  recordFormat: "json" | "midi";
}

export interface SamplePoint {
  noteName: string;
  semitone: number;
  file: string;
}

export interface InstrumentPreset {
  id: InstrumentId;
  label: string;
  samplePoints: SamplePoint[];
  semitoneMin: number;
  semitoneMax: number;
  synthesis?: boolean;
  baseGain?: number;
}

export interface SongNote {
  s: number;
  t: number;
  d: number;
  i?: InstrumentId;
  o?: number; // per-note octave shift (±5)
}

export interface Song {
  id: string;
  title: string;
  octave: number;
  notes: SongNote[];
}

// ---- Re-exports from constants (backward compatible) ----

export {
  KEY_MAP, NOTE_NAMES, INSTRUMENTS, MODE_CYCLE, MODE_LABELS,
  DEFAULT_INSTRUMENT, DEFAULT_INSTRUMENT_LIST, OCTAVE_MIN, OCTAVE_MAX, SEMITONE_MIN, SEMITONE_MAX,
  VOLUME_STEP, VELOCITY_BOOST, MAX_NOTE_HISTORY, getNoteName, semitoneToKey,
} from "~/constants";
