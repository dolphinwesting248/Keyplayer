// background/index.ts

export {};

const MODE_DISPLAY: Record<string, { badge: string; color: string }> = {
  play: { badge: "P", color: "#2563eb" },
  hybrid: { badge: "H", color: "#7c3aed" },
  silent: { badge: "", color: "#6b7280" },
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    mode: "silent",
    volume: 0.7,
    showFloatingHint: true,
    octaveOffset: 0,
    instrument: "piano",
    instrumentList: ["piano"],
    reverb: 0,
  });
});

function applyModeDisplay(mode: string) {
  const display = MODE_DISPLAY[mode] || MODE_DISPLAY.play;
  chrome.action.setBadgeText({ text: display.badge });
  chrome.action.setBadgeBackgroundColor({ color: display.color });
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.mode) {
    applyModeDisplay(changes.mode.newValue as string);
  }
});

chrome.storage.local.get(["mode"], (result) => {
  applyModeDisplay((result.mode as string) || "silent");
});
