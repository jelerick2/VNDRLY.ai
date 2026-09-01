type GateVoiceListener = () => void;
type GateVoiceListeningListener = (listening: boolean) => void;

const REQUEST_EVENT = "vndrly:gate-voice";
const LISTENING_EVENT = "vndrly:gate-voice-listening";
let listening = false;
let pending = false;

export function requestGateVoiceEntry(): void {
  window.dispatchEvent(new Event(REQUEST_EVENT));
}

export function queueGateVoiceEntry(): void {
  pending = true;
}

export function consumePendingGateVoiceEntry(): boolean {
  const requested = pending;
  pending = false;
  return requested;
}

export function subscribeGateVoiceEntry(listener: GateVoiceListener): () => void {
  window.addEventListener(REQUEST_EVENT, listener);
  return () => window.removeEventListener(REQUEST_EVENT, listener);
}

export function setGateVoiceListening(next: boolean): void {
  listening = next;
  window.dispatchEvent(new CustomEvent<boolean>(LISTENING_EVENT, { detail: next }));
}

export function subscribeGateVoiceListening(listener: GateVoiceListeningListener): () => void {
  const handle = (event: Event) => listener((event as CustomEvent<boolean>).detail);
  listener(listening);
  window.addEventListener(LISTENING_EVENT, handle);
  return () => window.removeEventListener(LISTENING_EVENT, handle);
}
