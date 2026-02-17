/**
 * Employee Info Modal Module
 * Handles displaying detailed employee information in a modal
 */

import { createElement, toggleHidden, clearNode } from '../utils/dom.js';
import { formatRange, createStatusBadge, computeUsedDaysToDate } from '../utils/formatters.js';

let infoModalState = {
    employeeId: null
};

let elements = null;
let getEnrichedEmployeeByIdFn = null;
let computeStatusFn = null;

/**
 * Initialize employee info module
 * @param {Object} elementRefs - DOM element references
 * @param {Function} getEnrichedEmployeeById - Function to get enriched employee data
 * @param {Function} computeStatus - Function to compute vacation status
 */
export function initEmployeeInfo(elementRefs, getEnrichedEmployeeById, computeStatus) {
    elements = elementRefs;
    getEnrichedEmployeeByIdFn = getEnrichedEmployeeById;
    computeStatusFn = computeStatus;

    // Setup event listeners
    if (elements.employeeInfoClose) {
        elements.employeeInfoClose.addEventListener('click', closeEmployeeInfoModal);
    }

    if (elements.employeeInfoModal) {
        elements.employeeInfoModal.addEventListener('click', handleBackdropClick);
    }
}

/**
 * Handle backdrop click to close modal
 */
function handleBackdropClick(event) {
    if (event.target === elements.employeeInfoModal) {
        closeEmployeeInfoModal();
    }
}

/**
 * Open employee info modal
 * @param {Object|string} employeeOrId - Employee object or ID
 */
export function openEmployeeInfoModal(employeeOrId) {
    const employeeId = typeof employeeOrId === "string" ? employeeOrId : employeeOrId?.id;
    if (!employeeId) {
        return;
    }

    const employee = getEnrichedEmployeeByIdFn(employeeId);
    if (!employee) {
        console.warn("Employee not found for info modal", { employeeId });
        return;
    }

    infoModalState.employeeId = employeeId;
    populateEmployeeInfoModal(employee);
    toggleHidden(elements.employeeInfoModal, false);

    if (elements.employeeInfoClose) {
        elements.employeeInfoClose.focus();
    }
}

/**
 * Close employee info modal
 */
export function closeEmployeeInfoModal() {
    infoModalState.employeeId = null;
    if (elements.employeeInfoModal) {
        toggleHidden(elements.employeeInfoModal, true);
    }
}

/**
 * Refresh employee info modal with updated data
 */
export function refreshEmployeeInfoModal() {
    if (!infoModalState.employeeId || !elements.employeeInfoModal ||
        elements.employeeInfoModal.classList.contains("hidden")) {
        return;
    }

    const updatedEmployee = getEnrichedEmployeeByIdFn(infoModalState.employeeId);
    if (!updatedEmployee) {
        closeEmployeeInfoModal();
        return;
    }

    populateEmployeeInfoModal(updatedEmployee);
}

/**
 * Populate modal with employee data
 * @param {Object} employee - Employee data
 */
function populateEmployeeInfoModal(employee) {
    if (!employee) {
        return;
    }

    const manager = employee.manager_id ? getEnrichedEmployeeByIdFn(employee.manager_id) : null;
    const accrued = getEmployeeAccruedDays(employee);
    const balance = getEmployeeBalance(employee);

    // Basic info
    if (elements.employeeInfoName) {
        elements.employeeInfoName.textContent = employee.fullName || employee.name || "—";
    }
    if (elements.employeeInfoTaxId) {
        elements.employeeInfoTaxId.textContent = employee.tax_id || employee.raw?.tax_id || "—";
    }
    if (elements.employeeInfoDepartment) {
        elements.employeeInfoDepartment.textContent = employee.departmentName || employee.department || "—";
    }
    if (elements.employeeInfoPosition) {
        elements.employeeInfoPosition.textContent = employee.position || employee.raw?.position || "—";
    }
    if (elements.employeeInfoManager) {
        elements.employeeInfoManager.textContent = formatManagerSummary(manager);
    }
    if (elements.employeeInfoAccrued) {
        elements.employeeInfoAccrued.textContent = typeof accrued === "number" ? String(accrued) : "—";
    }
    if (elements.employeeInfoBalance) {
        elements.employeeInfoBalance.textContent = typeof balance === "number" ? String(balance) : "—";
    }

    // Vacation history
    if (elements.employeeInfoHistoryList) {
        clearNode(elements.employeeInfoHistoryList);
        const history = (employee.vacationPeriods || []).slice().sort((a, b) =>
            b.start_date.localeCompare(a.start_date)
        );

        if (history.length === 0) {
            toggleHidden(elements.employeeInfoHistoryList, true);
            toggleHidden(elements.employeeInfoHistoryEmpty, false);
            return;
        }

        toggleHidden(elements.employeeInfoHistoryList, false);
        toggleHidden(elements.employeeInfoHistoryEmpty, true);

        history.forEach(period => {
            const item = createElement("li", "info-history-item");
            item.appendChild(createElement("div", "info-history-range",
                formatRange(period.start_date, period.end_date) || "—"));

            const statusLabel = computeStatusFn([period]);
            const statusWrapper = createElement("div", "info-history-status");
            statusWrapper.appendChild(createStatusBadge(statusLabel));
            item.appendChild(statusWrapper);

            elements.employeeInfoHistoryList.appendChild(item);
        });
    }
}

/**
 * Get employee accrued vacation days
 * @param {Object} employee - Employee data
 * @returns {number|null}
 */
function getEmployeeAccruedDays(employee) {
    const allocationTotal = employee?.allocation?.totalAllocatedDays;
    if (typeof allocationTotal === "number" && Number.isFinite(allocationTotal)) {
        return allocationTotal;
    }
    const total = employee?.total_vacation_days;
    return typeof total === "number" && Number.isFinite(total) ? total : null;
}

/**
 * Get employee vacation balance
 * @param {Object} employee - Employee data
 * @returns {number|null}
 */
function getEmployeeBalance(employee) {
    const accrued = getEmployeeAccruedDays(employee);
    if (typeof accrued !== "number") {
        return null;
    }

    // Calculate used days strictly by TZ: only past days and current partial days
    let usedToDate = 0;
    if (employee.vacationPeriods && Array.isArray(employee.vacationPeriods)) {
        employee.vacationPeriods.forEach(period => {
            usedToDate += computeUsedDaysToDate(period.start_date, period.end_date);
        });
    }

    return accrued - usedToDate;
}

/**
 * Format manager summary for display
 * @param {Object|null} manager - Manager data
 * @returns {string}
 */
function formatManagerSummary(manager) {
    if (!manager) {
        return "—";
    }

    const primaryName = typeof manager.fullName === "string" && manager.fullName.trim().length > 0
        ? manager.fullName.trim()
        : `${manager.name || ""} ${manager.surname || ""}`.trim();
    const name = primaryName || "";
    const position = manager.position || manager.raw?.position || "";

    if (name && position) {
        return `${name} (${position})`;
    }
    return name || position || "—";
}
