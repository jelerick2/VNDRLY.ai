import { formatPlate, normalizePlateState } from "@workspace/plate-state";

export function formatPlateForDisplay(
  state: string | null | undefined,
  plate: string | null | undefined,
  stateUnconfirmedLabel: string,
): string | null {
  const formatted = formatPlate(state, plate);
  if (!formatted) return null;
  return normalizePlateState(state)
    ? formatted
    : `${formatted} (${stateUnconfirmedLabel})`;
}
