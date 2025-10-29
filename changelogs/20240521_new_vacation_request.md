# Audit & Plan: New Vacation Request Feature

## Goal
To allow employees and managers to create new vacation requests through the UI.

## Current State
The application currently only displays existing, hardcoded vacation requests. There is no functionality to add new requests.

## Plan

### 1. UI/UX Changes
- **Add "New Request" Button:**
    - A "New Request" button will be added to the UI.
    - It should be visible on the "My View" tab for all roles (`employee-my`, `manager-my`, `hr-my`).
    - The button will be placed in the table header section, next to the "Список відпусток" title.
- **Create a New Request Modal:**
    - Clicking the button will open a modal window (`#new-request-modal`).
    - The modal will have a form with the following fields:
        - **Vacation Type:** A `<select>` dropdown populated from `appData.vacation_types`.
        - **Start Date:** An `<input type="date">`.
        - **End Date:** An `<input type="date">`.
        - **Number of Days:** A read-only field that automatically calculates the duration.
    - The modal footer will have "Submit" and "Cancel" buttons.

### 2. Logic Implementation (in `app.js`)
- **Event Listener:**
    - Add an event listener to the "New Request" button to open the modal.
- **Date Calculation Logic:**
    - Create a function `calculateVacationDays(startDate, endDate)` that calculates the number of days between two dates.
    - Add event listeners to the start and end date inputs to trigger this calculation automatically.
- **Form Submission Logic:**
    - Create a function `handleNewRequestSubmit()`.
    - This function will:
        1.  Read the values from the form.
        2.  Perform basic validation (e.g., end date is after start date).
        3.  Create a new vacation request object. The object should include a new unique `id`, `employee_id` from `currentUser`, `status: 'В очікуванні'`, and other form data.
        4.  Push the new object into the `appData.vacation_requests` array.
        5.  Close the modal.
        6.  Refresh the dashboard view (`applyFilters()`) to show the new request.

### 3. HTML/CSS Changes
- **`index.html`:**
    - Add the HTML structure for the "New Request" button.
    - Add the HTML structure for the new modal, initially hidden.
- **`style.css`:**
    - Add styles for the new button and the new modal form elements to ensure they are consistent with the existing design.
