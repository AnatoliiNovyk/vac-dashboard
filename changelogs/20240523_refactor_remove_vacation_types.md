# Changelog: Refactor - Remove Vacation Period Types

**Date:** 2024-05-23

**Author:** Gemini Assistant

## Change Description

This is a major refactoring to simplify the application's core logic by completely removing the concept of different "Vacation Period Types" (e.g., Annual, Sick Leave, etc.).

-   **Objective:** To align the application with the business requirement of managing a single, universal type of employee absence, which is then used to calculate one of the three valid statuses ("At Work", "On Leave", "Planned").
-   **Scope:** This change impacts `index.html` and `app.js`.
-   **Reasoning:** The distinction between different vacation types was a legacy feature that contradicted the simplified logic outlined in the technical specification. It added unnecessary complexity to the UI (extra table column, filter, modal field, calendar legend) and the backend logic. This removal streamlines the user experience and codebase.

## Affected Files

-   `index.html`
-   `app.js`

## Changes Overview

-   **`index.html`:**
    -   Removed the "Тип" (Type) column from the main table.
    -   Removed the "Тип періоду відпустки" filter dropdown.
    -   Removed the "Тип періоду відпустки" selector from the creation/edit modal.
    -   Removed the multi-color calendar legend.
-   **`app.js`:**
    -   Removed the `vacation_period_types` array from the default data.
    -   Removed all logic for populating type-related dropdowns.
    -   Simplified the `handleVacationPeriodFormSubmit` function to no longer handle a `type`.
    -   Removed type-based filtering and calendar coloring logic.
