// popup.tsx

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppMode, InstrumentId, Settings, Song } from "~/types";
import { INSTRUMENTS, OCTAVE_MAX, OCTAVE_MIN } from "~/types";
import { parseMidi } from "~/utils/midi";
import { songToMidi } from "~/utils/midi-export";
import { T, PlayIcon, PauseIcon, DeleteIcon, DownloadIcon, LoaderIcon, IconBtn, fmtTime, songDuration } from "./popup/components/Icons";

const shadow = "0 1px 0 rgba(43,38,33,0.04)";
const radius = 10;

const MODE_OPTIONS: { mode: AppMode; label: string }[] = [
  { mode: "play", label: "Play" }, { mode: "hybrid", label: "Hybrid" }, { mode: "silent", label: "Silent" },
];
const INSTRUMENT_OPTIONS = Object.values(INSTRUMENTS);

const labelCss: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6,
};
const sharedBtn: React.CSSProperties = {
  flex: 1, padding: "8px 0", border: `1.5px solid ${T.faint}`, borderRadius: radius,
  background: T.bg, color: T.muted, fontWeight: 500, fontSize: 13, cursor: "pointer",
  transition: "all 0.18s", fontFamily: "inherit",
};

export default function IndexPopup() {
  const [tab, setTab] = useState<"settings" | "songs">("settings");
  const [settings, setSettings] = useState<Settings>({
    mode: "silent", volume: 0.7, showFloatingHint: true, octaveOffset: 0, instrument: "piano", instrumentList: ["piano"], reverb: 0,
  });
  const [songs, setSongs] = useState<Song[]>([]);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedSongId, setPausedSongId] = useState<string | null>(null);
  const [loadingSongId, setLoadingSongId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const pausedAtRef = useRef(0);
  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;
  const playingSongIdRef = useRef<string | null>(null);
  playingSongIdRef.current = playingSongId;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const midiInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    chrome.storage.local.get(["mode", "volume", "showFloatingHint", "octaveOffset", "instrument", "instrumentList", "reverb"], (result) => {
      if (chrome.runtime.lastError) return;
      if (result.mode !== undefined) setSettings((prev) => ({ ...prev, ...(result as Partial<Settings>) }));
    });
  }, []);

  useEffect(() => {
    chrome.storage.local.get(["songs"], (r) => {
      if (chrome.runtime.lastError) return;
      try { setSongs(JSON.parse((r.songs as string) || "[]")); } catch { setSongs([]); }
    });
  }, []);

  // Restore playback state on mount
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;
      chrome.tabs.sendMessage(tabId, { type: "GET_PLAYBACK_STATE" }, (resp) => {
        if (chrome.runtime.lastError || !resp) return;
        if (resp.progress) setProgress(resp.progress);
        if (resp.paused) {
          setIsPaused(true);
          setPausedSongId(resp.songId || null);
          setPlayingSongId(null);
          chrome.storage.local.get(["playbackPausedAt"], (r) => {
            if (r.playbackPausedAt) pausedAtRef.current = r.playbackPausedAt as number;
          });
        } else if (resp.playing) {
          setPlayingSongId(resp.songId || null);
          setIsPaused(false);
          setPausedSongId(null);
          pausedAtRef.current = 0;
          chrome.storage.local.remove(["playbackPaused", "playbackPausedAt"]);
        }
      });
    });
  }, []);

  const update = useCallback(async (key: string, value: unknown) => {
    await chrome.storage.local.set({ [key]: value });
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Poll progress
  useEffect(() => {
    const poll = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (!tabId) return;
        chrome.tabs.sendMessage(tabId, { type: "GET_PROGRESS" }, (resp) => {
          if (chrome.runtime.lastError) return;
          if (isPausedRef.current) return;
          if (resp) {
            setProgress(resp);
            if (!playingSongIdRef.current) {
              chrome.storage.local.get(["lastSong"], (r) => {
                const s = r.lastSong as Song | undefined;
                if (s) setPlayingSongId(s.id);
              });
            }
            setIsPaused(false);
            setPausedSongId(null);
          } else {
            setProgress(null);
            setPlayingSongId(null);
            setIsPaused(false);
            setPausedSongId(null);
          }
        });
        chrome.tabs.sendMessage(tabId, { type: "GET_AUDIO_STATUS" }, (resp) => {
          if (chrome.runtime.lastError) return;
          setLoadingSongId(resp?.loading ? (resp.songId || "loading") : null);
        });
      });
    };
    poll();
    intervalRef.current = setInterval(poll, 500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const send = useCallback((msg: Record<string, unknown>) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId) chrome.tabs.sendMessage(tabId, msg);
    });
  }, []);

  // --- Song handlers ---
  const saveSongs = useCallback((updated: Song[]) => {
    setSongs(updated);
    chrome.storage.local.set({ songs: JSON.stringify(updated) });
  }, []);

  const handleImport = useCallback(() => fileInputRef.current?.click(), []);
  const handleMidiImport = useCallback(() => midiInputRef.current?.click(), []);

  const handleExportMidi = useCallback((song: Song) => {
    const midi = songToMidi(song);
    const blob = new Blob([midi as BlobPart], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${song.title}.mid`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleMidiFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = parseMidi(reader.result as ArrayBuffer, file.name);
        const song: Song = {
          id: `${Date.now()}`,
          title: result.title,
          octave: 0,
          notes: result.notes,
        };
        saveSongs([...songs.filter((s) => s.title !== song.title), song]);
      } catch {}
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }, [songs, saveSongs]);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string);
        if (!raw.notes?.length) return;
        const song: Song = { id: `${Date.now()}`, title: raw.title || "Untitled", octave: raw.octave || 0, notes: raw.notes };
        saveSongs([...songs.filter((s) => s.title !== song.title), song]);
      } catch {}
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [songs, saveSongs]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progress?.total) return;
    const rect = e.currentTarget.getBoundingClientRect();
    send({ type: "SEEK_SONG", offset: Math.round(((e.clientX - rect.left) / rect.width) * progress.total) });
  }, [progress, send]);

  const togglePlay = useCallback((song: Song) => {
    if (playingSongId === song.id && !isPaused) {
      // Pause: save position, stop, keep progress
      pausedAtRef.current = progress?.current || 0;
      chrome.storage.local.set({ playbackPausedAt: pausedAtRef.current });
      send({ type: "STOP_SONG", paused: true });
      setPausedSongId(song.id);
      setPlayingSongId(null);
      setIsPaused(true);
    } else {
      const differentSong = (playingSongId !== null && playingSongId !== song.id) || (pausedSongId !== null && pausedSongId !== song.id);
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (!tabId) return;
        chrome.tabs.sendMessage(tabId, { type: "GET_AUDIO_STATUS" }, (resp) => {
          if (chrome.runtime.lastError) return;
          if (resp && !resp.ready) {
            setLoadingSongId(song.id);
            chrome.tabs.sendMessage(tabId, { type: "LOAD_AUDIO_THEN_PLAY", song, offset: 0 });
          } else {
            if (differentSong) { pausedAtRef.current = 0; setProgress(null); }
            setIsPaused(false);
            setPausedSongId(null);
            setPlayingSongId(song.id);
            chrome.storage.local.remove(["playbackPaused", "playbackPausedAt"]);
            chrome.tabs.sendMessage(tabId, { type: "PLAY_SONG", song, offset: pausedAtRef.current });
          }
        });
      });
    }
  }, [playingSongId, isPaused, progress, send]);

  const deleteSong = useCallback((id: string, title: string) => {
    if (playingSongId === id || pausedSongId === id) { send({ type: "STOP_SONG" }); setProgress(null); setPlayingSongId(null); setPausedSongId(null); setIsPaused(false); }
    saveSongs(songs.filter((s) => s.id !== id));
  }, [songs, saveSongs, playingSongId, send]);

  return (
    <>
      <style>{`
        html,body{margin:0;padding:0;background:${T.bg};}
        ::-webkit-scrollbar{width:6px;height:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${T.faint};border-radius:2px}
        ::-webkit-scrollbar-thumb:hover{background:${T.muted}}
      `}</style>
      <div style={{ width: 420, padding: 24, fontFamily: `"PingFang SC","Hiragino Sans GB","Noto Sans CJK SC","Microsoft YaHei","Segoe UI",sans-serif`, background: T.bg, color: T.text, lineHeight: 1.5 }}>
      {/* Header + Tabs */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.heading, fontFamily: `"Anthropic Serif",Georgia,serif`, letterSpacing: "-0.01em" }}>Keyplayer</h2>
        <div style={{ display: "flex", gap: 4 }}>
          {(["settings", "songs"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "6px 14px", borderRadius: 8, border: "none",
              background: tab === t ? "#faf4ef" : "transparent",
              color: tab === t ? T.accent : T.muted,
              fontWeight: tab === t ? 600 : 500, fontSize: 13, cursor: "pointer",
              transition: "all 0.15s",
            }}>{t === "settings" ? "Settings" : "Songs"}{playingSongId && t === "songs" ? <span style={{ color: T.accent, marginLeft: 4 }}>●</span> : null}</button>
          ))}
        </div>
      </div>

      {tab === "settings" ? (
        <>
          {/* Mode */}
          <div style={{ marginBottom: 20 }}>
            <div style={labelCss}>Mode</div>
            <div style={{ display: "flex", gap: 6 }}>
              {MODE_OPTIONS.map(({ mode, label }) => {
                const active = settings.mode === mode;
                return <button key={mode} onClick={() => update("mode", mode)} style={{ ...sharedBtn, borderColor: active ? T.accent : T.faint, background: active ? "#faf4ef" : T.bg, color: active ? T.accent : T.muted, fontWeight: active ? 600 : 500, boxShadow: active ? `inset 0 1px 0 rgba(188,106,58,0.12)` : shadow }}>{label}</button>;
              })}
            </div>
          </div>

          {/* Instrument */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ ...labelCss, marginBottom: 0 }}>Instrument</div>
              <div style={{ position: "relative" }}>
                <button onClick={() => setShowDropdown(!showDropdown)} style={{ width: 24, height: 24, borderRadius: 12, border: `1.5px solid ${T.faint}`, background: T.surface, color: T.muted, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, transition: "all 0.15s" }}>+</button>
                {showDropdown && (
                  <div style={{ position: "absolute", top: 28, right: 0, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, boxShadow: "0 4px 16px rgba(28,24,21,0.1)", zIndex: 10, minWidth: 120, padding: 6 }}>
                    {INSTRUMENT_OPTIONS.filter(({ id }) => !settings.instrumentList?.includes(id)).length === 0
                        ? <div style={{ padding: "7px 14px", fontSize: 12, color: T.muted }}>All added</div>
                        : INSTRUMENT_OPTIONS.filter(({ id }) => !settings.instrumentList?.includes(id)).map(({ id, label }) => (
                          <div key={id} onClick={() => { const next = [...(settings.instrumentList || []), id]; update("instrumentList", next); if (!settings.instrument) update("instrument", id); setShowDropdown(false); }}
                            style={{ padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, color: T.text, whiteSpace: "nowrap", transition: "background 0.1s" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#faf4ef")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>{label}</div>
                        ))
                    }
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
              {(settings.instrumentList || []).map((id, i) => {
                const inst = INSTRUMENTS[id];
                if (!inst) return null;
                const active = settings.instrument === id;
                return (
                  <div key={id} onClick={() => update("instrument", id)} style={{
                    flexShrink: 0, display: "flex", alignItems: "center", gap: 4,
                    padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                    border: active ? `1.5px solid ${T.accent}` : `1.5px solid ${T.faint}`,
                    background: active ? "#faf4ef" : T.bg,
                    color: active ? T.accent : T.text,
                    fontWeight: active ? 600 : 400, fontSize: 13,
                    boxShadow: active ? `inset 0 1px 0 rgba(188,106,58,0.12)` : shadow,
                    transition: "all 0.15s",
                  }}>
                    {i < 9 ? <span style={{ fontSize: 10, opacity: 0.5, marginRight: 2 }}>{i + 1}</span> : null}{inst.label}
                    <span onClick={(e) => {
                      e.stopPropagation();
                      const next = (settings.instrumentList || []).filter((x) => x !== id);
                      if (next.length === 0) return;
                      update("instrumentList", next);
                      if (active) update("instrument", next[0]);
                    }} style={{ marginLeft: 2, fontSize: 14, lineHeight: 1, opacity: 0.5, cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}>×</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Volume */}
          <div style={{ marginBottom: 20 }}>
            <div style={labelCss}>Volume · {Math.round(settings.volume * 100)}%</div>
            <input type="range" min={0} max={100} value={Math.round(settings.volume * 100)} onChange={(e) => update("volume", Number(e.target.value) / 100)} style={{ width: "100%", margin: 0, accentColor: T.accent, height: 6 }} />
          </div>

          {/* Reverb */}
          <div style={{ marginBottom: 20 }}>
            <div style={labelCss}>Reverb · {Math.round(settings.reverb * 100)}%</div>
            <input type="range" min={0} max={100} value={Math.round(settings.reverb * 100)} onChange={(e) => update("reverb", Number(e.target.value) / 100)} style={{ width: "100%", margin: 0, accentColor: T.accent, height: 6 }} />
          </div>

          {/* Octave */}
          <div style={{ marginBottom: 20 }}>
            <div style={labelCss}>Octave</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => update("octaveOffset", Math.max(OCTAVE_MIN, settings.octaveOffset - 1))} disabled={settings.octaveOffset <= OCTAVE_MIN} style={{ width: 34, height: 34, borderRadius: radius, border: `1.5px solid ${T.faint}`, background: T.bg, color: T.text, fontSize: 18, cursor: "pointer", opacity: settings.octaveOffset <= OCTAVE_MIN ? 0.35 : 1, boxShadow: shadow }}>−</button>
              <span style={{ fontSize: 20, fontWeight: 700, color: T.heading, minWidth: 36, textAlign: "center", fontFamily: `"Anthropic Serif",Georgia,serif` }}>{settings.octaveOffset > 0 ? `+${settings.octaveOffset}` : settings.octaveOffset}</span>
              <button onClick={() => update("octaveOffset", Math.min(OCTAVE_MAX, settings.octaveOffset + 1))} disabled={settings.octaveOffset >= OCTAVE_MAX} style={{ width: 34, height: 34, borderRadius: radius, border: `1.5px solid ${T.faint}`, background: T.bg, color: T.text, fontSize: 18, cursor: "pointer", opacity: settings.octaveOffset >= OCTAVE_MAX ? 0.35 : 1, boxShadow: shadow }}>+</button>
            </div>
          </div>

          {/* Hint Toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ ...labelCss, marginBottom: 0 }}>Floating Hint</div>
            <button onClick={() => update("showFloatingHint", !settings.showFloatingHint)} style={{ width: 46, height: 26, borderRadius: 13, border: "none", background: settings.showFloatingHint ? T.accent : T.faint, cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
              <span style={{ position: "absolute", top: 3, left: settings.showFloatingHint ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
            </button>
          </div>

          {/* Keyboard Diagram */}
          <div style={{ background: T.surface, borderRadius: radius, padding: 8, border: `1px solid ${T.border}`, boxShadow: shadow }}>
            <div style={{ ...labelCss, marginBottom: 6, marginLeft: 4, marginTop: 0 }}>
              Keyboard Shortcuts
              <span style={{ fontWeight: 400, color: T.muted }}> Octave {settings.octaveOffset > 0 ? `+${settings.octaveOffset}` : settings.octaveOffset}</span>
            </div>
            <img src="assets/keyboard.png" alt="Keyboard shortcuts" onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL("assets/keyboard.png") })} title="Click to view full size" style={{ width: "100%", height: "auto", borderRadius: 6, display: "block", cursor: "zoom-in" }} />
          </div>
        </>
      ) : (
        <>
          {/* Song Player Tab */}
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleFile} style={{ display: "none" }} />
          <input ref={midiInputRef} type="file" accept=".mid,.midi" onChange={handleMidiFile} style={{ display: "none" }} />
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            <button onClick={handleImport} style={{ flex: 1, padding: "10px 0", border: `1.5px dashed ${T.border}`, borderRadius: 10, background: T.surface, color: T.muted, fontWeight: 500, fontSize: 13, cursor: "pointer" }}>
              + JSON
            </button>
            <button onClick={handleMidiImport} style={{ flex: 1, padding: "10px 0", border: `1.5px dashed ${T.border}`, borderRadius: 10, background: T.surface, color: T.muted, fontWeight: 500, fontSize: 13, cursor: "pointer" }}>
              + MIDI
            </button>
          </div>

          <div onClick={handleSeek} style={{ marginBottom: 6, height: 6, background: "#e9e3da", borderRadius: 3, cursor: progress ? "pointer" : "default", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress ? Math.round((progress.current / progress.total) * 100) : 0}%`, background: T.accent, borderRadius: 3, transition: "width 0.3s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, fontSize: 10, color: T.muted }}>
            <span>{progress ? fmtTime(progress.current) : "0:00"}</span>
            <span>{progress ? fmtTime(progress.total) : "--:--"}</span>
          </div>

          {loadingSongId && (
            <div style={{ marginBottom: 14, fontSize: 13, color: T.accent, display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.accent}><LoaderIcon /></svg>
              Loading audio...
            </div>
          )}

          {songs.length === 0 ? (
            <div style={{ textAlign: "center", color: T.muted, padding: 32 }}>No songs yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 260, overflowY: "auto" }}>
              {songs.map((song) => {
                const isActive = playingSongId === song.id || (isPaused && pausedSongId === song.id);
                const isLoading = loadingSongId === song.id;
                return (
                  <div key={song.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: isActive ? "#faf4ef" : isLoading ? "#fef9f5" : "transparent", border: isActive && !isPaused ? `1.5px solid ${T.accent}` : isActive && isPaused ? `1.5px dashed ${T.accent}` : "1.5px solid transparent", transition: "all 0.2s" }}>
                    <IconBtn onClick={() => togglePlay(song)} color={isActive && !isPaused ? T.red : T.accent} title={isActive && !isPaused ? "Pause" : "Play"}>
                      {isLoading ? <LoaderIcon /> : isActive && !isPaused ? <PauseIcon /> : <PlayIcon />}
                    </IconBtn>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: T.heading, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{song.title}</div>
                      <div style={{ fontSize: 11, color: T.muted }}>{song.notes.length} notes · {fmtTime(songDuration(song))}</div>
                    </div>
                    <IconBtn onClick={() => {
                      const blob = new Blob([JSON.stringify({title:song.title,octave:song.octave,notes:song.notes},null,2)],{type:"application/json"});
                      const u=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=u; a.download=`${song.title}.json`; a.click(); URL.revokeObjectURL(u);
                    }} color={T.green} title="Export JSON"><DownloadIcon /></IconBtn>
                    <IconBtn onClick={() => handleExportMidi(song)} color={T.accent} title="Export MIDI"><DownloadIcon /></IconBtn>
                    <IconBtn onClick={() => deleteSong(song.id, song.title)} color={T.red} title="Delete"><DeleteIcon /></IconBtn>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

    </div>
    </>
  );
}
