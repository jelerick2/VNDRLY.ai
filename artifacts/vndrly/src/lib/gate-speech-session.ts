export type GateSpeechResult = {
  [index: number]: { transcript: string };
  isFinal?: boolean;
};

export type GateSpeechResultEvent = {
  resultIndex?: number;
  results: {
    [index: number]: GateSpeechResult;
    length: number;
  };
};

export type GateSpeechErrorEvent = { error?: string };

export type GateSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: GateSpeechResultEvent) => void) | null;
  onerror: ((event: GateSpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type RestartHandle = ReturnType<typeof setTimeout>;

type GateSpeechSessionOptions = {
  createRecognition: () => GateSpeechRecognition | null;
  onTranscript: (transcript: string) => void;
  onListeningChange: (listening: boolean) => void;
  onError: (code: string) => void;
  scheduleRestart?: (callback: () => void) => RestartHandle;
  cancelRestart?: (handle: RestartHandle) => void;
};

export type GateSpeechSession = {
  dispose: () => void;
  isListening: () => boolean;
  stop: () => void;
  toggle: () => void;
};

const FATAL_ERRORS = new Set(["audio-capture", "not-allowed", "service-not-allowed"]);

/**
 * Owns a browser speech-recognition session until the user explicitly stops it.
 * Chromium may end a continuous recognizer after silence, so normal end events
 * are restarted while the requested listening state remains active.
 */
export function createGateSpeechSession(options: GateSpeechSessionOptions): GateSpeechSession {
  const scheduleRestart = options.scheduleRestart
    ?? ((callback: () => void) => setTimeout(callback, 250));
  const cancelRestart = options.cancelRestart ?? clearTimeout;
  let shouldListen = false;
  let recognition: GateSpeechRecognition | null = null;
  let restartHandle: RestartHandle | null = null;

  const publishListening = (next: boolean) => {
    options.onListeningChange(next);
  };

  const cancelPendingRestart = () => {
    if (restartHandle === null) return;
    cancelRestart(restartHandle);
    restartHandle = null;
  };

  const stop = () => {
    const active = recognition;
    recognition = null;
    shouldListen = false;
    cancelPendingRestart();
    if (active) {
      active.onresult = null;
      active.onerror = null;
      active.onend = null;
      try {
        active.stop();
      } catch {
        // The browser may already have ended the recognizer.
      }
    }
    publishListening(false);
  };

  const startRecognition = () => {
    if (!shouldListen || recognition) return;
    let next: GateSpeechRecognition | null;
    try {
      next = options.createRecognition();
    } catch {
      next = null;
    }
    if (!next) {
      shouldListen = false;
      publishListening(false);
      options.onError("unavailable");
      return;
    }

    recognition = next;
    next.continuous = true;
    next.interimResults = false;
    next.lang = "en-US";
    next.onresult = (event) => {
      const parts: string[] = [];
      const firstResult = Math.max(0, event.resultIndex ?? 0);
      for (let index = firstResult; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal === false) continue;
        const transcript = result[0]?.transcript?.trim();
        if (transcript) parts.push(transcript);
      }
      const transcript = parts.join(" ").trim();
      if (transcript) options.onTranscript(transcript);
    };
    next.onerror = (event) => {
      const code = event.error ?? "recognition-failed";
      if (code === "no-speech" || code === "aborted") return;
      options.onError(code);
      if (FATAL_ERRORS.has(code)) stop();
    };
    next.onend = () => {
      if (recognition !== next) return;
      recognition = null;
      if (!shouldListen) {
        publishListening(false);
        return;
      }
      cancelPendingRestart();
      restartHandle = scheduleRestart(() => {
        restartHandle = null;
        startRecognition();
      });
    };

    try {
      next.start();
    } catch {
      recognition = null;
      shouldListen = false;
      publishListening(false);
      options.onError("start-failed");
    }
  };

  return {
    dispose: stop,
    isListening: () => shouldListen,
    stop,
    toggle: () => {
      if (shouldListen) {
        stop();
        return;
      }
      shouldListen = true;
      publishListening(true);
      startRecognition();
    },
  };
}
