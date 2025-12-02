/**
 * UI Rendering Module
 * Handles main UI rendering and updates
 */

import { appState } from '../core/state.js';
import { enrichEmployeeData } from './data.js';
import { renderCalendar } from './calendar.js';
import { renderFilters } from './filters.js';
import { createElement, clearNode, toggleHidden } from '../utils/dom.js';
import { createStatusBadge } from '../utils/formatters.js';

let elements = {};

/**
 * Initialize UI module
 * @param {Object} deps - Dependencies (elements)
 */
export function initUI(deps) {
    elements = deps.elements;
    console.log('[ui] UI module initialized');
}

/**
 * Render main content based on current tab
 * @param {Object} userDoc - User document
 */
export async function renderMainContent(userDoc) {
    if (!userDoc) {
        return;
    }

    const tab = appState.currentTab;

    // Render filters
    renderFilters(userDoc, tab);

    // Get employees for current view
    const employees = await getEmployeesForView(tab, userDoc);

    // Render based on tab
    if (tab === "My View") {
        renderMyView(employees, userDoc);
    } else if (tab === "Manager View") {
        renderManagerView(employees, userDoc);
    } else if (tab === "HR View") {
        renderHRView(employees, userDoc);
    }
}

/**
 * Re-render UI (refresh)
 * @param {string} [forceTab] - Force specific tab
 */
export async function rerenderUI(forceTab) {
    if (!appState.currentUser) {
        return;
    }

    const userDoc = appState.currentUser;
    const tabs = getVisibleTabs(userDoc);

    if (forceTab && tabs.includes(forceTab)) {
        appState.currentTab = forceTab;
    } else if (!tabs.includes(appState.currentTab)) {
        appState.currentTab = tabs[0];
    }

    renderTabs(userDoc);
    updateUserSummary(userDoc);
    await renderMainContent(userDoc);
}

/**
 * Render tabs navigation
 * @param {Object} userDoc - User document
 */
function renderTabs(userDoc) {
    if (!elements.tabsNav) {
        return;
    }

    clearNode(elements.tabsNav);
    const tabs = getVisibleTabs(userDoc);
    console.log('[ui] renderTabs: visible tabs:', tabs, 'for user:', userDoc);

    tabs.forEach((tabName, index) => {
        const button = createElement("button", "tab-button", tabName);
        if ((appState.currentTab && appState.currentTab === tabName) || (!appState.currentTab && index === 0)) {
            button.classList.add("active");
        }
        button.addEventListener("click", () => setActiveTab(tabName));
        elements.tabsNav.appendChild(button);
    });
}

/**
 * Set active tab
 * @param {string} tabName - Tab name
 */
function setActiveTab(tabName) {
    appState.currentTab = tabName;
    rerenderUI();
}

/**
 * Get visible tabs for user
 * @param {Object} userDoc - User document
 * @returns {Array<string>} Tab names
 */
function getVisibleTabs(userDoc) {
    if (!userDoc) {
        return ["My View"];
    }
    if (userDoc.isHRHead) {
        return ["HR View", "Manager View", "My View"];
    }
    if (userDoc.isHR) {
        return ["HR View", "My View"];
    }
    if (userDoc.isManager) {
        return ["Manager View", "My View"];
    }
    return ["My View"];
}

/**
 * Update user summary display
 * @param {Object} userDoc - User document
 */
export function updateUserSummary(userDoc) {
    if (elements.currentUserName) {
        elements.currentUserName.textContent = userDoc?.fullName || userDoc?.name || "—";
    }
    if (elements.currentUserRole) {
        const roles = [];
        if (userDoc?.isHRHead) roles.push("HR Head");
        if (userDoc?.isHR) roles.push("HR");
        if (userDoc?.isManager) roles.push("Manager");
        elements.currentUserRole.textContent = roles.join(", ") || "Employee";
    }
}

/**
 * Get employees for current view
 * @param {string} tab - Current tab
 * @param {Object} userDoc - User document
 * @returns {Promise<Array>} Employees
 */
async function getEmployeesForView(tab, userDoc) {
    const employees = enrichEmployeeData();

    if (tab === "My View") {
        return employees.filter(emp => emp.id === userDoc.id);
    }

    if (tab === "Manager View") {
        // Get manager's team
        if (window.getManagerEmployees) {
            return await window.getManagerEmployees(userDoc.id);
        }
    }

    // HR View - all employees with filters applied
    let filtered = employees.slice();
    const filters = appState.filters || {};

    if (filters.department) {
        filtered = filtered.filter(emp =>
            emp.department_id === filters.department ||
            emp.department === filters.department ||
            emp.departmentName === filters.department
        );
    }

    if (filters.status) {
        filtered = filtered.filter(emp => emp.computedStatus === filters.status);
    }

    return filtered;
}

/**
 * Render My View
 * @param {Array} employees - Employees (should be just current user)
 * @param {Object} userDoc - User document
 */
function renderMyView(employees, userDoc) {
    // Render table
    renderEmployeeTable(employees);

    // Render calendar
    renderCalendar(employees);
}

/**
 * Render Manager View
 * @param {Array} employees - Team employees
 * @param {Object} userDoc - User document
 */
function renderManagerView(employees, userDoc) {
    // Render table
    renderEmployeeTable(employees);

    // Render calendar
    renderCalendar(employees);
}

/**
 * Render HR View
 * @param {Array} employees - All employees
 * @param {Object} userDoc - User document
 */
function renderHRView(employees, userDoc) {
    // Render table
    renderEmployeeTable(employees);

    // Render calendar
    renderCalendar(employees);
}

/**
 * Render employee table
 * @param {Array} employees - Employees to render
 */
function renderEmployeeTable(employees) {
    if (!elements.tableBody) {
        console.warn('[ui] tableBody element not found');
        return;
    }

    clearNode(elements.tableBody);
    console.log('[ui] Rendering table with', employees.length, 'employees');

    if (!employees || employees.length === 0) {
        const emptyRow = createElement("tr", "empty-row");
        const emptyCell = createElement("td", "", "Немає даних для відображення");
        emptyCell.colSpan = 8;
        emptyRow.appendChild(emptyCell);
        elements.tableBody.appendChild(emptyRow);
        return;
    }

    employees.forEach(emp => {
        const row = createElement("tr", "employee-row");
        row.dataset.employeeId = emp.id;

        // Name
        const nameCell = createElement("td", "");
        nameCell.textContent = emp.fullName || emp.name || "—";
        row.appendChild(nameCell);

        // Department
        const deptCell = createElement("td", "");
        deptCell.textContent = emp.departmentName || emp.department || "—";
        row.appendChild(deptCell);

        // Position
        const posCell = createElement("td", "");
        posCell.textContent = emp.position || "—";
        row.appendChild(posCell);

        // Status with badge
        const statusCell = createElement("td", "");
        const status = emp.computedStatus || "На роботі";
        const statusBadge = createStatusBadge(status);
        statusCell.appendChild(statusBadge);
        row.appendChild(statusCell);

        // Next vacation
        const nextVacCell = createElement("td", "");
        const nextVacation = getNextVacation(emp.vacationPeriods || []);
        if (nextVacation) {
            nextVacCell.textContent = `${nextVacation.start_date} - ${nextVacation.end_date}`;
        } else {
            nextVacCell.textContent = "—";
        }
        row.appendChild(nextVacCell);

        // Accrued days
        const accruedCell = createElement("td", "col-earned");
        const accrued = emp.allocation?.totalAllocatedDays ?? emp.total_vacation_days ?? 0;
        accruedCell.textContent = accrued;
        row.appendChild(accruedCell);

        // Balance days
        const balanceCell = createElement("td", "");
        const balance = emp.allocation?.balanceDays ??
            ((emp.total_vacation_days || 0) - (emp.used_vacation_days || 0));
        balanceCell.textContent = balance;
        row.appendChild(balanceCell);

        // Actions
        const actionsCell = createElement("td", "actions-cell");
        const actionsContainer = createElement("div", "table-actions");

        // Info button (only for HR View)
        if (appState.currentTab === "HR View") {
            const infoBtn = createElement("button", "btn btn--icon btn--secondary");
            infoBtn.title = "Інформація";
            infoBtn.innerHTML = '<i class="fas fa-info-circle"></i>';
            infoBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                if (window.openEmployeeInfoModal) {
                    window.openEmployeeInfoModal(emp.id);
                }
            });
            actionsContainer.appendChild(infoBtn);
        }

        // Edit button (only for HR)
        if (appState.currentUser && (appState.currentUser.isHR || appState.currentUser.isHRHead)) {
            const editBtn = createElement("button", "btn btn--icon btn--primary");
            editBtn.title = "Редагувати відпустки";
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                if (window.openVacationModal) {
                    window.openVacationModal(emp.id);
                }
            });
            actionsContainer.appendChild(editBtn);
        }

        actionsCell.appendChild(actionsContainer);
        row.appendChild(actionsCell);

        // Row click handler
        row.addEventListener("click", () => {
            if (window.openEmployeeInfoModal) {
                window.openEmployeeInfoModal(emp.id);
            }
        });

        elements.tableBody.appendChild(row);
    });
}

/**
 * Get next upcoming vacation
 * @param {Array} periods - Vacation periods
 * @returns {Object|null} Next vacation or null
 */
function getNextVacation(periods) {
    if (!periods || periods.length === 0) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = periods
        .filter(p => {
            const startDate = new Date(p.start_date);
            return startDate >= today;
        })
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    return upcoming[0] || null;
}



