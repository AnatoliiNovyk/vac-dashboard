# Title

Replace “Періоди” button with edit icon

## Summary

- swapped the text-based Vacation Periods control for a compact pencil-in-square icon action in HR View rows
- aligned both action buttons to the new icon styling with dark background and accessible labels/tooltips
- refreshed action column spacing so the icons remain centered on desktop and mobile

## Files changed

- app.js
- style.css

## Data/Rules/Functions

- no backend data, rules, or functions were touched

## Tests/Validation

- not run (UI-only change; verify manually in HR View on multiple screen sizes)

## Risks & Rollback

- low: revert `app.js` and `style.css` to restore the previous text button if any regressions appear

## Next step

- exercise the Vacation Manager via the new icon across several employees in the emulator

## Screens (до/після)

- not captured
