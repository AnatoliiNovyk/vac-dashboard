/**
 * Vacation Manager Module
 * Handles vacation period modal and editing
 */

import { modalState, resetModalState } from '../core/state.js';
import { toggleHidden, createElement, clearNode } from '../utils/dom.js';
import { formatDate, computeDays } from '../utils/formatters.js';
import { validatePeriodDates } from '../utils/validation.js';

let elements = {};
let db = null;

/**
 * Initialize vacation manager module
 * @param {Object} deps - Dependencies (db, elements)
 */
export function initVacationManager(deps) {
    db = deps.db;
    elements = deps.elements;

    // Set up event listeners
    if (elements.vacationModalForm) {
        elements.vacationModalForm.addEventListener('submit', handleVacationModalSubmit);
    }

    if (elements.vacationModalClose) {
        elements.vacationModalClose.addEventListener('click', () => closeModal());
    }

    if (elements.vacationModalCancel) {
        elements.vacationModalCancel.addEventListener('click', () => closeModal());
    }

    if (elements.vacationPeriodAddBtn) {
        elements.vacationPeriodAddBtn.addEventListener('click', addPeriod);
    }

    console.log('[vacation-manager] Vacation manager module initialized');
}

/**
 * Open vacation manager modal
 * @param {Object} employee - Employee object
 */
export function openModal(employee) {
    if (!elements.vacationModal || !employee) {
        return;
    }

    // Load employee data into modal
    modalState.employeeId = employee.id;
    modalState.employeeSnapshot = employee;

    // Load existing periods
    const periods = (employee.vacationPeriods || []).map(p => ({
        id: p.id,
        refId: p.id,
        startDate: p.start_date,
        endDate: p.end_date
    }));

    modalState.periods = periods;
    modalState.originalPeriods = JSON.parse(JSON.stringify(periods));
    modalState.isDirty = false;
    modalState.isReadOnly = false; // Determine based on user role

    // Render modal content
    renderModalContent();

    // Show modal
    elements.vacationModal.setAttribute("aria-hidden", "false");
    elements.vacationModal.style.display = "flex";
    toggleHidden(elements.vacationModal, false);
}

/**
 * Close vacation manager modal
 * @param {boolean} force - Force close without confirmation
 */
export function closeModal(force = false) {
    if (modalState.isDirty && !force) {
        const confirmed = window.confirm("Закрити без збереження змін?");
        if (!confirmed) {
            return;
        }
    }

    resetModalState();

    if (elements.vacationModal) {
        elements.vacationModal.setAttribute("aria-hidden", "true");
        elements.vacationModal.style.display = "none";
        toggleHidden(elements.vacationModal, true);
    }
}

/**
 * Add new period
 */
export function addPeriod() {
    if (modalState.isReadOnly) {
        return;
    }

    const today = formatDate(new Date());
    const newPeriod = {
        id: `temp-${Date.now()}`,
        refId: null,
        startDate: today,
        endDate: today
    };

    modalState.periods.push(newPeriod);
    modalState.isDirty = true;

    renderModalPeriods();
}

/**
 * Delete period
 * @param {string} periodId - Period ID
 */
export function deletePeriod(periodId) {
    if (modalState.isReadOnly) {
        return;
    }

    modalState.periods = modalState.periods.filter(p => p.id !== periodId);
    modalState.isDirty = true;

    renderModalPeriods();
}

/**
 * Handle modal form submit
 * @param {Event} event - Form submit event
 */
async function handleVacationModalSubmit(event) {
    event.preventDefault();

    if (modalState.isReadOnly || !modalState.isDirty) {
        return;
    }

    try {
        await saveChanges();
        closeModal(true);
    } catch (error) {
        console.error("Error saving vacation periods:", error);
        alert("Помилка збереження: " + error.message);
    }
}

/**
 * Save changes to Firestore
 */
export async function saveChanges() {
    if (!db) {
        throw new Error("Firestore not initialized");
    }

    const batch = db.batch();
    const collectionRef = db.collection("vacation_periods");

    // Save each period
    modalState.periods.forEach(period => {
        const docRef = period.refId
            ? collectionRef.doc(period.refId)
            : collectionRef.doc();

        const payload = {
            employee_id: modalState.employeeId,
            start_date: period.startDate,
            end_date: period.endDate,
            days: computeDays(period.startDate, period.endDate),
            updated_at: new Date()
        };

        batch.set(docRef, payload, { merge: true });
    });

    await batch.commit();

    modalState.isDirty = false;
    modalState.originalPeriods = JSON.parse(JSON.stringify(modalState.periods));
}

/**
 * Render modal content
 */
function renderModalContent() {
    if (elements.vacationModalEmployeeName) {
        const employee = modalState.employeeSnapshot;
        elements.vacationModalEmployeeName.textContent = employee?.fullName || employee?.name || "—";
    }

    renderModalPeriods();
}

/**
 * Render modal periods list
 */
function renderModalPeriods() {
    if (!elements.vacationPeriodList) {
        return;
    }

    clearNode(elements.vacationPeriodList);

    if (modalState.periods.length === 0) {
        elements.vacationPeriodList.innerHTML = "<em>Немає періодів</em>";
        return;
    }

    modalState.periods.forEach(period => {
        const row = createElement("div", "vacation-period-row");
        row.dataset.periodId = period.id;

        // Start date input
        const startInput = createElement("input");
        startInput.type = "date";
        startInput.value = period.startDate;
        startInput.disabled = modalState.isReadOnly;
        startInput.addEventListener("change", (e) => {
            period.startDate = e.target.value;
            modalState.isDirty = true;
        });

        // End date input
        const endInput = createElement("input");
        endInput.type = "date";
        endInput.value = period.endDate;
        endInput.disabled = modalState.isReadOnly;
        endInput.addEventListener("change", (e) => {
            period.endDate = e.target.value;
            modalState.isDirty = true;
        });

        // Delete button
        const deleteBtn = createElement("button", "btn btn--danger btn--small", "Видалити");
        deleteBtn.type = "button";
        deleteBtn.disabled = modalState.isReadOnly;
        deleteBtn.addEventListener("click", () => deletePeriod(period.id));

        row.appendChild(startInput);
        row.appendChild(endInput);
        row.appendChild(deleteBtn);

        elements.vacationPeriodList.appendChild(row);
    });
}
