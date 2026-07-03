import { useEffect, useRef } from "react";
import { isAskVWakePhrase } from "@/lib/askv-wake-phrase";

interface SpeechRecognitionResultLike {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionEventLike {
  readonly results: {
    readonly length: number;
    [index: number]: {
      readonly length: number;
      [index: number]: SpeechRecognitionResultLike;
      readonly isFinal?: boolean;
    };
  };
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function useAskVWakeListener(args: {
  enabled: boolean;
  onWake: () => void;
}): void {
  const onWakeRef = useRef(args.onWake);
  onWakeRef.current = args.onWake;

  useEffect(() => {
    if (!args.enabled) return;
    const Recognition = getSpeechRecognitionCtor();
    if (!Recognition) return;

    let stopped = false;
    let wakeLocked = false;
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        const alt = result?.[0];
        if (!alt) continue;
        if (isAskVWakePhrase(alt.transcript, alt.confidence)) {
          if (wakeLocked) return;
          wakeLocked = true;
          recognition.stop();
          onWakeRef.current();
          window.setTimeout(() => {
            wakeLocked = false;
          }, 1000);
          break;
        }
      }
    };
    recognition.onerror = () => undefined;
    recognition.onend = () => {
      if (!stopped) {
        window.setTimeout(() => {
          try {
            recognition.start();
          } catch {
            // Browsers throw if start races with an existing recognition session.
          }
        }, 250);
      }
    };

    try {
      recognition.start();
    } catch {
      return;
    }

    return () => {
      stopped = true;
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.stop();
    };
  }, [args.enabled]);
}
