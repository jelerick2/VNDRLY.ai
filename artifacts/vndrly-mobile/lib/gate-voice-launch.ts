type GateVoiceListener = () => void;
type GateVoiceListeningListener = (listening: boolean) => void;

const listeners = new Set<GateVoiceListener>();
const listeningListeners = new Set<GateVoiceListeningListener>();
let pending = false;
let listening = false;

export function requestGateVoiceEntry(): void {
  if (listeners.size === 0) {
    pending = true;
    return;
  }
  pending = false;
  for (const listener of listeners) listener();
}

export function subscribeGateVoiceEntry(listener: GateVoiceListener): () => void {
  listeners.add(listener);
  if (pending) {
    pending = false;
    listener();
  }
  return () => listeners.delete(listener);
}

export function setGateVoiceListening(next: boolean): void {
  listening = next;
  for (const listener of listeningListeners) listener(next);
}

export function subscribeGateVoiceListening(listener: GateVoiceListeningListener): () => void {
  listeningListeners.add(listener);
  listener(listening);
  return () => listeningListeners.delete(listener);
}
