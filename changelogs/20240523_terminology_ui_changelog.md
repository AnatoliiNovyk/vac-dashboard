# Changelog: UI Terminology Update

**Date:** 2024-05-23

**Author:** Gemini Assistant

## Change Description

This change addresses a key requirement from the technical specification to standardize terminology across the application.

-   **Objective:** Replace all user-facing instances of "відпустка" (vacation) and its variants with the term "період відпустки" (vacation period).
-   **Scope:** This initial change is limited to the `index.html` file to update the user interface.
-   **Reasoning:** To align the application's language with the established business domain terminology as per the project's system prompt.

## Affected Files

-   `index.html`

## Validation

-   [ ] After this change, manually inspect the web interface to confirm that all titles, labels, button texts, and modal headers related to "vacations" are correctly updated to "vacation periods".
-   [ ] Verify that no functional regressions have occurred in the UI.
