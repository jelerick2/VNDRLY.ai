export interface PlateState {
  code: string;
  name: string;
}

/** The 50 USPS state codes plus the District of Columbia, by display name. */
export const US_PLATE_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
] as const;

export type PlateStateCode = (typeof US_PLATE_STATES)[number]["code"];

export const NATIONAL_PLATE_STATE_FALLBACK = [
  "CA",
  "TX",
  "NY",
  "FL",
  "OH",
] as const;

export const PLATE_OCR_STATE_CONFIDENCE_THRESHOLD = 0.8;

const STATE_BY_CODE = new Map<string, (typeof US_PLATE_STATES)[number]>(
  US_PLATE_STATES.map((state) => [state.code, state]),
);

const STATE_CODE_BY_NAME = new Map<string, PlateStateCode>(
  US_PLATE_STATES.map((state) => [state.name.toLowerCase(), state.code]),
);

/** Returns a canonical USPS code for a full state name or abbreviation. */
export function normalizePlateState(
  state: string | null | undefined,
): PlateStateCode | null {
  if (typeof state !== "string") return null;

  const normalized = state.trim().toUpperCase();
  if (STATE_BY_CODE.has(normalized)) return normalized as PlateStateCode;

  return STATE_CODE_BY_NAME.get(state.trim().toLowerCase()) ?? null;
}

/** Normalizes entered plate text for display while retaining its punctuation. */
export function normalizePlateNumber(
  plate: string | null | undefined,
): string | null {
  if (typeof plate !== "string") return null;

  const normalized = plate.trim().toUpperCase();
  return normalized || null;
}

/** Formats a plate in the state-qualified style used across check-in surfaces. */
export function formatPlate(
  state: string | null | undefined,
  plate: string | null | undefined,
): string | null {
  const normalizedState = normalizePlateState(state);
  const normalizedPlate = normalizePlateNumber(plate);
  return [normalizedState, normalizedPlate].filter(Boolean).join(" • ") || null;
}

/** Builds a punctuation-insensitive, state-aware key for plate matching. */
export function plateMatchKey(
  state: string | null | undefined,
  plate: string | null | undefined,
) {
  const normalizedState = normalizePlateState(state);
  const normalizedPlate = normalizePlateNumber(plate);
  const plateKey = normalizedPlate?.replace(/[^A-Z0-9]/g, "");
  return normalizedState && plateKey ? `${normalizedState}:${plateKey}` : null;
}

/**
 * Resolves an ordered set of candidate codes into picker entries. Supply
 * preferred codes first, followed by `US_PLATE_STATES.map(({ code }) => code)`;
 * duplicate codes are removed while preserving the preferred order and the
 * catalog provides a deterministic alphabetical remainder.
 */
export function orderPlateStates(
  preferredThenRemaining: readonly (string | null | undefined)[],
  query: string | null | undefined = "",
): readonly (typeof US_PLATE_STATES)[number][] {
  const search = query?.trim().toLowerCase() ?? "";
  const seen = new Set<PlateStateCode>();
  const ordered: (typeof US_PLATE_STATES)[number][] = [];

  for (const value of preferredThenRemaining) {
    const code = normalizePlateState(value);
    if (!code || seen.has(code)) continue;

    const state = STATE_BY_CODE.get(code);
    if (!state) continue;
    seen.add(code);

    if (
      !search ||
      state.code.toLowerCase().includes(search) ||
      state.name.toLowerCase().includes(search)
    ) {
      ordered.push(state);
    }
  }

  return ordered;
}
