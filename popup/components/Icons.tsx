import type { Song } from "~/types";

export const T = {
  bg: "#faf9f5", surface: "#f6f3ed", text: "#6b625a", heading: "#1c1815",
  accent: "#bc6a3a", accentHover: "#9d552d", border: "#ddd5ca", muted: "#b7afa6",
  faint: "#e4ded6", green: "#5a8d6e", red: "#c4554d",
} as const;

export function PlayIcon() { return <polygon points="3,0 21,12 3,24" />; }
export function PauseIcon() { return <><rect x="4" y="0" width="7" height="24" rx="1.5" /><rect x="13" y="0" width="7" height="24" rx="1.5" /></>; }
export function DeleteIcon() { return <><line x1="6" y1="6" x2="18" y2="18" strokeWidth="2.5" strokeLinecap="round" /><line x1="18" y1="6" x2="6" y2="18" strokeWidth="2.5" strokeLinecap="round" /></>; }
export function LoaderIcon() { return <circle cx="12" cy="12" r="10" fill="none" strokeWidth="2.5" strokeDasharray="48" strokeLinecap="round"><animateTransform attributeName="transform" type="rotate" values="0 12 12;360 12 12" dur="1s" repeatCount="indefinite" /></circle>; }
export function DownloadIcon() { return <><path d="M7 10l5 5 5-5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="4" x2="12" y2="15" strokeWidth="2.5" strokeLinecap="round"/><line x1="5" y1="17" x2="19" y2="17" strokeWidth="2.5" strokeLinecap="round"/></>; }

export function fmtTime(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function songDuration(song: Song): number {
  const last = song.notes[song.notes.length - 1];
  return last ? last.t + last.d : 0;
}

export const IconBtn: React.FC<{ onClick: () => void; color: string; title: string; children: React.ReactNode }> = ({ onClick, color, title, children }) => (
  <button onClick={onClick} title={title} style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${T.faint}`, background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0, transition: "all 0.15s" }}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color}>{children}</svg>
  </button>
);
