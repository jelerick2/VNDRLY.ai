import type { ReactNode } from "react";
import { AskVVoiceProvider } from "@/hooks/use-askv-voice-session";

export default function AskVVoiceController({ children }: { children?: ReactNode }) {
  return <AskVVoiceProvider>{children ?? null}</AskVVoiceProvider>;
}
