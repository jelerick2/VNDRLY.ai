export const ASKV_NATURAL_VOICE_FLAG = "askvNaturalVoice";

export function isAskVNaturalVoiceEnabled(): boolean {
  try {
    const override = window.localStorage.getItem(ASKV_NATURAL_VOICE_FLAG);
    if (override === "0") return false;
    if (override === "1") return true;
  } catch {
    // Storage is optional; fall through to the default.
  }
  const env = import.meta.env.VITE_ASKV_NATURAL_VOICE;
  if (env === "0" || env === "false") return false;
  return true;
}
