# @workspace/e2e

End-to-end browser tests (Playwright) that drive test-owned web and API
servers against an isolated test database. The suite must never run against
the shared development or production database.

## Prerequisites

- No API or web workflow may already own ports 8080 or 23539. Playwright
  deliberately refuses to reuse servers whose database provenance is unknown.
- Set `TEST_DATABASE_URL` to a database dedicated to tests, or provide a base
  `DATABASE_URL` from which the wrapper can derive a separate `_test` database.
- Chromium has been installed for Playwright:

  ```
  pnpm --filter @workspace/e2e run test:install
  ```

## Run

```powershell
pnpm run test:e2e
```

The root command is the only supported entry point. It starts
`run-with-test-db.ts`, which prepares the isolated schema and passes the same
normalized target in `DATABASE_URL` and `TEST_DATABASE_URL` together with
`VNDRLY_ISOLATED_TEST_DB=1`. Playwright configuration, global setup, local API
startup, and destructive fixture routes all fail closed without that
provenance. Running the Playwright package directly is expected to refuse.

Override the web base URL with `E2E_BASE_URL` if the web workflow is
exposed on a different host/port (e.g. behind a reverse proxy).

## What is covered

- `tests/visit-public.spec.ts` — public visitor sign-in page
  (`/visit/:siteCode`): seeds a partner, vendor, work type, site, and
  site work assignment; drives the guest sign-in form; mocks geolocation
  to verify both the off-geofence error path and the happy-path check-in
  - check-out flow; cleans up its seed data.
- `tests/bulk-1099-recategorize.spec.ts` — bulk 1099 income-category
  controls: signs in with the canonical demo admin account, seeds a
  deterministic vendor + draft invoice + paid invoice via the isolated-only
  `POST /api/auth/seed-1099-fixture` endpoint, then exercises both the
  multi-select bulk-apply toolbar on `/invoices/:id` and the per-vendor
  "Recategorize draft lines" dropdown on the 1099 dashboard at
  `/reports`. Demo logins use the fixed values in
  `docs/canonical-credentials.md`; the isolated seed reapplies those values
  verbatim and never changes the shared database.
