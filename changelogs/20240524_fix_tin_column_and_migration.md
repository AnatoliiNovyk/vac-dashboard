# Changelog for 2024-05-24

## Bug Fixes

- **Fixed "TIN" column display issue and data migration**: Corrected a persistent bug in the "HR View" where the "TIN" column was showing "undefined". The issue was resolved by fixing the data rendering logic in the `updateTable` function and implementing a data migration mechanism to ensure that existing data in `localStorage` is updated with the new "TIN" field.
