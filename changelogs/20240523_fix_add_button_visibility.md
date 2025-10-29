# Changelog: Fix "Add Vacation Period" Button Visibility

**Date:** 2024-05-23

**Author:** Gemini Assistant

## Change Description

This change corrects a UI logic error where the "Add Vacation Period" button was incorrectly displayed on contextually inappropriate tabs for the HR role.

-   **Objective:** Restrict the visibility of the "Add Vacation Period" button to appear **only** on the main "HR View" (`hr-all`) tab.
-   **Scope:** This change modifies the `updateTabContent` function in `app.js`.
-   **Reasoning:** The button's purpose is for HR to manage vacations globally. Displaying it on other tabs, such as the "Manager View", was confusing and violated the principle of least privilege for that specific view. This change ensures UI elements are context-aware.

## Affected Files

-   `app.js`

## Validation

-   [x] After this change, when logged in as an HR role, the "Add Vacation Period" button is visible on the "HR View" tab.
-   [x] The "Add Vacation Period" button is now correctly hidden on all other tabs, including "Manager View" and "My View".
