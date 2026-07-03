const STORAGE_PREFIX = "askv:text-only";

export function askvTextOnlyKey(userId: number): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function readAskVTextOnly(userId: number): boolean {
  try {
    return window.localStorage.getItem(askvTextOnlyKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function writeAskVTextOnly(userId: number, enabled: boolean): void {
  try {
    if (enabled) window.localStorage.setItem(askvTextOnlyKey(userId), "1");
    else window.localStorage.removeItem(askvTextOnlyKey(userId));
    window.dispatchEvent(new CustomEvent("askv:text-only-changed", { detail: { userId, enabled } }));
  } catch {
    // Preference persistence is best-effort; voice remains available in memory.
  }
}
