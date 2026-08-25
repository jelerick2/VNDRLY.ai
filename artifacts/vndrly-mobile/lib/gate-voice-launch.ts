type GateVoiceListener = () => void;

const listeners = new Set<GateVoiceListener>();
let pending = false;

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
