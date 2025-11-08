# HR View BAS Control Shell

## Summary

- Added a dedicated BAS import/export control panel under the HR View table, including cloud-themed buttons and a log area.
- Wired visibility to HR roles plus `FEATURES.BAS_SYNC_ENABLED`, with graceful fallbacks for other tabs and when users sign out.
- Stubbed button handlers so clicks surface informational log entries until backend integration is delivered.

## Files changed

- index.html (injected BAS controls section)
- style.css (layout and log styling for BAS controls)
- app.js (feature flag hookup, visibility logic, log helpers)

## Data / Rules / Functions

- No Firestore structures, rules, or Cloud Functions updated in this step.

## Tests / Validation

- [ ] Manual: Sign in as HR and confirm BAS buttons and log appear only on HR View.
- [ ] Manual: Switch to other tabs / log out and ensure controls disappear without console errors.

## Risks & Rollback

- Low: UI-only scaffolding. Remove the new HTML section and related JS/CSS if issues arise.

## Next step

- Implement actual BAS import/export flows (file selection, parsing, callable functions, download) atop this UI shell.

## Screens

- Pending manual capture after functional wiring.
