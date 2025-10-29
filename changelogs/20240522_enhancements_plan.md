# Changelog: App Enhancements (Persistence, Edit/Delete, Validation)

## Goal
To implement three major enhancements to the application:
1.  **Data Persistence:** Save all application data to `localStorage` to prevent data loss on page refresh.
2.  **Edit/Delete Requests:** Allow users to edit or delete their own vacation requests if they are still pending.
3.  **Improved Validation:** Add robust validation to the new request form to prevent invalid data entry.

---

## Phase 1: Data Persistence (`localStorage`)

### Plan
1.  **Create `saveData()` function:** This function will serialize the entire `appData` object (employees, requests, etc.) into a JSON string and save it to `localStorage` under a specific key (e.g., `vacationDashboardData`).
2.  **Create `loadData()` function:**
    - This function will be called during application initialization (`initializeApp`).
    - It will attempt to read the data from `localStorage`.
    - If data exists, it will parse the JSON and overwrite the default `appData` object.
    - If no data is found, it will proceed with the default hardcoded `appData`.
3.  **Integrate `saveData()`:** Call `saveData()` after any action that modifies `appData`, such as:
    - `handleNewRequestSubmit()`
    - `approveVacation()`
    - `rejectVacation()`
    - (Future) `deleteRequest()`
    - (Future) `updateRequest()`

---

## Phase 2: Edit & Delete Vacation Requests

### Plan
1.  **UI Updates:**
    - In `updateTable()`, add "Edit" (`fa-pen`) and "Delete" (`fa-trash`) icon buttons to the actions column.
    - These buttons will only be visible for requests where:
        - The current tab is one of the "My View" tabs (`employee-my`, `manager-my`, `hr-my`).
        - The request's `status` is "В очікуванні".
2.  **Delete Functionality:**
    - Create a `deleteRequest(requestId)` function.
    - It will ask for user confirmation (`window.confirm`).
    - If confirmed, it will filter `appData.vacation_requests` to remove the request with the specified ID.
    - It will then call `saveData()` and refresh the view using `applyFilters()`.
3.  **Edit Functionality:**
    - Create an `openEditModal(requestId)` function.
    - This function will find the request by its ID.
    - It will open the existing "New Request" modal but pre-populate the form fields with the data from the request being edited.
    - The form's submit handler will be adapted to handle both creating new requests and updating existing ones. A hidden input or a variable will be used to store the ID of the request being edited.
    - The `handleNewRequestSubmit` function will be renamed or refactored to `handleRequestFormSubmit` to reflect its dual purpose.
    - On submission, it will find the request in the array and update its properties, then call `saveData()` and refresh.

---

## Phase 3: Improved Validation

### Plan
1.  **Update `handleRequestFormSubmit()`:**
    - Add the following validation checks before creating or updating a request:
2.  **Date Validation:**
    - **No Past Dates:** The selected `start_date` cannot be earlier than today.
    - **Correct Range:** The `end_date` must be on or after the `start_date`. (Already partially implemented, will be made more robust).
3.  **Overlap Validation:**
    - Create a helper function `isDateRangeOverlapping(range1, range2)`.
    - Before submitting, get all existing requests for the `currentUser`.
    - Loop through the requests and use the helper function to check if the new date range overlaps with any existing (pending or approved) vacation.
    - If an overlap is detected, show an alert to the user and prevent the form from submitting.

This plan will be executed sequentially, starting with Phase 1.
