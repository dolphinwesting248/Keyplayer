// Chrome API safety wrappers — handles "Extension context invalidated"

export function isContextValid(): boolean {
  try {
    return !!(chrome.runtime && chrome.runtime.id);
  } catch {
    return false;
  }
}

export function safeStorageSet(items: Record<string, unknown>): void {
  if (!isContextValid()) return;
  try { chrome.storage.local.set(items); } catch {}
}

export function safeStorageGet(
  keys: string[],
  callback: (result: Record<string, unknown>) => void,
): void {
  if (!isContextValid()) return;
  try {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) return;
      if (!isContextValid()) return;
      callback(result);
    });
  } catch {}
}

export function safeOnChanged(
  listener: (changes: Record<string, chrome.storage.StorageChange>) => void,
): () => void {
  if (!isContextValid()) return () => {};
  try {
    chrome.storage.onChanged.addListener(listener);
    return () => { try { chrome.storage.onChanged.removeListener(listener); } catch {} };
  } catch { return () => {}; }
}

export function isInputFocused(): boolean {
  const target = document.activeElement;
  if (!target || !(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable ||
    target.contentEditable === "true"
  );
}
