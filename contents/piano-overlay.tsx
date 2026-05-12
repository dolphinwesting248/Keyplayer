// contents/piano-overlay.tsx

import type { PlasmoCSConfig } from "plasmo";
import { useCallback, useEffect, useRef, useState } from "react";
import FloatingHint from "~/components/FloatingHint";
import type { HintData, NoteHistoryEntry, ProgressHint } from "~/components/FloatingHint";
import { audioPlayer } from "~/hooks/useAudioPlayer";
import {
  type AppMode,
  type InstrumentId,
  type Settings,
  INSTRUMENTS,
  KEY_MAP,
  MAX_NOTE_HISTORY,
  MODE_CYCLE,
  MODE_LABELS,
  OCTAVE_MAX,
  OCTAVE_MIN,
  VELOCITY_BOOST,
  VOLUME_STEP,
  getNoteName,
} from "~/types";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_start",
  all_frames: true,
};

const DEFAULT_SETTINGS: Settings = {
  mode: "silent",
  volume: 0.7,
  showFloatingHint: true,
  octaveOffset: 0,
  instrument: "piano",
  instrumentList: ["piano"],
  reverb: 0,
};


import { safeStorageGet, safeStorageSet, safeOnChanged, isInputFocused } from "./utils/chrome-api";

function formatOctave(offset: number): string {
  if (offset > 0) return `+${offset}`;
  return String(offset);
}

export default function PianoOverlay() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hint, setHint] = useState<HintData | null>(null);
  const pressedKeysRef = useRef(new Set<string>());
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Sustain: when Space is held, note stops are deferred
  const sustainRef = useRef(false);
  const sustainHeldRef = useRef(new Set<string>());

  // Velocity: Shift held = louder
  const shiftRef = useRef(false);

  // Note history for stacked display
  const noteHistoryRef = useRef<NoteHistoryEntry[]>([]);

  // Song playback state
  const playbackTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const playbackNoteIdsRef = useRef<string[]>([]);
  const playbackActiveRef = useRef(false);

  // Recording state
  const recordingRef = useRef(false);
  const recordStartRef = useRef(0);
  const recordNotesRef = useRef<Array<{ s: number; t: number; d: number; i?: string }>>([]);
  const recordPressTimeRef = useRef<Map<string, number>>(new Map());

  // Load settings and wire audio progress on mount
  useEffect(() => {
    safeStorageGet(
      ["mode", "volume", "showFloatingHint", "octaveOffset", "instrument", "reverb"],
      (result) => {
        const merged = { ...DEFAULT_SETTINGS, ...result };
        setSettings(merged);
        audioPlayer.setVolume(merged.volume);
        audioPlayer.setReverb(merged.reverb);
        audioPlayer.init(INSTRUMENTS[merged.instrument as InstrumentId] ?? INSTRUMENTS.piano);
      },
    );

    const removeListener = safeOnChanged((changes) => {
      setSettings((prev) => {
        const next = { ...prev };
        if (changes.mode) next.mode = changes.mode.newValue;
        if (changes.volume) {
          next.volume = changes.volume.newValue;
          audioPlayer.setVolume(next.volume);
        }
        if (changes.showFloatingHint !== undefined) {
          next.showFloatingHint = changes.showFloatingHint.newValue;
        }
        if (changes.octaveOffset !== undefined) {
          next.octaveOffset = changes.octaveOffset.newValue;
        }
        if (changes.instrument) {
          next.instrument = changes.instrument.newValue;
          audioPlayer.init(INSTRUMENTS[next.instrument] ?? INSTRUMENTS.piano);
        }
        if (changes.instrumentList) {
          next.instrumentList = changes.instrumentList.newValue;
        }
        if (changes.reverb !== undefined) {
          next.reverb = changes.reverb.newValue;
          audioPlayer.setReverb(next.reverb);
        }
        return next;
      });
    });

    audioPlayer.onProgress = (loaded: number, total: number, label: string) => {
      const progressHint: ProgressHint = { type: "progress", loaded, total, label };
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      setHint(progressHint);
      if (loaded === total) {
        hintTimerRef.current = setTimeout(() => setHint(null), 1200);
      }
    };

    return () => {
      removeListener();
      audioPlayer.onProgress = null;
    };
  }, []);

  // --- Song playback via message from popup ---

  const playbackStartRef = useRef(0);
  const totalDurationRef = useRef(0);
  const songOffsetRef = useRef(0);
  const progressUpdaterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const restoreUserInstrument = useCallback(() => {
    const id = settingsRef.current.instrument;
    const preset = INSTRUMENTS[id] ?? INSTRUMENTS.piano;
    audioPlayer.init(preset);
  }, []);

  const stopPlayback = useCallback(() => {
    playbackActiveRef.current = false;
    for (const id of playbackTimersRef.current) clearTimeout(id);
    playbackTimersRef.current = [];
    if (progressUpdaterRef.current) { clearInterval(progressUpdaterRef.current); progressUpdaterRef.current = null; }
    for (const noteId of playbackNoteIdsRef.current) audioPlayer.stopNote(noteId);
    playbackNoteIdsRef.current = [];
  }, []);

  const scheduleNotes = useCallback((song: { octave: number; notes: Array<{ s: number; t: number; d: number; i?: string }> }, offset: number) => {
    playbackTimersRef.current.forEach(clearTimeout);
    playbackTimersRef.current = [];
    playbackNoteIdsRef.current.forEach((id) => audioPlayer.stopNote(id));
    playbackNoteIdsRef.current = [];

    const semitoneOffset = song.octave * 12;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const noteIds: string[] = [];

    for (let i = 0; i < song.notes.length; i++) {
      const n = song.notes[i];
      const noteStart = n.t - offset;
      if (noteStart + n.d <= 0) continue; // already finished
      const clampedStart = Math.max(0, noteStart);
      const semitone = n.s + semitoneOffset;
      const noteId = `song_${i}`;

      if (clampedStart > 0) {
        timers.push(setTimeout(() => {
          if (!playbackActiveRef.current) return;
          const doPlay = () => { audioPlayer.playNote(noteId, semitone); noteIds.push(noteId); };
          if (n.i) { audioPlayer.init(INSTRUMENTS[n.i as InstrumentId]).then(doPlay); }
          else doPlay();
        }, clampedStart));
      } else {
        const doPlay = () => { audioPlayer.playNote(noteId, semitone); noteIds.push(noteId); };
        if (n.i) { audioPlayer.init(INSTRUMENTS[n.i as InstrumentId]).then(doPlay); }
        else doPlay();
      }

      const endTime = noteStart + n.d;
      if (endTime > 0) {
        timers.push(setTimeout(() => {
          if (!playbackActiveRef.current) return;
          audioPlayer.stopNote(noteId);
        }, Math.max(0, endTime)));
      }
    }

    playbackTimersRef.current = timers;
    playbackNoteIdsRef.current = noteIds;
    return timers;
  }, []);

  const startPlayback = useCallback((song: { title: string; octave: number; notes: Array<{ s: number; t: number; d: number }> }, offset: number) => {
    stopPlayback();
    playbackActiveRef.current = true;
    songOffsetRef.current = offset;
    playbackStartRef.current = Date.now() - offset;

    const lastNote = song.notes[song.notes.length - 1];
    totalDurationRef.current = lastNote.t + lastNote.d;
    scheduleNotes(song, offset);

    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setHint({ type: "setting", label: "Playing", value: song.title });
    hintTimerRef.current = null;

    // End-of-song timer
    const remaining = totalDurationRef.current - offset;
    playbackTimersRef.current.push(setTimeout(() => {
      if (playbackActiveRef.current) {
        playbackActiveRef.current = false;
        safeStorageSet({ playbackPaused: false });
        setHint(null);
        restoreUserInstrument();
      }
    }, remaining + 500));
  }, [stopPlayback, scheduleNotes, restoreUserInstrument]);

  const getProgress = useCallback((): { current: number; total: number; title: string } | null => {
    if (!playbackActiveRef.current) return null;
    return {
      current: Date.now() - playbackStartRef.current,
      total: totalDurationRef.current,
      title: "", // filled by caller
    };
  }, []);

  useEffect(() => {
    const listener = (
      msg: unknown,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (r: unknown) => void,
    ) => {
      const message = msg as { type: string; song?: { title: string; octave: number; notes: Array<{ s: number; t: number; d: number }> }; offset?: number };
      if (message.type === "GET_PLAYBACK_STATE") {
        const prog = getProgress();
        safeStorageGet(["lastSong", "playbackPaused", "playbackPausedAt"], (result) => {
          const paused = !!(result.playbackPaused as boolean);
          const song = result.lastSong as { id?: string; title?: string } | undefined;
          const total = totalDurationRef.current || 0;
          const pausedAt = (result.playbackPausedAt as number) || 0;
          sendResponse({
            playing: playbackActiveRef.current || paused,
            paused,
            progress: prog || (paused && total ? { current: pausedAt, total } : null),
            songId: song?.id || null,
            songTitle: song?.title || "",
          });
        });
      } else if (message.type === "GET_AUDIO_STATUS") {
        sendResponse({ ready: audioPlayer.isFullyLoaded, loading: false, songId: "" });
      } else if (message.type === "LOAD_AUDIO_THEN_PLAY" && message.song) {
        const song = message.song as { title: string; octave: number; notes: Array<{ s: number; t: number; d: number }> };
        const offset = (message.offset as number) || 0;
        audioPlayer.init().then(() => startPlayback(song, offset));
        sendResponse({ ok: true });
      } else if (message.type === "PLAY_SONG" && message.song) {
        startPlayback(message.song, message.offset || 0);
        safeStorageSet({ lastSong: message.song, playbackPaused: false });
        sendResponse({ ok: true });
      } else if (message.type === "STOP_SONG") {
        stopPlayback();
        const isPaused = !!(message as Record<string,unknown>).paused;
        safeStorageSet({ playbackPaused: isPaused });
        if (isPaused) {
          const current = Date.now() - playbackStartRef.current;
          safeStorageSet({ playbackPausedAt: Math.max(0, current) });
        } else {
          restoreUserInstrument();
        }
        setHint(null);
        sendResponse({ ok: true });
      } else if (message.type === "GET_PROGRESS") {
        const prog = getProgress();
        sendResponse(prog ? { ...prog, title: "" } : null);
      } else if (message.type === "SEEK_SONG" && message.offset !== undefined) {
        if (playbackActiveRef.current) {
          const offset = Math.max(0, message.offset);
          safeStorageGet(["lastSong"], (result) => {
            const s = result.lastSong as { title: string; octave: number; notes: Array<{ s: number; t: number; d: number }> } | undefined;
            if (s) startPlayback(s, offset);
          });
        }
        sendResponse({ ok: true });
      }
      return true;
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [startPlayback, stopPlayback, getProgress, scheduleNotes, restoreUserInstrument]);

  const exportRecording = useCallback((_octaveOffset: number) => {
    const raw = recordNotesRef.current;
    if (raw.length === 0) return;

    // Trim leading silence: subtract first note's t from all
    const offset = raw[0].t;
    const notes = raw.map((n) => {
      const note: { s: number; t: number; d: number; i?: string } = { s: n.s, t: n.t - offset, d: n.d };
      if (n.i) note.i = n.i;
      return note;
    });

    const song = {
      title: `Key ${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`,
      bpm: 120,
      octave: 0,
      notes,
    };

    const blob = new Blob([JSON.stringify(song, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${song.title}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const pushNoteToHistory = useCallback((entry: NoteHistoryEntry) => {
    noteHistoryRef.current = [...noteHistoryRef.current, entry].slice(-MAX_NOTE_HISTORY);
  }, []);

  const showHint = useCallback((data: HintData) => {
    if (!settingsRef.current.showFloatingHint) return;
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setHint(data);
    hintTimerRef.current = setTimeout(() => setHint(null), 2100);
  }, []);

  const showNoteHint = useCallback((keyName: string, noteName: string, velocity: number = 1) => {
    if (!settingsRef.current.showFloatingHint) return;
    pushNoteToHistory({ keyName, noteName, velocity: velocity > 1 ? velocity : undefined });
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setHint({ type: "note", notes: [...noteHistoryRef.current] });
    hintTimerRef.current = setTimeout(() => setHint(null), 2100);
  }, [pushNoteToHistory]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.repeat) return;
    const s = settingsRef.current;

    // Backtick → cycle mode — always active, never intercepted
    if (e.key === "`") {
      e.preventDefault();
      e.stopPropagation();
      const idx = MODE_CYCLE.indexOf(s.mode);
      const nextMode = MODE_CYCLE[(idx + 1) % MODE_CYCLE.length];
      safeStorageSet({ mode: nextMode });
      setSettings((prev) => ({ ...prev, mode: nextMode }));
      showHint({ type: "setting", label: "Mode", value: MODE_LABELS[nextMode] });
      return;
    }

    // Modifier tracking — follows mode/input scope
    if (e.key === "Shift") {
      if (s.mode === "silent") return;
      if (s.mode === "hybrid" && isInputFocused()) return;
      shiftRef.current = true;
      return;
    }

    // Silent: nothing below fires
    if (s.mode === "silent") return;

    // Hybrid + input: nothing below fires
    if (s.mode === "hybrid" && isInputFocused()) return;

    // Apostrophe → toggle recording — follows mode/input scope
    if (e.key === "'") {
      e.preventDefault();
      e.stopPropagation();
      recordingRef.current = !recordingRef.current;
      if (recordingRef.current) {
        recordStartRef.current = Date.now();
        recordNotesRef.current = [];
        recordPressTimeRef.current.clear();
        showHint({ type: "setting", label: "● REC", value: "" });
      } else {
        exportRecording(s.octaveOffset);
        showHint({ type: "setting", label: "Saved", value: "" });
      }
      return;
    }

    // Space → sustain
    if (e.code === "Space") {
      e.preventDefault();
      e.stopPropagation();
      sustainRef.current = true;
      showHint({ type: "setting", label: "Sustain", value: "ON" });
      return;
    }

    // Octave switching
    if (e.key === "[") {
      e.preventDefault();
      e.stopPropagation();
      const newOffset = Math.max(OCTAVE_MIN, s.octaveOffset - 1);
      safeStorageSet({ octaveOffset: newOffset });
      setSettings((prev) => ({ ...prev, octaveOffset: newOffset }));
      showHint({ type: "setting", label: "Octave", value: formatOctave(newOffset) });
      return;
    }
    if (e.key === "]") {
      e.preventDefault();
      e.stopPropagation();
      const newOffset = Math.min(OCTAVE_MAX, s.octaveOffset + 1);
      safeStorageSet({ octaveOffset: newOffset });
      setSettings((prev) => ({ ...prev, octaveOffset: newOffset }));
      showHint({ type: "setting", label: "Octave", value: formatOctave(newOffset) });
      return;
    }

    // Volume control
    if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      e.stopPropagation();
      const newVol = Math.max(0, +(s.volume - VOLUME_STEP).toFixed(1));
      safeStorageSet({ volume: newVol });
      setSettings((prev) => ({ ...prev, volume: newVol }));
      audioPlayer.setVolume(newVol);
      showHint({ type: "setting", label: "Volume", value: `${Math.round(newVol * 100)}%` });
      return;
    }
    if (e.key === "=" || e.key === "+") {
      e.preventDefault();
      e.stopPropagation();
      const newVol = Math.min(1, +(s.volume + VOLUME_STEP).toFixed(1));
      safeStorageSet({ volume: newVol });
      setSettings((prev) => ({ ...prev, volume: newVol }));
      audioPlayer.setVolume(newVol);
      showHint({ type: "setting", label: "Volume", value: `${Math.round(newVol * 100)}%` });
      return;
    }

    // Reverb toggle
    if (e.key === "\\") {
      e.preventDefault();
      e.stopPropagation();
      const newReverb = s.reverb > 0 ? 0 : 0.3;
      safeStorageSet({ reverb: newReverb });
      setSettings((prev) => ({ ...prev, reverb: newReverb }));
      audioPlayer.setReverb(newReverb);
      showHint({ type: "setting", label: "Reverb", value: newReverb > 0 ? "ON" : "OFF" });
      return;
    }

    // Number keys 1-9: direct instrument switch
    if (e.key >= "1" && e.key <= "9") {
      e.preventDefault();
      e.stopPropagation();
      const list = s.instrumentList?.length ? s.instrumentList : Object.keys(INSTRUMENTS) as InstrumentId[];
      const idx = Number(e.key) - 1;
      if (idx < list.length && list[idx] !== s.instrument) {
        const nextId = list[idx];
        safeStorageSet({ instrument: nextId });
        setSettings((prev) => ({ ...prev, instrument: nextId }));
        const preset = INSTRUMENTS[nextId];
        audioPlayer.init(preset);
        if (preset.synthesis) {
          const progressHint: ProgressHint = { type: "progress", loaded: 0, total: 0, label: preset.label };
          if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
          setHint(progressHint);
          hintTimerRef.current = setTimeout(() => setHint(null), 1500);
        }
      }
      return;
    }

    // Instrument cycling
    if (e.key === ";") {
      e.preventDefault();
      e.stopPropagation();
      const ids = s.instrumentList?.length ? s.instrumentList : Object.keys(INSTRUMENTS) as InstrumentId[];
      const idx = ids.indexOf(s.instrument);
      const nextId = ids[(idx + 1) % ids.length] || ids[0];
      safeStorageSet({ instrument: nextId });
      setSettings((prev) => ({ ...prev, instrument: nextId }));
      const preset = INSTRUMENTS[nextId];
      audioPlayer.init(preset);
      if (preset.synthesis) {
        const progressHint: ProgressHint = { type: "progress", loaded: 0, total: 0, label: preset.label };
        if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
        setHint(progressHint);
        hintTimerRef.current = setTimeout(() => setHint(null), 1500);
      }
      return;
    }

    const key = e.key.toLowerCase();
    if (pressedKeysRef.current.has(key)) return;

    const semitoneOffset = KEY_MAP[key];
    if (semitoneOffset !== undefined) {
      e.preventDefault();
      e.stopPropagation();
      pressedKeysRef.current.add(key);
      const totalSemitone = semitoneOffset + s.octaveOffset * 12;
      const noteId = key + totalSemitone;
      const noteName = getNoteName(semitoneOffset, s.octaveOffset);
      const velocity = shiftRef.current ? VELOCITY_BOOST : 1;
      audioPlayer.playNote(noteId, totalSemitone, velocity);
      if (audioPlayer.isFullyLoaded) {
        showNoteHint(key, noteName, velocity);
      }
      // Recording: track press time + octave-adjusted semitone
      if (recordingRef.current) {
        recordPressTimeRef.current.set(key, Date.now() - recordStartRef.current);
        recordPressTimeRef.current.set(key + "_s", totalSemitone);
      }
    }
  }, [showHint, showNoteHint]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();

    if (e.code === "Space") {
      if (sustainRef.current) {
        sustainRef.current = false;
        for (const noteId of sustainHeldRef.current) {
          audioPlayer.stopNote(noteId);
        }
        sustainHeldRef.current.clear();
        showHint({ type: "setting", label: "Sustain", value: "OFF" });
      }
      return;
    }

    if (e.key === "Shift") {
      shiftRef.current = false;
      return;
    }

    pressedKeysRef.current.delete(key);

    const semitoneOffset = KEY_MAP[key];
    if (semitoneOffset !== undefined) {
      const totalSemitone = semitoneOffset + settingsRef.current.octaveOffset * 12;
      const noteId = key + totalSemitone;

      if (sustainRef.current) {
        sustainHeldRef.current.add(noteId);
      } else {
        audioPlayer.stopNote(noteId);
      }
      // Recording: finalize note
      if (recordingRef.current) {
        const pressTime = recordPressTimeRef.current.get(key);
        if (pressTime !== undefined) {
          const t = pressTime;
          const d = Date.now() - recordStartRef.current - t;
          const s = recordPressTimeRef.current.get(key + "_s") ?? semitoneOffset;
          recordNotesRef.current.push({ s, t, d: Math.max(50, d), i: settingsRef.current.instrument });
          recordPressTimeRef.current.delete(key);
          recordPressTimeRef.current.delete(key + "_s");
        }
      }
    }
  }, [showHint]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    document.addEventListener("keyup", handleKeyUp, { capture: true });
    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
      document.removeEventListener("keyup", handleKeyUp, { capture: true });
    };
  }, []);

  return <FloatingHint hint={hint} />;
}
