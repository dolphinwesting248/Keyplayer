// components/FloatingHint.tsx

import { useEffect, useRef } from "react";

export interface NoteHistoryEntry {
  keyName: string;
  noteName: string;
  velocity?: number;
}

export interface NoteHint {
  type: "note";
  notes: NoteHistoryEntry[];
}

export interface SettingHint {
  type: "setting";
  label: string;
  value: string;
}

export interface ProgressHint {
  type: "progress";
  loaded: number;
  total: number;
  label?: string;
}

export type HintData = NoteHint | SettingHint | ProgressHint;

interface FloatingHintProps {
  hint: HintData | null;
}

const STYLE_ID = "keyplayer-floating-hint-style";

let styleInjected = false;

function injectStyles() {
  if (styleInjected) return;
  styleInjected = true;

  if (!document.head) return;

  try {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes kp-fadeOut {
        0% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-10px); }
      }
    `;
    document.head.appendChild(style);
  } catch {
    // CSP or other restriction
  }
}

export default function FloatingHint({ hint }: FloatingHintProps) {
  const renderCountRef = useRef(0);

  useEffect(() => {
    injectStyles();
    return () => {
      document.getElementById(STYLE_ID)?.remove();
    };
  }, []);

  useEffect(() => {
    if (hint) renderCountRef.current += 1;
  }, [hint]);

  if (!hint) return null;

  const isProgress = hint.type === "progress";

  return (
    <div
      key={renderCountRef.current}
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        animation: isProgress ? "none" : "kp-fadeOut 2s ease-out forwards",
        opacity: isProgress ? 1 : undefined,
        zIndex: 999999,
        pointerEvents: "none",
        fontFamily: `"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Segoe UI",sans-serif`,
        background: "rgba(28,24,21,0.88)",
        backdropFilter: "blur(8px)",
        color: "#f5f1e8",
        borderRadius: 12,
        padding: "8px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        alignItems: "stretch",
        fontSize: 15,
        userSelect: "none",
        minWidth: isProgress ? 180 : 120,
        boxShadow: "0 4px 16px rgba(28,24,21,0.18)",
      }}>
      {hint.type === "note" ? (
        hint.notes.map((entry, i) => {
          const isLatest = i === hint.notes.length - 1;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                opacity: isLatest ? 1 : 0.55 - i * 0.15,
                fontSize: isLatest ? 15 : 12,
              }}>
              <span style={{
                fontWeight: 600,
                fontSize: isLatest ? 18 : 14,
                minWidth: 20,
              }}>
                {entry.keyName.toUpperCase()}
              </span>
              <span style={{ opacity: 0.8 }}>{entry.noteName}</span>
              {entry.velocity && entry.velocity > 1 && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#d4a574",
                  marginLeft: -2,
                }}>
                  ff
                </span>
              )}
            </div>
          );
        })
      ) : hint.type === "setting" ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ opacity: 0.7, fontSize: 13 }}>{hint.label}</span>
          <span style={{ fontWeight: 600, fontSize: 16 }}>{hint.value}</span>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ opacity: 0.65, fontSize: 12 }}>
            {hint.label ? `Loaded ${hint.label}` : "Loading sounds"}
          </span>
          {hint.total > 0 && (
            <>
              <div style={{
                flex: 1,
                height: 4,
                background: "rgba(245,241,232,0.15)",
                borderRadius: 2,
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  width: `${Math.round((hint.loaded / hint.total) * 100)}%`,
                  background: "#bc6a3a",
                  borderRadius: 2,
                  transition: "width 0.3s ease",
                }} />
              </div>
              <span style={{ fontSize: 11, opacity: 0.5, minWidth: 24, textAlign: "right" }}>
                {hint.loaded}/{hint.total}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
