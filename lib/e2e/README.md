# @workspace/e2e

End-to-end browser tests (Playwright) that drive test-owned web and API
servers against an isolated test database. The suite must never run against
the shared development or production database.

## Prerequisites

- No API or web workflow may already own ports 8080 or 23539. Playwright
  deliberately refuses to reuse servers whose database provenance is unknown.
- Set `TEST_DATABASE_URL` to a database dedicated to tests whose database name
  ends in `_test` and whose normalized host/port/database differs from
  `DATABASE_URL`, or omit it so the wrapper derives a separate `_test` database
  on the same server. Credentials do not make the same physical database a
  distinct target.
- `DATABASE_URL`, `TEST_DATABASE_URL`, and `LISTEN_NOTIFY_DATABASE_URL` must use
  the documented `postgresql://user:password@host:port/database` (or
  `postgres://...`) shape with an explicit DNS hostname, explicit numeric port,
  and an ASCII database identifier. Percent-encoding is forbidden in the host
  and database path; decoded credentials may not contain NUL, C0, or C1 control
  characters. All query strings and fragments are rejected before any
  connection or schema work.
- The wrapper reconstructs canonical connection URLs from the validated
  components and passes only those URLs to setup, schema, LISTEN/NOTIFY, and
  child processes. It also removes libpq target fallbacks such as `PGHOST`,
  `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, and `PGSERVICE` from setup and
  child environments, so they cannot supply or redirect an omitted component.
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
provenance and an `_test` database name. The wrapper validates the target before
opening a connection or creating/resetting a schema, and the API fixture guard
applies the same strict parser before entering a route action. Running the
Playwright package directly is expected to refuse.

The browser base URL is fixed at `http://localhost:23539`. `E2E_BASE_URL` may be
unset or spell that exact local origin; external hosts, alternate loopback
addresses, ports, paths, credentials, query strings, and fragments are
rejected. Playwright also refuses to reuse either server, so global setup's
development-only `POST /api/auth/seed` can reach only the wrapper-owned local
web/API pair. The manual development seed route itself remains available for
intentional local recovery and still uses the canonical credentials verbatim.

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
