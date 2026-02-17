/**
 * Vacation Manager Module
 * Handles vacation period modal and editing
 */

import { modalState, resetModalState } from '../core/state.js';
import { toggleHidden, createElement, clearNode } from '../utils/dom.js';
import { formatDate, computeDays, computeUsedDaysToDate } from '../utils/formatters.js';
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

    console.log('[vacation-manager] initVacationManager called');
    console.log('[vacation-manager] elements.vacationModalForm:', elements.vacationModalForm);

    // Set up event listeners - using direct click on Save button instead of form submit
    // This is more reliable and avoids ES6 module caching issues
    if (elements.vacationModalSave) {
        elements.vacationModalSave.addEventListener('click', handleVacationModalSubmit);
        console.log('[vacation-manager] Click listener attached to Save button:', elements.vacationModalSave.id);
    } else {
        console.error('[vacation-manager] ERROR: vacationModalSave is NULL! No click listener attached.');
    }

    if (elements.vacationModalClose) {
        elements.vacationModalClose.addEventListener('click', () => closeModal());
    }

    if (elements.vacationModalCancel) {
        elements.vacationModalCancel.addEventListener('click', () => closeModal(true));
    }

    if (elements.vacationPeriodAddBtn) {
        elements.vacationPeriodAddBtn.addEventListener('click', addPeriod);
    }

    if (elements.vacationLimitInput) {
        elements.vacationLimitInput.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val)) {
                modalState.limitDays = val;
                modalState.isDirty = true;
            }
        });
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

    // Load limit from allocation or legacy field
    modalState.limitDays = employee.allocation?.totalAllocatedDays ?? employee.total_vacation_days ?? 0;

    // Load existing periods
    const periods = (employee.vacationPeriods || []).map(p => ({
        id: p.id,
        refId: p.id,
        startDate: p.start_date,
        endDate: p.end_date
    }));

    modalState.periods = periods;
    modalState.originalPeriods = JSON.parse(JSON.stringify(periods));
    modalState.originalLimitDays = modalState.limitDays;
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
 * Handle Save button click
 * @param {Event} event - Click event
 */
async function handleVacationModalSubmit(event) {
    console.log('[handleVacationModalSubmit] CALLED. isDirty:', modalState.isDirty, 'isReadOnly:', modalState.isReadOnly);
    if (event) event.preventDefault();

    if (modalState.isReadOnly || !modalState.isDirty) {
        console.log('[handleVacationModalSubmit] EXIT EARLY - isReadOnly:', modalState.isReadOnly, 'isDirty:', modalState.isDirty);
        return;
    }

    try {
        console.log('[handleVacationModalSubmit] Calling saveChanges()...');
        await saveChanges();
        console.log('[handleVacationModalSubmit] saveChanges() completed successfully');
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
    const periodsCollection = db.collection("vacation_periods");
    const employeesCollection = db.collection("employees");

    // 2. Calculate total used days from current periods (only past/current as per TZ)
    let usedDaysToDate = 0;
    modalState.periods.forEach(period => {
        usedDaysToDate += computeUsedDaysToDate(period.startDate, period.endDate);
    });

    const newBalance = modalState.limitDays - usedDaysToDate;

    console.log('[saveChanges] Recalculating balance:', {
        limit: modalState.limitDays,
        usedToDate: usedDaysToDate,
        newBalance: newBalance
    });

    // 3. Always update employee document to ensure balance is sync'd
    const empRef = employeesCollection.doc(modalState.employeeId);

    console.log('[saveChanges] Finalizing update for employee:', modalState.employeeId, {
        limit: modalState.limitDays,
        usedToDate: usedDaysToDate,
        newBalance: newBalance
    });

    batch.set(empRef, {
        allocation: {
            totalAllocatedDays: modalState.limitDays,
            balanceDays: newBalance,
            updatedAt: new Date()
        }
    }, { merge: true });

    // 4. Track IDs of periods we're keeping
    const currentPeriodIds = new Set();

    // 5. Save each period
    modalState.periods.forEach(period => {
        const docRef = period.refId
            ? periodsCollection.doc(period.refId)
            : periodsCollection.doc();

        const payload = {
            employee_id: modalState.employeeId,
            start_date: period.startDate,
            end_date: period.endDate,
            days: computeDays(period.startDate, period.endDate),
            updated_at: new Date()
        };

        batch.set(docRef, payload, { merge: true });

        if (period.id && !period.id.startsWith('temp-')) {
            currentPeriodIds.add(period.id);
        } else if (period.refId) {
            currentPeriodIds.add(period.refId);
        }
    });

    // 4. DELETE periods that were removed
    modalState.originalPeriods.forEach(original => {
        const docId = original.refId || original.id;
        if (docId && !docId.startsWith('temp-') && !currentPeriodIds.has(docId)) {
            console.log('[saveChanges] DELETING removed period:', docId);
            batch.delete(periodsCollection.doc(docId));
        }
    });

    await batch.commit();

    modalState.isDirty = false;
    modalState.originalPeriods = JSON.parse(JSON.stringify(modalState.periods));
    modalState.originalLimitDays = modalState.limitDays;
}

/**
 * Render modal content
 */
function renderModalContent() {
    const employee = modalState.employeeSnapshot;

    if (elements.vacationModalEmployeeName) {
        elements.vacationModalEmployeeName.textContent = employee?.fullName || employee?.name || "—";
    }

    // Set limit input value
    if (elements.vacationLimitInput) {
        elements.vacationLimitInput.value = modalState.limitDays;
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
