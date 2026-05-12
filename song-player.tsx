// song-player.tsx — dedicated page for song management and playback

import { useCallback, useEffect, useRef, useState } from "react";
import type { Song } from "~/types";

const T = {
  bg: "#faf9f5",
  surface: "#f6f3ed",
  text: "#6b625a",
  heading: "#1c1815",
  accent: "#bc6a3a",
  accentHover: "#9d552d",
  border: "#ddd5ca",
  muted: "#b7afa6",
  faint: "#e4ded6",
  green: "#5a8d6e",
  red: "#c4554d",
  blue: "#5b7fba",
} as const;

function PlayIcon() {
  return <polygon points="3,0 21,12 3,24" />;
}
function PauseIcon() {
  return <><rect x="4" y="0" width="7" height="24" rx="1.5" /><rect x="13" y="0" width="7" height="24" rx="1.5" /></>;
}
function DeleteIcon() {
  return <><line x1="6" y1="6" x2="18" y2="18" strokeWidth="2.5" strokeLinecap="round" /><line x1="18" y1="6" x2="6" y2="18" strokeWidth="2.5" strokeLinecap="round" /></>;
}
function LoaderIcon() {
  return <circle cx="12" cy="12" r="10" fill="none" strokeWidth="2.5" strokeDasharray="48" strokeLinecap="round"><animateTransform attributeName="transform" type="rotate" values="0 12 12;360 12 12" dur="1s" repeatCount="indefinite" /></circle>;
}

const IconBtn: React.FC<{ onClick: () => void; color: string; title: string; children: React.ReactNode }> = ({ onClick, color, title, children }) => (
  <button onClick={onClick} title={title} style={{
    width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${T.faint}`,
    background: T.bg, display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", padding: 0, transition: "all 0.15s",
  }}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color}>{children}</svg>
  </button>
);

export default function SongPlayerPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [loadingSongId, setLoadingSongId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const pausedAtRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load songs
  useEffect(() => {
    chrome.storage.local.get(["songs"], (r) => {
      if (chrome.runtime.lastError) return;
      setSongs((r.songs as Song[]) || []);
    });
  }, []);

  // Poll progress + detect loading state
  useEffect(() => {
    const poll = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (!tabId) return;
        chrome.tabs.sendMessage(tabId, { type: "GET_PROGRESS" }, (resp) => {
          if (chrome.runtime.lastError) return;
          setProgress(resp || null);
          setLoadingSongId(null);
        });
        chrome.tabs.sendMessage(tabId, { type: "GET_AUDIO_STATUS" }, (resp) => {
          if (chrome.runtime.lastError) return;
          if (resp?.loading) setLoadingSongId(resp.songId || "loading");
          else setLoadingSongId(null);
        });
      });
    };
    poll();
    intervalRef.current = setInterval(poll, 500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const saveSongs = useCallback((updated: Song[]) => {
    setSongs(updated);
    chrome.storage.local.set({ songs: updated });
  }, []);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const send = useCallback((msg: Record<string, unknown>) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId) chrome.tabs.sendMessage(tabId, msg);
    });
  }, []);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string);
        if (!raw.notes?.length) { notify("Invalid song format"); return; }
        const song: Song = { id: `${Date.now()}`, title: raw.title || "Untitled", octave: raw.octave || 0, notes: raw.notes };
        const updated = [...songs.filter((s) => s.title !== song.title), song];
        saveSongs(updated);
        notify(`Imported: ${song.title}`);
      } catch { notify("Invalid JSON"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [songs, saveSongs, notify]);

  const togglePlay = useCallback((song: Song) => {
    if (playingSongId === song.id) {
      // Pause
      pausedAtRef.current = progress?.current || 0;
      send({ type: "STOP_SONG" });
      setProgress(null);
      setPlayingSongId(null);
    } else {
      // Check audio first, then play
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (!tabId) return;
        chrome.tabs.sendMessage(tabId, { type: "GET_AUDIO_STATUS" }, (resp) => {
          if (chrome.runtime.lastError) return;
          if (resp && !resp.ready) {
            setLoadingSongId(song.id);
            chrome.tabs.sendMessage(tabId, { type: "LOAD_AUDIO_THEN_PLAY", song, offset: 0 });
          } else {
            sendPlay(song);
          }
        });
      });
    }
  }, [playingSongId, progress, send]);

  const sendPlay = useCallback((song: Song) => {
    const offset = pausedAtRef.current > 0 ? pausedAtRef.current : 0;
    pausedAtRef.current = 0;
    setPlayingSongId(song.id);
    send({ type: "PLAY_SONG", song, offset });
  }, [send]);

  const deleteSong = useCallback((id: string, title: string) => {
    if (playingSongId === id) {
      send({ type: "STOP_SONG" });
      setProgress(null);
      setPlayingSongId(null);
    }
    const updated = songs.filter((s) => s.id !== id);
    saveSongs(updated);
    notify(`Deleted: ${title}`);
  }, [songs, saveSongs, playingSongId, send, notify]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progress || !progress.total) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const offset = Math.round(ratio * progress.total);
    send({ type: "SEEK_SONG", offset });
  }, [progress, send]);

  return (
    <div style={{
      maxWidth: 600, margin: "0 auto", padding: 32,
      fontFamily: `"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Segoe UI",sans-serif`,
      background: T.bg, color: T.text, minHeight: "100vh", lineHeight: 1.5,
    }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: T.heading, margin: "0 0 24px 0", fontFamily: `"Anthropic Serif",Georgia,serif` }}>
        Song Player
      </h1>

      {/* Import + Progress */}
      <div style={{ marginBottom: 24 }}>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleFile} style={{ display: "none" }} />
        <button onClick={handleImport} style={{
          width: "100%", padding: "12px 0", border: `1.5px dashed ${T.border}`,
          borderRadius: 10, background: T.surface, color: T.muted,
          fontWeight: 500, fontSize: 14, cursor: "pointer",
        }}>
          + Import Song (.json)
        </button>
        {progress && (
          <div onClick={handleSeek} style={{
            marginTop: 12, height: 6, background: "#e9e3da", borderRadius: 3,
            cursor: "pointer", overflow: "hidden",
          }}>
            <div style={{
              height: "100%", width: `${Math.round((progress.current / progress.total) * 100)}%`,
              background: T.accent, borderRadius: 3, transition: "width 0.3s",
            }} />
          </div>
        )}
        {loadingSongId && (
          <div style={{ marginTop: 10, fontSize: 13, color: T.accent, display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.accent}>
              <LoaderIcon />
            </svg>
            Loading audio...
          </div>
        )}
      </div>

      {/* Song list */}
      {songs.length === 0 ? (
        <div style={{ textAlign: "center", color: T.muted, padding: 40 }}>
          No songs yet. Import a .json file to get started.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {songs.map((song) => {
            const isPlaying = playingSongId === song.id;
            const isLoading = loadingSongId === song.id;
            return (
              <div key={song.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 14px", borderRadius: 10,
                background: isPlaying ? "#faf4ef" : isLoading ? "#fef9f5" : "transparent",
                border: isPlaying ? `1.5px solid ${T.accent}` : "1.5px solid transparent",
                transition: "all 0.2s",
              }}>
                {/* Play/Pause */}
                <IconBtn
                  onClick={() => togglePlay(song)}
                  color={isPlaying ? T.red : isLoading ? T.accent : T.accent}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isLoading ? <LoaderIcon /> : isPlaying ? <PauseIcon /> : <PlayIcon />}
                </IconBtn>

                {/* Title + progress */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 500, color: T.heading,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {song.title}
                  </div>
                  <div style={{ fontSize: 11, color: T.muted }}>
                    {song.notes.length} notes · octave {song.octave > 0 ? `+${song.octave}` : song.octave}
                  </div>
                </div>

                {/* Delete */}
                <IconBtn onClick={() => deleteSong(song.id, song.title)} color={T.red} title="Delete">
                  <DeleteIcon />
                </IconBtn>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "rgba(28,24,21,0.88)", color: "#f5f1e8", borderRadius: 10,
          padding: "10px 20px", fontSize: 13, zIndex: 9999, backdropFilter: "blur(8px)",
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
