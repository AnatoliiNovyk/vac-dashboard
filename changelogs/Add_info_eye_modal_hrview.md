# Title

Eye info modal for HR View

## Summary

- Added an eye icon control beside “Періоди” in HR View for employee quick info access
- Implemented a Firestore-backed employee info modal with core profile fields and vacation history
- Extended styling to support the icon-only control and responsive modal layout

## Files changed

- index.html
- app.js
- style.css

## Data/Rules/Functions

- No backend data, rules, or functions were changed

## Tests/Validation

- Not run (manual check with Firebase Emulator Suite recommended)

## Risks & Rollback

- Medium: modal depends on enriched employee data; revert by removing the eye button and modal wiring if inconsistencies appear

## Next step

- Smoke-test HR View across HR roles to confirm modal data and responsive layout

## Screens (до/після)

- Not captured
