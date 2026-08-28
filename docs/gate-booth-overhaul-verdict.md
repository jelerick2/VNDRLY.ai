# Gate booth overhaul — plate OCR verdict

The user’s `codex/state-aware-plate-ocr` work was already on `origin/main`. This overhaul keeps the useful OCR contract and removes the required-state mistake.

## What they got right

- Nullable `plate_state` on visits and OCR payload `{ plate, state, confidence }`.
- Shared `@workspace/plate-state` helpers, preferred-state picker, and spoken-state parsing.
- `TX • ABC1234` display and state+plate matching when both exist.
- `VNDRLY_REQUIRE_PLATE_STATE` env for tests only (production stays off).
- Camera-first plate read that can fill state when confidence is high.

## What was wrong

- New vehicle check-ins required plate state as a form field.
- Memory refused plate suggestions when `!draft.plateState`.
- `latestVisitForPlate` returned null without state.
- Visitor / guest `formReady` required state whenever a plate was typed.
- Mobile `submitGatekeeperVisit` / `submitVisitorCheckIn` returned `missing-state`.
- Humans still typed or saw `SITE-XXXXXXXX` on Gate and visitor screens.

## What we kept vs replaced

Kept: OCR fill, optional state picker, preferred-state ranking, spoken state, composite matching when both plate and state are known.

Replaced: required-state UI and client validation. State is optional. Specialty, dirty, and no-state plates can check in. Site pickers show location **name** (and distance) only. Site codes remain internal IDs for APIs, QR deep links, and DB.
