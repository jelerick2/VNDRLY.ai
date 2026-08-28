# State-aware plate OCR — final hardening report

Date: 2026-08-27
Base: `d78043f8bef656162471d8e064509cc5ef10d828`
Branch: `codex/state-aware-plate-ocr`

## Outcome

All release-blocker code changes in `final-hardening-brief.md` are implemented.
No shared database, canonical credential file, deployment target, migration
target, Playwright browser, or remote branch was changed. The migration and
deployment paths were tested statically only and were not executed.

## P0 — isolated E2E only

- Root `test:e2e` now enters `run-with-test-db.ts` before Playwright starts.
- Before any connection, database creation, or schema reset, the wrapper now
  rejects an explicit `TEST_DATABASE_URL` unless its database ends in `_test`
  and its normalized physical host/port/database differs from the original
  `DATABASE_URL`. Derived targets are also required to end in `_test` and retain
  the source URL's host, decoded credentials, and explicit port.
- The shared PostgreSQL sanitizer accepts only `postgresql`/`postgres` URLs
  matching the repository's documented Supabase direct/pooler shapes: an
  explicit safe ASCII DNS hostname, explicit numeric port, and safe ASCII
  database identifier. Hostname and database-path percent encoding, absent
  host/port, encoded or raw C0/C1 credential controls, all query parameters,
  and all fragments fail closed. This includes `application_name=%00...`,
  repeated/mixed-case target options, and single/double-encoded path separators.
- After validation, decoded userinfo is safely re-encoded and the sanitizer
  reconstructs a canonical `postgresql://...` connection URL. Every wrapper
  Client, Pool, schema push, LISTEN/NOTIFY override, schema-check child, and test
  child receives only a reconstructed URL, never the raw input.
- The wrapper removes libpq target/credential fallbacks from both its setup
  process and child environment, case-insensitively. This covers `PGHOST`,
  `PGHOSTADDR`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGPASSFILE`,
  `PGSERVICE`, `PGSERVICEFILE`, `PGSYSCONFDIR`, `PGTARGETSESSIONATTRS`, and
  `PGLOADBALANCEHOSTS`; an omitted port therefore cannot be supplied by
  `PGPORT`.
- `LISTEN_NOTIFY_DATABASE_URL` now passes through the same parser and is
  canonically rebuilt against the resolved `_test` database during the initial
  pure target resolution, before any connection/create/reset work.
- `scripts/run-api-local.mjs` does not load `.env.local` when
  `VNDRLY_ISOLATED_TEST_DB=1`, so the wrapper-owned `DATABASE_URL` survives
  into the API child.
- Playwright configuration and global setup require the isolation marker and
  require `DATABASE_URL` and `TEST_DATABASE_URL` to identify the exact same
  normalized Postgres host, port, and database ending in `_test`. Credentials
  are ignored only for physical-target comparison; both returned connection
  strings are independently sanitized. Both web servers refuse reuse.
- E2E web requests are pinned to `http://localhost:23539`; every external,
  alternate loopback, port, path, credential, query, or fragment override is
  rejected before Playwright/global setup can issue a request.
- The two destructive fixture routes are wired through
  `requireIsolatedFixtureContext` before any route body/database action. The
  guard returns 503 unless the marker, exact normalized URL equality, and
  `_test` suffix all validate. Marker-only requests are rejected before any
  database action.
- `/auth/seed` remains intentionally available in development for manual demo
  recovery. E2E global setup can call it only through the fixed wrapper-owned
  localhost web/API pair, after database and origin validation.
- The E2E README names the root wrapper as the sole supported entry point and
  refers to `docs/canonical-credentials.md` as the credential source of truth.

Files:

- `package.json`
- `scripts/e2e-isolation.mjs`
- `scripts/e2e-isolation.d.mts`
- `scripts/run-api-local-config.mjs`
- `scripts/run-api-local.mjs`
- `scripts/final-hardening.test.mjs`
- `artifacts/api-server/scripts/run-with-test-db.ts`
- `lib/e2e/playwright.config.ts`
- `lib/e2e/global-setup.ts`
- `lib/e2e/README.md`
- `lib/e2e/tests/crew-employee-deactivate-refresh.spec.ts`
- `artifacts/api-server/src/lib/isolated-fixture-guard.ts`
- `artifacts/api-server/src/lib/isolated-fixture-guard.test.ts`
- `artifacts/api-server/src/routes/auth.ts`

## P1 — narrow migration-aware deployment

- `migrate:plate-state` reads only
  `lib/db/drizzle/chunk_391_site_visit_plate_state.sql`.
- Its parser permits exactly two ordered statements:
  `ADD COLUMN IF NOT EXISTS guest_sessions.plate_state text` and
  `ADD COLUMN IF NOT EXISTS site_visits.plate_state text`.
- It rejects additional SQL, executes no glob/directory, and verifies through
  `information_schema` that both columns are nullable `text`.
- GoDaddy deployment invokes that migration/preflight after build and before
  `vndrly-api` restart. Existing `set -e` behavior stops before restart on any
  migration or verification failure. No Drizzle push was added.

Files:

- `artifacts/api-server/package.json`
- `artifacts/api-server/scripts/apply-plate-state-migration.mjs`
- `scripts/plate-state-migration.mjs`
- `scripts/godaddy-deploy.mjs`
- `scripts/final-hardening.test.mjs`
- `docs/deploy-godaddy.md`

## P1 — backward-compatible rollout

- `VNDRLY_REQUIRE_PLATE_STATE` defaults OFF.
- While OFF, a plate with an absent, null, empty, or blank state is accepted
  and written as `null` for legacy clients.
- While ON (`VNDRLY_REQUIRE_PLATE_STATE=1`), a plate still requires a state.
- A supplied non-string or invalid state is rejected whenever a plate is
  supplied, independent of the rollout flag.
- Current web/mobile forms continue to require state locally and submit it.

Enable only after installed mobile adoption is confirmed:

```text
VNDRLY_REQUIRE_PLATE_STATE=1
```

Files:

- `artifacts/api-server/src/routes/visits.ts`
- `artifacts/api-server/src/routes/visits.test.ts`
- `docs/deploy-godaddy.md`

## P1 — secured preferred-state recommendations

- Existing admin, partner, vendor, and gatekeeper authorization is retained.
- Public callers must present the matching existing site/QR code; numeric ID
  alone returns 404. Guest credentials are validated and an active guest visit
  cannot request another site. Hidden, inactive, non-active-status, and missing
  sites are not disclosed to self-service callers.
- Responses remain a fixed aggregate `{ preferred: string[] }` with no counts
  or visit details.
- Authorization runs before a 30-second, 256-entry aggregate cache.
- A dedicated per-identity/IP limiter and a fixed global limiter cap cost.
  Identity uses authenticated IDs first and otherwise Express `req.ip` under
  the explicit loopback-proxy trust policy; route code never parses caller
  `X-Forwarded-For` itself.
- Web/mobile clients pass the site proof already available in their route or
  selected-site context.

Files:

- `artifacts/api-server/src/app.ts`
- `artifacts/api-server/src/lib/publicApiAllowlist.ts`
- `artifacts/api-server/src/lib/preferred-plate-states-rate-limit.ts`
- `artifacts/api-server/src/lib/preferred-plate-states-rate-limit.test.ts`
- `artifacts/api-server/src/routes/visits.ts`
- `artifacts/api-server/src/routes/visits.test.ts`
- `artifacts/vndrly/src/lib/visits-api.ts`
- `artifacts/vndrly/src/pages/gatekeeper.tsx`
- `artifacts/vndrly/src/pages/gatekeeper.test.tsx`
- `artifacts/vndrly/src/pages/visit-public.tsx`
- `artifacts/vndrly/src/pages/visit-public.test.tsx`
- `artifacts/vndrly-mobile/lib/gatekeeper.ts`
- `artifacts/vndrly-mobile/lib/guest.ts`
- `artifacts/vndrly-mobile/app/(tabs)/gate.tsx`
- `artifacts/vndrly-mobile/app/__tests__/gate.test.tsx`
- `artifacts/vndrly-mobile/app/visitor-checkin.tsx`
- `artifacts/vndrly-mobile/app/__tests__/visitor-checkin.test.tsx`

## P1/P2 — provenance and kiosk race

- Shared `reconcileAutomatedPlateUpdate` compares punctuation-insensitive plate
  identity. OCR/voice plate changes clear stale state unless that same result
  provides a valid state; same-plate updates preserve a manual state; a valid
  automated state replaces both.
- Web voice and OCR plus mobile voice and OCR use the shared rule. Sequential
  component tests cover low-confidence/missing state blocking and a later valid
  replacement.
- The public kiosk active visit is now a session-ID-keyed managed query.
  Credential rotation and logout cancel/remove active and guest queries before
  changing credentials. A same-`QueryClient` deferred race proves visitor A's
  late response cannot reveal A data or switch visitor B into A's visit, while
  visitor B's own response still applies.

Files:

- `lib/plate-state/src/index.ts`
- `lib/plate-state/src/index.test.ts`
- `artifacts/vndrly/src/pages/gatekeeper.tsx`
- `artifacts/vndrly/src/pages/gatekeeper.test.tsx`
- `artifacts/vndrly-mobile/app/(tabs)/gate.tsx`
- `artifacts/vndrly-mobile/app/__tests__/gate.test.tsx`
- `artifacts/vndrly/src/pages/visit-public.tsx`
- `artifacts/vndrly/src/pages/visit-public.test.tsx`

## P3 — search and artifacts

- State-qualified search recognizes only space, colon, or bullet separators.
  Hyphen, slash, and underscore remain literal plate punctuation.
- Regression coverage includes `TX ABC123` as a qualifier and Oklahoma literal
  plates `TX-991`, `CA/204`, and `NY_77`.
- Task reports 3, 5, 6, and 7 were removed from the Git index/tree while their
  ignored local copies remain intact. No unrelated tracked artifact was removed.

## Verification

Green:

- `node --test scripts/final-hardening.test.mjs` — 21 passed, including strict
  direct/pooler canonicalization, explicit/derived target validation, physical-
  target normalization, encoded-control/query/fragment/path rejection, libpq
  environment stripping, external E2E origin rejection, wrapper ordering, and
  static Playwright wiring.
- Isolated fixture guard focused Vitest — 1 file, 7 passed; marker-only,
  suffixless, mismatched, query-bearing, and omitted-port-plus-`PGPORT` targets
  all return 503 before the route action.
- API visit-route mocked focus — 63 passed, 27 skipped by test-name filter.
- Shared plate-state Vitest — 12 passed.
- Web gate/public focused Vitest — 2 files, 17 passed.
- Mobile gate/visitor focused Vitest — 2 files, 32 passed.
- `pnpm lint:i18n` — mobile 1,689/1,689 and web 4,232/4,232 locale keys in parity.
- `pnpm run typecheck` — all library, artifact, and scripts projects passed.
- `pnpm run test:web` — 101 files passed; 772 passed, 1 skipped.
- `pnpm run test:mobile` — 78 files passed; 536 passed.
- `git diff --check` — passed (only expected Windows LF/CRLF notices).

The first typecheck/web/mobile invocation was unable to read installed package
junctions under the filesystem sandbox. The same DB-free commands were rerun
with dependency-read access and passed as reported above.

Not run by design:

- Playwright and root `pnpm test` are explicitly forbidden until final review.
- Migration and deployment commands were never executed.
- `pnpm run test:api` was not run during the final P0 follow-up. An earlier
  hardening-pass attempt was stopped before connection/schema work, and this
  follow-up made no API-wrapper or database attempt. The gate remains for a
  reviewer with explicit isolated-database authority.

## Remaining concerns / reviewer follow-up

1. Playwright and the isolated API wrapper still need an explicitly authorized
   run against an operationally dedicated `_test` database. The code rejects a
   same/suffixless target, but naming alone cannot prove database ownership.
2. Keep `VNDRLY_REQUIRE_PLATE_STATE` unset until installed mobile adoption is
   confirmed, then enable it as documented.
3. The global/dedicated limiter uses the existing shared `BucketStore`: a
   single API process is protected in memory; multi-replica deployment must set
   the existing Redis rate-limit URL so the ceiling is atomic across replicas.
4. The earlier hardening commit normalized several touched legacy compact
   files, so parts of the whole-branch diff are formatting-only. This P0
   follow-up keeps its E2E spec change narrow.
5. PostgreSQL URL query parameters are intentionally unsupported, including
   `sslmode` and `application_name`. Any future connection behavior must retain
   the canonical target contract and receive a target-safety review plus
   regression coverage; it must not be added as a permissive URL allowlist.
