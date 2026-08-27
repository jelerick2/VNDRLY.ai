# Task 3 Report — Return state confidence from plate OCR

## Status

Complete.

## Exact files

- `artifacts/api-server/package.json`
- `artifacts/api-server/src/lib/plate-ocr.test.ts`
- `artifacts/api-server/src/lib/plate-ocr.ts`
- `artifacts/api-server/src/routes/visits.test.ts`
- `artifacts/api-server/src/routes/visits.ts`
- `pnpm-lock.yaml`
- `.superpowers/sdd/2026-08-27-state-aware-plate-ocr/task-3-report.md`

## RED evidence

`pnpm --filter @workspace/api-server exec vitest run src/lib/plate-ocr.test.ts`
failed as expected before implementation: 10 structured-contract tests failed because `extractPlateCandidate` still returned a scalar string or `null`.

## GREEN evidence

`pnpm --filter @workspace/api-server exec vitest run src/lib/plate-ocr.test.ts`
passed: 1 test file, 10 tests.

`pnpm --filter @workspace/api-server run typecheck`
passed.

`git diff --check`
passed.

## Review correction

- `POST /api/visits/gate/read-plate` now returns the candidate fields at the top level, retaining `plate` as the legacy scalar value.
- JSON objects without an own `plate` field, arrays, primitives, and JSON-shaped malformed content now return an all-null candidate rather than falling through to noisy OCR extraction.
- Follow-up focused checks passed: parser (11 tests) and route contract (1 selected test).
- Structured detection now also recognizes JSON fences anywhere in model content, embedded object/array syntax, and quoted OCR contract keys behind prose prefixes; parser coverage is now 12 focused tests.
- Structured detection now requires JSON-shaped object/array starts, so decorative OCR brackets remain on the noisy-extraction path; parser coverage is now 13 focused tests.

## Commit

`Return state confidence from plate OCR`

Follow-up: `Correct plate OCR response contract`

Final correction: `Harden OCR structured-content detection`

Bracket refinement: `Refine OCR JSON structure detection`

## Self-review

- Structured OCR responses normalize plate/state values, retain finite clamped confidences, and withhold states below the shared 0.80 threshold.
- Legacy JSON parsing and noisy/personalized plate extraction remain covered by behavior tests.
- Invalid or malformed model content returns a null-field candidate without throwing.
- The model prompt requests the four-field JSON response and specifies USPS state abbreviations.

## Concerns or deviations

None. The only dependency metadata change links the existing `@workspace/plate-state` package; no external runtime dependency or database action was introduced.
