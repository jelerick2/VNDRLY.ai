const STORAGE_PREFIX = "askv:text-only";
const MUTE_PREFIX = "askv:muted";
const ACROSS_PREFIX = "askv:across";

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

function readFlag(prefix: string, userId: number): boolean {
  try {
    return window.localStorage.getItem(`${prefix}:${userId}`) === "1";
  } catch {
    return false;
  }
}

function writeFlag(prefix: string, eventName: string, userId: number, enabled: boolean): void {
  try {
    const key = `${prefix}:${userId}`;
    if (enabled) window.localStorage.setItem(key, "1");
    else window.localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent(eventName, { detail: { userId, enabled } }));
  } catch {
    // Preference persistence is best-effort.
  }
}

export function readAskVMuted(userId: number): boolean {
  return readFlag(MUTE_PREFIX, userId);
}

export function writeAskVMuted(userId: number, enabled: boolean): void {
  writeFlag(MUTE_PREFIX, "askv:muted-changed", userId, enabled);
}

export function readAskVAcrossVndrly(userId: number): boolean {
  return readFlag(ACROSS_PREFIX, userId);
}

export function writeAskVAcrossVndrly(userId: number, enabled: boolean): void {
  writeFlag(ACROSS_PREFIX, "askv:across-changed", userId, enabled);
}
