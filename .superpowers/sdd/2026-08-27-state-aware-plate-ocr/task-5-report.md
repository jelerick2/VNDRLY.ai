# Task 5 report — Validate and propagate state through visit API contracts

## Status

Complete. New plate-bearing writes require a valid state, lowercase/full-name states normalize through `@workspace/plate-state`, state follows plate data through visit/guest reads and events, and historical null states continue to serialize.

## Files

Brief files:

- `artifacts/api-server/src/routes/visits.ts`
- `artifacts/api-server/src/routes/visits.test.ts`
- `artifacts/api-server/src/lib/visit-events.ts`
- `artifacts/api-server/src/lib/visit-events.test.ts`
- `artifacts/api-server/src/assistant/data-tools-ops.ts`
- `artifacts/vndrly-mobile/lib/guest.ts`
- `artifacts/vndrly-mobile/lib/gatekeeper.ts`
- `artifacts/vndrly/src/lib/visits-api.ts`
- `artifacts/vndrly-mobile/package.json`
- `artifacts/vndrly/package.json`
- `pnpm-lock.yaml`

Approved fixture-only expansion required to retain strong required-on-read types during package typecheck:

- `artifacts/api-server/src/lib/visit-event-visibility.test.ts`
- `artifacts/api-server/src/lib/visit-events-seq.test.ts`
- `artifacts/vndrly/src/pages/gate-log.test.tsx`

## RED evidence

Command (guarded schema contract excluded; no database URL used):

`vitest run src/routes/visits.test.ts --testNamePattern "^(?!plate state persistence schema contract)"`

Result before production changes: 13 expected failures, 54 passes, 4 skips. Failures proved missing-state/invalid-state writes were accepted, state was omitted from guest/visit/event projections, lowercase state was not normalized, and historical null state was omitted from list/detail serialization.

## GREEN evidence

- Mocked visit route suite: 67 passed, 4 guarded schema-contract tests skipped.
- Database-mocked event suites (`visit-events-seq.test.ts`, `visit-event-visibility.test.ts`) with `DATABASE_URL` and `LISTEN_NOTIFY_DATABASE_URL` explicitly blank: 7 passed.
- API typecheck: passed.
- Web typecheck: passed.
- Mobile typecheck: passed.
- Root `pnpm run typecheck`: passed across library, artifact, and script workspaces.
- `git diff --check`: passed; only repository line-ending notices were emitted.

No `test:no-isolated-db` command ran. No shared or real database command ran. The guarded route schema contract was intentionally excluded from direct Vitest execution.

## Validation matrix

| Boundary | Missing state with plate | Invalid state | Lowercase state | No plate + stray state | Historical null read |
| --- | --- | --- | --- | --- | --- |
| Guest session create | 400 `missing-state` | 400 `invalid-state` | stored/read as `TX` | plate/state stored as null | guest reads normalize null |
| Guest check-in | 400 `missing-state` | 400 `invalid-state` | guest profile, visit, response, active read, event all `TX` | state discarded without plate | inherited legacy plate/null state rejected for a new visit |
| Gatekeeper check-in | 400 `missing-state` | 400 `invalid-state` | visit, response, event all `TX` | state discarded without plate | staff reads retain nullable state |
| Staff list/detail | n/a | n/a | canonical state returned | n/a | explicit list and detail tests return `plateState: null` |
| OCR response | n/a | n/a | existing exact top-level candidate contract retained | n/a | nullable candidate state retained |

## Propagation audit

- Request transport types accept `plateState?: string` at guest-session, guest-check-in, and gatekeeper-check-in boundaries.
- One route-local `validatePlateInput` trims plate text, calls shared `normalizePlateState`, emits exact `missing-state`/`invalid-state` codes, and clears stray state when no plate exists.
- Guest session insert, create response, `/auth/guest/me`, guest profile refresh, and guest-derived visit insertion carry state.
- Gatekeeper and guest visit insertions, create responses, idempotent/normal checkout responses, active visit, office gate bundle, staff list, and staff detail carry nullable canonical state.
- Checked-in events require `PlateStateCode | null`; plate-bearing checked-out events pair state with plate. SSE forwards those event objects unchanged.
- Assistant active-visitor projection selects and canonicalizes nullable state.
- Web/mobile read types expose `PlateStateCode | null`; write transports accept strings; web OCR typing now matches the full top-level candidate while mobile preserves its scalar helper compatibility after decoding the full candidate.
- Existing authorization and role-aware access branches were not changed.

## Commit

`HEAD` — `Require state on new vehicle check-ins`

## Self-review

- Confirmed every `vehiclePlate` occurrence in the named production files has a corresponding state decision, field, projection, or explicit compatibility wrapper.
- Confirmed read normalization tolerates `null` and prevents invalid historical text from escaping as a typed code.
- Confirmed a new guest visit cannot silently combine a newly supplied plate with a stored state from a different plate.
- Confirmed no state is persisted when the effective plate is blank.
- Confirmed package-lock changes are limited to the two existing workspace links.

## Concerns / deviations

- Three fixture-only files outside the brief list needed nullable/code values to keep the new required read/event contracts strong; the parent task approved this scoped expansion.
- The real cross-instance LISTEN/NOTIFY test in `visit-events.test.ts` was not executed because it requires a real Postgres database. Its state assertion was updated, while database-mocked event serialization/visibility tests and mocked route event assertions provide safe coverage.
- The route suite emits an existing `MaxListenersExceededWarning`; it completed with zero test failures and the warning is unrelated to this change.
