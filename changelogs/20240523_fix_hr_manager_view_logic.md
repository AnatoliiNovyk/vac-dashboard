# Changelog: Fix HR Manager View Logic

**Date:** 2024-05-23

**Author:** Gemini Assistant

## Change Description

This change corrects a logical error in the data displayed to an HR user on the "Manager View" tab.

-   **Objective:** Ensure the "Manager View" for an HR user correctly filters and displays vacation periods for **only** employees within the HR department.
-   **Scope:** This change modifies the `getVacationPeriodsForCurrentTab` function in `app.js`.
-   **Reasoning:** The previous implementation incorrectly showed all subordinates across the entire company, which was inconsistent with the contextual role of an HR manager viewing their own department. This fix aligns the view with user expectations.

## Affected Files

-   `app.js`

## Validation

-   [x] After this change, when logged in as an HR role and switched to the "Manager View" tab, the table and calendar now correctly display data only for employees from the HR department.
