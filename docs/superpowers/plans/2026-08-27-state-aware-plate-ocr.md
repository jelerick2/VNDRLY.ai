# State-aware License Plate OCR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture, validate, rank, display, and match a required U.S. plate state separately from the plate number across every VNDRLY vehicle check-in flow.

**Architecture:** Introduce a small shared plate-domain workspace package, add nullable state columns for backward compatibility, extend the existing visits API and OCR contract, then consume the shared contract in web and mobile state pickers. New writes require state, historical rows remain readable, and site preferences are aggregate rankings computed from confirmed visits.

**Tech Stack:** TypeScript 5.9, PostgreSQL, Drizzle ORM, Express 5, React 19, React Native/Expo 54, TanStack Query, Vitest, React Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-27-state-aware-plate-ocr-design.md`

## Global Constraints

- Migrations are additive only; do not delete, rewrite, infer, or backfill historical visit data.
- Persist states as uppercase USPS abbreviations; support the 50 states plus District of Columbia.
- New check-ins containing a plate require a state; historical reads may return `plateState: null`.
- OCR confidence threshold is `0.80`; OCR suggestions remain editable and only submitted values affect rankings.
- National fallback is `CA`, `TX`, `NY`, `FL`, `OH`.
- Site rankings use confirmed visits from the trailing 90 days, then older site history, then national fallback.
- Add no external runtime dependency.
- Preserve English/Spanish locale parity.
- Leave the unrelated root `app.json` untracked file untouched.

---

## File map

- `lib/plate-state/`: shared state catalog, normalization, formatting, matching, OCR types, ranking primitives.
- `lib/db/src/schema/siteVisits.ts` and `lib/db/drizzle/chunk_391_site_visit_plate_state.sql`: nullable persistence.
- `artifacts/api-server/src/lib/plate-ocr.ts`: model response parsing and OCR prompt.
- `artifacts/api-server/src/lib/plate-state-ranking.ts`: deterministic preference ranking.
- `artifacts/api-server/src/routes/visits.ts`: validation, persistence, reads, and preferred-state endpoint.
- `artifacts/vndrly-mobile/components/PlateStatePicker.tsx`: shared native picker.
- `artifacts/vndrly/src/components/plate-state-picker.tsx`: shared web picker.
- Existing mobile/web guest, gatekeeper, history, live-log, voice, and API modules: carry and display `plateState`.

### Task 1: Shared plate-state domain package

**Files:**
- Create: `lib/plate-state/package.json`
- Create: `lib/plate-state/tsconfig.json`
- Create: `lib/plate-state/src/index.ts`
- Create: `lib/plate-state/src/index.test.ts`

**Interfaces:**
- Produces: `PlateStateCode`, `US_PLATE_STATES`, `NATIONAL_PLATE_STATE_FALLBACK`, `PLATE_OCR_STATE_CONFIDENCE_THRESHOLD`, `normalizePlateState`, `normalizePlateNumber`, `formatPlate`, `plateMatchKey`, `orderPlateStates`.

- [ ] **Step 1: Write failing domain tests**

```ts
expect(normalizePlateState("Texas")).toBe("TX");
expect(normalizePlateState(" ok ")).toBe("OK");
expect(normalizePlateState("ZZ")).toBeNull();
expect(formatPlate("TX", "abc-1234")).toBe("TX • ABC-1234");
expect(plateMatchKey("TX", "ABC-1234")).toBe("TX:ABC1234");
expect(plateMatchKey("OK", "ABC-1234")).toBe("OK:ABC1234");
expect(orderPlateStates(["OK", "TX"], "te").map((s) => s.code)).toEqual(["TX"]);
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @workspace/plate-state test`

Expected: FAIL because the workspace package and exports do not exist.

- [ ] **Step 3: Implement the package**

```ts
export type PlateStateCode = typeof US_PLATE_STATES[number]["code"];
export const NATIONAL_PLATE_STATE_FALLBACK = ["CA", "TX", "NY", "FL", "OH"] as const;
export const PLATE_OCR_STATE_CONFIDENCE_THRESHOLD = 0.8;

export function plateMatchKey(state: string | null | undefined, plate: string | null | undefined) {
  const normalizedState = normalizePlateState(state);
  const normalizedPlate = normalizePlateNumber(plate);
  return normalizedState && normalizedPlate ? `${normalizedState}:${normalizedPlate}` : null;
}
```

Include a literal catalog for all states and DC, name/abbreviation lookup, preferred-first ordering, deterministic alphabetical remainder, and no framework imports.

- [ ] **Step 4: Verify GREEN and type safety**

Run: `pnpm --filter @workspace/plate-state test && pnpm --filter @workspace/plate-state typecheck`

Expected: all package tests pass and TypeScript exits 0.

- [ ] **Step 5: Commit**

```bash
git add lib/plate-state pnpm-lock.yaml
git commit -m "Add shared plate state domain"
```

### Task 2: Add nullable plate-state persistence

**Files:**
- Modify: `lib/db/src/schema/siteVisits.ts`
- Create: `lib/db/drizzle/chunk_391_site_visit_plate_state.sql`
- Modify: `lib/db/drizzle/meta/_journal.json` only if required by the repository migration convention

**Interfaces:**
- Consumes: `plateState` remains plain database text to avoid coupling schema generation to UI logic.
- Produces: `guestSessionsTable.plateState` and `siteVisitsTable.plateState`, both `text` and nullable.

- [ ] **Step 1: Write a failing API schema-contract test**

Add to `artifacts/api-server/src/routes/visits.test.ts` a minimal assertion that the isolated test schema accepts and returns `plateState: "TX"` on guest creation and visit check-in.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @workspace/api-server run test:no-isolated-db -- src/routes/visits.test.ts`

Expected: FAIL because `plateState` is absent from the schema and response.

- [ ] **Step 3: Add schema fields and migration**

```ts
plateState: text("plate_state"),
```

```sql
ALTER TABLE "guest_sessions" ADD COLUMN IF NOT EXISTS "plate_state" text;
ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "plate_state" text;
```

Do not add `NOT NULL`, defaults, updates, or deletes.

- [ ] **Step 4: Verify schema compilation**

Run: `pnpm --filter @workspace/db run typecheck`

Expected: PASS. Do not push the migration to a shared database during this task.

- [ ] **Step 5: Commit**

```bash
git add lib/db/src/schema/siteVisits.ts lib/db/drizzle/chunk_391_site_visit_plate_state.sql lib/db/drizzle/meta/_journal.json
git commit -m "Add nullable plate state fields"
```

### Task 3: Extend OCR parsing without breaking legacy responses

**Files:**
- Modify: `artifacts/api-server/src/lib/plate-ocr.test.ts`
- Modify: `artifacts/api-server/src/lib/plate-ocr.ts`

**Interfaces:**
- Consumes: shared `normalizePlateState`, `PLATE_OCR_STATE_CONFIDENCE_THRESHOLD`.
- Produces: `PlateOcrCandidate = { plate: string | null; state: PlateStateCode | null; plateConfidence: number | null; stateConfidence: number | null }` and `extractPlateCandidate(text): PlateOcrCandidate`.

- [ ] **Step 1: Replace scalar expectations with failing contract tests**

```ts
expect(extractPlateCandidate('{"plate":"abc123","state":"Texas","plateConfidence":0.92,"stateConfidence":0.84}')).toEqual({
  plate: "ABC123",
  state: "TX",
  plateConfidence: 0.92,
  stateConfidence: 0.84,
});
expect(extractPlateCandidate('{"plate":"ok-4412"}')).toEqual({
  plate: "OK-4412",
  state: null,
  plateConfidence: null,
  stateConfidence: null,
});
expect(extractPlateCandidate('{"plate":"ABC123","state":"ZZ","stateConfidence":0.99}').state).toBeNull();
```

Keep noisy-text, personalized-plate, year-rejection, and no-plate cases as behavior tests.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/plate-ocr.test.ts`

Expected: FAIL because the parser still returns `string | null`.

- [ ] **Step 3: Implement structured parsing and update the model prompt**

The prompt must request JSON only with `plate`, `state`, `plateConfidence`, and `stateConfidence`; describe state as a USPS abbreviation or null. Clamp numeric confidence to `0..1`, preserve legacy JSON parsing, and return null fields rather than throwing for malformed model content.

- [ ] **Step 4: Verify GREEN**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/plate-ocr.test.ts`

Expected: all OCR tests pass.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/lib/plate-ocr.ts artifacts/api-server/src/lib/plate-ocr.test.ts
git commit -m "Return state confidence from plate OCR"
```

### Task 4: Implement site-aware preference ranking

**Files:**
- Create: `artifacts/api-server/src/lib/plate-state-ranking.ts`
- Create: `artifacts/api-server/src/lib/plate-state-ranking.test.ts`
- Modify: `artifacts/api-server/src/routes/visits.ts`
- Modify: `artifacts/api-server/src/routes/visits.test.ts`

**Interfaces:**
- Produces: `rankPreferredPlateStates(recent, historical, fallback): PlateStateCode[]` and `GET /api/visits/sites/:siteId/preferred-plate-states` returning `{ preferred: PlateStateCode[] }`.

- [ ] **Step 1: Write failing pure ranking tests**

Use literal fixtures to prove descending counts, abbreviation tie-breaks, 90-day precedence, historical fill, duplicate suppression, invalid-state exclusion, and final output length of five.

```ts
expect(rankPreferredPlateStates(
  [{ state: "OK", count: 8 }, { state: "TX", count: 12 }],
  [{ state: "NM", count: 20 }],
  ["CA", "TX", "NY", "FL", "OH"],
)).toEqual(["TX", "OK", "NM", "CA", "NY"]);
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/plate-state-ranking.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure ranker and route**

Query `site_visits` by `site_location_id`, non-null `plate_state`, and check-in time. Enforce the same gatekeeper/admin/partner/vendor site-access rules already used by visits routes. Return aggregate codes only.

- [ ] **Step 4: Add route behavior tests**

Cover authorized site access, unauthorized access, five-state response ordering, sparse history, and an empty site returning the national fallback.

- [ ] **Step 5: Verify GREEN**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/plate-state-ranking.test.ts src/routes/visits.test.ts`

Expected: both suites pass.

- [ ] **Step 6: Commit**

```bash
git add artifacts/api-server/src/lib/plate-state-ranking.ts artifacts/api-server/src/lib/plate-state-ranking.test.ts artifacts/api-server/src/routes/visits.ts artifacts/api-server/src/routes/visits.test.ts
git commit -m "Rank plate states by site activity"
```

### Task 5: Validate and propagate state through all visit API contracts

**Files:**
- Modify: `artifacts/api-server/src/routes/visits.ts`
- Modify: `artifacts/api-server/src/routes/visits.test.ts`
- Modify: `artifacts/api-server/src/lib/visit-events.ts`
- Modify: `artifacts/api-server/src/lib/visit-events.test.ts`
- Modify: `artifacts/api-server/src/assistant/data-tools-ops.ts`
- Modify: `artifacts/vndrly-mobile/lib/guest.ts`
- Modify: `artifacts/vndrly-mobile/lib/gatekeeper.ts`
- Modify: `artifacts/vndrly/src/lib/visits-api.ts`

**Interfaces:**
- Produces: `plateState: PlateStateCode | null` on visit/guest reads and events; new write inputs accept `plateState?: string` and reject missing/invalid states when a plate is supplied.
- OCR endpoint returns `PlateOcrCandidate`.

- [ ] **Step 1: Write failing route tests**

```ts
expect(await postGateCheckIn({ vehiclePlate: "ABC123" })).toMatchObject({
  status: 400,
  body: { code: "missing-state" },
});
expect(await postGateCheckIn({ plateState: "ZZ", vehiclePlate: "ABC123" })).toMatchObject({
  status: 400,
  body: { code: "invalid-state" },
});
```

Add success cases for `tx` normalization to `TX`, guest session propagation, guest check-in propagation, OCR response shape, visit lists, visit detail, and SSE/event payloads. Retain a fixture proving historical `plateState: null` reads succeed.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @workspace/api-server exec vitest run src/routes/visits.test.ts src/lib/visit-events.test.ts`

Expected: FAIL on missing response fields and validation.

- [ ] **Step 3: Implement minimal API propagation**

Create one route-local validator that calls `normalizePlateState`; do not duplicate state lists. Select, insert, update, serialize, and emit `plateState` everywhere `vehiclePlate` crosses the boundary. Update mobile/web client types in the same step so consumers compile.

- [ ] **Step 4: Verify GREEN**

Run: `pnpm --filter @workspace/api-server exec vitest run src/routes/visits.test.ts src/lib/visit-events.test.ts && pnpm run typecheck`

Expected: tests and workspace typecheck pass.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/routes/visits.ts artifacts/api-server/src/routes/visits.test.ts artifacts/api-server/src/lib/visit-events.ts artifacts/api-server/src/lib/visit-events.test.ts artifacts/api-server/src/assistant/data-tools-ops.ts artifacts/vndrly-mobile/lib/guest.ts artifacts/vndrly-mobile/lib/gatekeeper.ts artifacts/vndrly/src/lib/visits-api.ts
git commit -m "Require state on new vehicle check-ins"
```

### Task 6: Build reusable web and mobile state pickers

**Files:**
- Create: `artifacts/vndrly-mobile/components/PlateStatePicker.tsx`
- Create: `artifacts/vndrly-mobile/components/PlateStatePicker.test.tsx`
- Create: `artifacts/vndrly/src/components/plate-state-picker.tsx`
- Create: `artifacts/vndrly/src/components/plate-state-picker.test.tsx`

**Interfaces:**
- Both components consume `{ value, onChange, preferredStates, disabled?, error? }`.
- Both render preferred states first, alphabetical remainder, and search by name or abbreviation.

- [ ] **Step 1: Write failing component tests**

Assert that `OK, TX, NM` appear before alphabetical states, searching `tex` leaves Texas, choosing Texas calls `onChange("TX")`, DC is present, duplicates are absent, and the error text is accessible.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @workspace/vndrly-mobile exec vitest run components/PlateStatePicker.test.tsx && pnpm --filter @workspace/vndrly exec vitest run src/components/plate-state-picker.test.tsx`

Expected: FAIL because components do not exist.

- [ ] **Step 3: Implement focused components**

Use existing React Native `Modal`, `TextInput`, `ScrollView`, and `Pressable` patterns on mobile and existing shadcn popover/command primitives on web. Import all catalog and ordering behavior from `@workspace/plate-state`; add no dependency.

- [ ] **Step 4: Verify GREEN**

Run the two component commands from Step 2.

Expected: all picker tests pass.

- [ ] **Step 5: Commit**

```bash
git add artifacts/vndrly-mobile/components/PlateStatePicker.tsx artifacts/vndrly-mobile/components/PlateStatePicker.test.tsx artifacts/vndrly/src/components/plate-state-picker.tsx artifacts/vndrly/src/components/plate-state-picker.test.tsx
git commit -m "Add searchable plate state pickers"
```

### Task 7: Integrate staffed gatekeeper flows and state-aware matching

**Files:**
- Modify: `artifacts/vndrly-mobile/app/(tabs)/gate.tsx`
- Modify: `artifacts/vndrly-mobile/app/__tests__/gate.test.tsx`
- Modify: `artifacts/vndrly/src/pages/gatekeeper.tsx`
- Modify or create: `artifacts/vndrly/src/pages/gatekeeper.test.tsx`
- Modify: `artifacts/vndrly/src/lib/gate-entry-memory.ts`
- Modify: `artifacts/vndrly/src/lib/gate-entry-memory.test.ts`

**Interfaces:**
- Consumes: preferred-state endpoint, picker components, structured OCR candidate, `plateMatchKey`.
- Produces: staffed check-ins with required `plateState`; returning-visit suggestions prefer exact composite matches.

- [ ] **Step 1: Write failing mobile and web gate tests**

Cover missing-state error, site-preferred ordering, OCR state preselection at confidence `>= 0.80`, no preselection below threshold, manual correction, payload `{ plateState: "OK", vehiclePlate: "4412" }`, and same-number/different-state records not matching.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @workspace/vndrly-mobile exec vitest run app/__tests__/gate.test.tsx && pnpm --filter @workspace/vndrly exec vitest run src/pages/gatekeeper.test.tsx src/lib/gate-entry-memory.test.ts`

Expected: FAIL because state UI, payloads, and composite matching are absent.

- [ ] **Step 3: Implement minimal staffed flows**

Add `plateState` state, fetch preferences using the resolved site ID, render the picker immediately before plate input, apply OCR suggestions, require state before location/check-in work, and clear state after success. Refactor memory matching to use `plateMatchKey`, with legacy plate-only suggestions explicitly lower priority.

- [ ] **Step 4: Verify GREEN**

Run the commands from Step 2.

Expected: all gate and memory tests pass.

- [ ] **Step 5: Commit**

```bash
git add artifacts/vndrly-mobile/app/(tabs)/gate.tsx artifacts/vndrly-mobile/app/__tests__/gate.test.tsx artifacts/vndrly/src/pages/gatekeeper.tsx artifacts/vndrly/src/pages/gatekeeper.test.tsx artifacts/vndrly/src/lib/gate-entry-memory.ts artifacts/vndrly/src/lib/gate-entry-memory.test.ts
git commit -m "Capture state in staffed gate check-ins"
```

### Task 8: Integrate guest and visitor self-check-in flows

**Files:**
- Modify: `artifacts/vndrly-mobile/app/guest-login.tsx`
- Modify: `artifacts/vndrly-mobile/app/visitor-checkin.tsx`
- Modify: `artifacts/vndrly-mobile/app/__tests__/guest-login.test.tsx`
- Modify: `artifacts/vndrly-mobile/app/__tests__/visitor-checkin.test.tsx`
- Modify: `artifacts/vndrly/src/pages/visit-public.tsx`
- Modify or create: `artifacts/vndrly/src/pages/visit-public.test.tsx`

**Interfaces:**
- Produces: guest session and self-check-in requests with `plateState`; all flows use site preferences and national fallback.

- [ ] **Step 1: Write failing flow tests**

Assert that state is required whenever a plate is entered, selected state survives guest-login to check-in, the public portal disables submission without state, ranking failure falls back to the national five, and successful requests carry separate state and plate fields.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @workspace/vndrly-mobile exec vitest run app/__tests__/guest-login.test.tsx app/__tests__/visitor-checkin.test.tsx && pnpm --filter @workspace/vndrly exec vitest run src/pages/visit-public.test.tsx`

Expected: FAIL because self-service flows do not capture state.

- [ ] **Step 3: Implement minimal self-service flows**

Render the relevant picker before each plate field, propagate `plateState` through guest/session models, preserve it across navigation, and use national fallback when the current site or preference query is unavailable.

- [ ] **Step 4: Verify GREEN**

Run the commands from Step 2.

Expected: all guest and public visitor tests pass.

- [ ] **Step 5: Commit**

```bash
git add artifacts/vndrly-mobile/app/guest-login.tsx artifacts/vndrly-mobile/app/visitor-checkin.tsx artifacts/vndrly-mobile/app/__tests__/guest-login.test.tsx artifacts/vndrly-mobile/app/__tests__/visitor-checkin.test.tsx artifacts/vndrly/src/pages/visit-public.tsx artifacts/vndrly/src/pages/visit-public.test.tsx
git commit -m "Capture state in visitor self check-in"
```

### Task 9: Update voice entry, history, live displays, exports, and analytics

**Files:**
- Modify: `artifacts/vndrly-mobile/lib/gate-voice-entry.ts`
- Modify: `artifacts/vndrly-mobile/lib/gate-voice-entry.test.ts`
- Modify: `artifacts/vndrly/src/lib/gate-voice-entry.ts`
- Modify: `artifacts/vndrly/src/lib/gate-voice-entry.test.ts`
- Modify: gate history/live event types and tests under both `artifacts/vndrly-mobile` and `artifacts/vndrly/src`
- Modify: `artifacts/vndrly/src/pages/gate-log.tsx`, `gate-history.tsx`, `visit-detail.tsx`, `visitors.tsx`
- Modify: `artifacts/vndrly/src/lib/gatekeeper-log-export.ts`, `gate-ops-analytics.ts` and their tests

**Interfaces:**
- Consumes: `formatPlate`, `plateMatchKey`, and `normalizePlateState`.
- Produces: combined display text, legacy unconfirmed-state treatment, state-aware voice results and uniqueness counts.

- [ ] **Step 1: Write failing behavior tests**

```ts
expect(parseGateVoiceEntry("Texas plate ABC 123 driver Bob Villa")).toMatchObject({
  plateState: "TX",
  vehiclePlate: "ABC123",
});
expect(parseGateVoiceEntry("ZZ plate ABC123")).not.toHaveProperty("plateState");
```

Add display tests for `TX • ABC123`, legacy `ABC123` plus unconfirmed indicator, search by `TX ABC123`, export columns for state and plate, and analytics counting `TX:ABC123` separately from `OK:ABC123`.

- [ ] **Step 2: Verify RED**

Run targeted web/mobile voice, history, live-event, export, and analytics Vitest files.

Expected: FAIL because state is absent from parsers and display models.

- [ ] **Step 3: Implement propagation and display**

Carry `plateState` through all visit view types and events, use shared formatting/matching, add a distinct export `Plate State` column, and keep legacy rows readable without manufacturing a state.

- [ ] **Step 4: Verify GREEN**

Rerun the targeted files from Step 2.

Expected: all targeted suites pass.

- [ ] **Step 5: Commit**

```bash
git add artifacts/vndrly-mobile artifacts/vndrly/src
git commit -m "Display and match state-aware plates"
```

### Task 10: Localize and complete repository verification

**Files:**
- Modify: `artifacts/vndrly-mobile/lib/locales/en.json`
- Modify: `artifacts/vndrly-mobile/lib/locales/es.json`
- Modify: `artifacts/vndrly/src/lib/locales/en.json`
- Modify: `artifacts/vndrly/src/lib/locales/es.json`
- Modify: any fixtures that intentionally model complete visit records.

**Interfaces:**
- Produces: locale keys for state label, picker search, required/invalid errors, preferred states, OCR suggestion, and unconfirmed historical state.

- [ ] **Step 1: Add English and Spanish strings together**

Use concise field language: `Plate state`, `Search states`, `State required`, and `Unconfirmed state`, with equivalent Spanish translations. Do not add untranslated placeholders.

- [ ] **Step 2: Run locale and focused suites**

Run: `pnpm lint:i18n`

Expected: PASS with no missing, empty, or mismatched keys.

- [ ] **Step 3: Run mandatory verification gates**

Run in order:

```bash
pnpm run typecheck
pnpm run test:web
pnpm run test:api
pnpm test
```

Expected: every command exits 0; record exact suite/test counts for handoff.

- [ ] **Step 4: Review the final diff for safety**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

Confirm only intended feature files are included and root `app.json` remains untouched/untracked.

- [ ] **Step 5: Commit final integration adjustments**

```bash
git add artifacts/vndrly-mobile/lib/locales artifacts/vndrly/src/lib/locales
git commit -m "Localize state-aware plate capture"
```

- [ ] **Step 6: Push only after all gates pass**

```bash
git push origin main
```

Do not run a destructive database operation. Deploy the additive migration through the repository's normal production deployment workflow, then verify a new state-aware check-in and one historical null-state visit through read-only user-facing checks.

