export type GateAudioStream = {
  getTracks: () => Array<{ stop: () => void }>;
};

export type GateAudioRecorder = {
  mimeType: string;
  state: string;
  ondataavailable: ((event: { data: Blob }) => void) | null;
  onerror: (() => void) | null;
  onstop: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type GateAudioSessionOptions = {
  getStream: () => Promise<GateAudioStream>;
  createRecorder: (stream: GateAudioStream, mimeType?: string) => GateAudioRecorder;
  onAudio: (audio: Blob) => void | Promise<void>;
  onListeningChange: (listening: boolean) => void;
  onError: (code: string) => void;
  mimeType?: string;
};

export type GateAudioSession = {
  dispose: () => Promise<void>;
  isListening: () => boolean;
  stop: (cancel?: boolean) => Promise<void>;
  toggle: () => Promise<void>;
};

export function pickGateRecordingMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
    "audio/wav",
  ].find((type) => MediaRecorder.isTypeSupported(type));
}

/** A press-on/press-off MediaRecorder session used by Gate voice entry. */
export function createGateAudioSession(options: GateAudioSessionOptions): GateAudioSession {
  let desired = false;
  let listening = false;
  let cancelled = false;
  let stream: GateAudioStream | null = null;
  let recorder: GateAudioRecorder | null = null;
  let chunks: Blob[] = [];
  let starting: Promise<void> | null = null;

  const publishListening = (next: boolean) => {
    if (listening === next) return;
    listening = next;
    options.onListeningChange(next);
  };

  const releaseStream = () => {
    for (const track of stream?.getTracks() ?? []) track.stop();
    stream = null;
  };

  const finalize = async (recordedMimeType: string) => {
    const recordedChunks = chunks;
    const wasCancelled = cancelled;
    chunks = [];
    cancelled = false;
    recorder = null;
    releaseStream();
    publishListening(false);
    if (wasCancelled || recordedChunks.length === 0) return;
    const mimeType = recordedMimeType
      || recordedChunks.find((chunk) => chunk.type)?.type
      || options.mimeType
      || "audio/webm";
    await options.onAudio(new Blob(recordedChunks, { type: mimeType }));
  };

  const start = async () => {
    let acquired: GateAudioStream;
    try {
      acquired = await options.getStream();
    } catch (error) {
      desired = false;
      const name = error instanceof DOMException ? error.name : "";
      options.onError(name === "NotAllowedError" || name === "SecurityError" ? "not-allowed" : "start-failed");
      publishListening(false);
      return;
    }

    if (!desired) {
      for (const track of acquired.getTracks()) track.stop();
      publishListening(false);
      return;
    }

    try {
      stream = acquired;
      chunks = [];
      cancelled = false;
      const next = options.createRecorder(acquired, options.mimeType);
      recorder = next;
      next.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      next.onerror = () => {
        cancelled = true;
        desired = false;
        options.onError("recording-failed");
        if (next.state !== "inactive") next.stop();
        else void finalize(next.mimeType);
      };
      next.onstop = () => {
        void finalize(next.mimeType);
      };
      next.start();
      publishListening(true);
    } catch {
      desired = false;
      recorder = null;
      releaseStream();
      publishListening(false);
      options.onError("start-failed");
    }
  };

  const stop = async (cancel = false) => {
    desired = false;
    cancelled ||= cancel;
    if (starting) await starting;
    const active = recorder;
    publishListening(false);
    if (!active) {
      releaseStream();
      return;
    }
    if (active.state !== "inactive") active.stop();
    else await finalize(active.mimeType);
  };

  return {
    dispose: () => stop(true),
    isListening: () => listening,
    stop,
    toggle: async () => {
      if (desired || listening || starting) {
        await stop();
        return;
      }
      desired = true;
      starting = start();
      try {
        await starting;
      } finally {
        starting = null;
      }
    },
  };
}
