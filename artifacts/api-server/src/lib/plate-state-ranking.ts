import {
  normalizePlateState,
  type PlateStateCode,
} from "@workspace/plate-state";

export type PlateStateVisitCount = {
  state: string | null;
  count: number;
};

function rankedStates(rows: readonly PlateStateVisitCount[]): PlateStateCode[] {
  const counts = new Map<PlateStateCode, number>();

  for (const row of rows) {
    const state = normalizePlateState(row.state);
    if (!state || !Number.isFinite(row.count) || row.count <= 0) continue;
    counts.set(state, (counts.get(state) ?? 0) + row.count);
  }

  return [...counts.entries()]
    .sort(([leftState, leftCount], [rightState, rightCount]) =>
      rightCount - leftCount || leftState.localeCompare(rightState),
    )
    .map(([state]) => state);
}

/**
 * Returns the five state recommendations for a site. Recent confirmed visits
 * always take precedence over older history, which in turn takes precedence
 * over the national fallback.
 */
export function rankPreferredPlateStates(
  recent: readonly PlateStateVisitCount[],
  historical: readonly PlateStateVisitCount[],
  fallback: readonly (string | null | undefined)[],
): PlateStateCode[] {
  const preferred: PlateStateCode[] = [];
  const seen = new Set<PlateStateCode>();

  const append = (state: string | null | undefined) => {
    const normalized = normalizePlateState(state);
    if (!normalized || seen.has(normalized) || preferred.length === 5) return;
    seen.add(normalized);
    preferred.push(normalized);
  };

  rankedStates(recent).forEach(append);
  rankedStates(historical).forEach(append);
  fallback.forEach(append);

  return preferred;
}
