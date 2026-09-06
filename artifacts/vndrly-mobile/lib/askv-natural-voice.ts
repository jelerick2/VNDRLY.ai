export const ASKV_NATURAL_VOICE_FLAG = "askvNaturalVoice";

export function isAskVNaturalVoiceEnabled(): boolean {
  const env = process.env.EXPO_PUBLIC_ASKV_NATURAL_VOICE;
  if (env === "0" || env === "false") return false;
  return true;
}
