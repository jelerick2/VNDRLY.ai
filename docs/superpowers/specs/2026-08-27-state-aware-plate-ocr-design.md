# State-aware license plate OCR

## Goal

Capture a required U.S. issuing state separately from the license plate number for every new vehicle check-in. Use OCR to accelerate entry without allowing uncertain OCR to silently create unreliable vehicle records. Present complete plate information consistently to partners and vendors, and match returning vehicles by state plus normalized plate number.

## Scope

This design applies to staffed gatekeeper check-in, guest/visitor self-check-in, plate-photo OCR, voice-assisted gate entry, visit history, active-visit displays, and returning-vehicle matching. It does not create a general vehicle or fleet registry. Existing visits remain readable and valid even when they have no state.

## Data model and compatibility

Add a nullable `plate_state` text column to each persisted record that currently owns `vehicle_plate`, including guest session data and site visits. The migration is additive only: it must not delete, rewrite, infer, or backfill historical data.

New API writes that include a vehicle plate require a valid `plateState`. Historical reads may return `plateState: null`. State values are stored as uppercase two-letter USPS abbreviations. Plate numbers are stored without a state prefix and are normalized to uppercase for matching while preserving the existing human-readable plate value where current behavior requires it.

The canonical matching key is:

```text
<PLATE_STATE>:<PLATE_NUMBER_WITH_NON_ALPHANUMERICS_REMOVED>
```

For example, `TX • ABC-1234` matches as `TX:ABC1234`. Two identical plate numbers from different states are distinct vehicles. Legacy records with no state may participate in plate-only suggestions but must be labeled as unconfirmed and must never override an exact state-and-plate match.

## State catalog and ranking

The state catalog contains the 50 U.S. states plus the District of Columbia, using stable postal abbreviations and display names. The picker supports searching by either value.

For a selected site, the API returns up to five preferred states using confirmed check-ins only:

1. Count visits with non-null `plate_state` during the trailing 90 days.
2. Sort by descending count, then state abbreviation for deterministic ties.
3. If fewer than five states appear in that window, fill from older confirmed visits at the same site using the same ordering.
4. Fill any remaining positions from the national fallback, skipping duplicates.

The national fallback is `CA`, `TX`, `NY`, `FL`, `OH`, based on total 2024 state motor-vehicle registrations in Federal Highway Administration table MV-1, published January 2026. Keep this list in one shared configuration constant so a later data update is deliberate and testable.

The mobile picker renders the five preferred states first and the remaining catalog alphabetically. Preferred states are recommendations, not restrictions.

## OCR contract

The plate OCR service asks the vision model for JSON with four fields:

```json
{
  "plate": "ABC1234",
  "state": "TX",
  "plateConfidence": 0.94,
  "stateConfidence": 0.82
}
```

The server independently normalizes and validates the model response. Invalid states become `null`; invalid or implausible plates retain the current null behavior. Parser compatibility must accept the existing `{ "plate": ... }` response shape during rollout.

The OCR endpoint returns the normalized candidate and confidence values. Confidence is advisory:

- A valid high-confidence state may be preselected.
- A low-confidence or missing state leaves the picker unselected.
- The selected state remains visible and editable before submission.
- No OCR result counts toward site ranking until a user successfully submits the check-in.

The initial high-confidence threshold is `0.80`, centralized in the OCR module rather than duplicated in screens.

## Check-in behavior

All new staffed and self-service vehicle check-ins require both state and plate number. The state picker is placed immediately before the plate input and uses the current site to request preferred states. If site ranking is unavailable, the screen uses the national fallback without blocking check-in.

Dirty, obscured, specialty, or unreadable plates do not block manual entry. OCR failure preserves the captured evidence photo and leaves both fields editable. Validation explains whether the missing value is the state or plate number.

Displays use `TX • ABC1234`. When reading historical data with no state, displays use the existing plate text plus an `Unconfirmed state` indicator where space allows. Search continues to match plate text and additionally matches state abbreviations and combined forms such as `TX ABC1234`.

Voice entry recognizes state names and abbreviations when spoken near the plate phrase, such as `Texas plate ABC1234` or `TX tag ABC1234`. An unrecognized state does not invent a value; the user must select one.

## API boundaries

Extend guest/session and visit request and response contracts with `plateState: string | null` as appropriate. Add a read endpoint scoped by site for preferred state abbreviations. The endpoint must use the caller's existing site-access authorization and return only aggregate state codes and counts, never visitor identity.

Check-in routes normalize and validate state server-side even when the mobile UI already validated it. API error responses distinguish `missing-state`, `invalid-state`, and `missing-plate` so each screen can show a precise localized message.

## Error handling and privacy

- OCR transport, rate-limit, or parsing failures fall back to manual entry.
- Preferred-state endpoint failures fall back locally to the national list.
- Historical null states remain valid on reads and updates unrelated to plate data.
- State ranking aggregates confirmed visits and exposes no personal information.
- No migration or deployment step may delete or bulk-rewrite visit data.

## Testing

Follow red-green-refactor for each behavior. Coverage includes:

- OCR JSON parsing for full, legacy, malformed, low-confidence, and no-plate responses.
- State validation and normalization for names, abbreviations, invalid values, and null historical data.
- Composite matching across punctuation variants and identical plate numbers from different states.
- Ranking over the 90-day window, sparse-window backfill, deterministic ties, duplicate suppression, and national fallback.
- API authorization and validation for guest and staffed check-ins.
- Gatekeeper and visitor UI: required state, OCR preselection, uncertain OCR, manual correction, preferred ordering, alphabetical remainder, and fallback on ranking failure.
- Voice parsing for full state names, abbreviations, and missing states.
- History and active-visit rendering for state-aware and legacy records.
- Locale parity for all new English and Spanish strings.

Before completion, run the mandatory repository gates: `pnpm lint:i18n`, `pnpm run typecheck`, `pnpm run test:web`, `pnpm run test:api`, and the full `pnpm test` chain.

## Rollout

Deploy the additive schema migration and backward-compatible API before relying on required state in clients. The mobile client can then require state for new submissions while continuing to display older records. No historical backfill is part of this release; future corrections must be explicit, user-confirmed edits.

