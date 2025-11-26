/**
 * UI Rendering Module
 * Handles main UI rendering and updates
 */

import { appState } from '../core/state.js';
import { enrichEmployeeData } from './data.js';
import { renderCalendar } from './calendar.js';
import { renderFilters } from './filters.js';
import { createElement, clearNode, toggleHidden } from '../utils/dom.js';

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
    if (!elements.mainContent) return;

    clearNode(elements.mainContent);

    const container = createElement("div", "my-view");

    // Stats
    const stats = createElement("div", "stats-grid");
    stats.innerHTML = `
    <div class="stat-card">
      <h3>Нараховано днів</h3>
      <p class="stat-value">${userDoc.total_vacation_days || 0}</p>
    </div>
    <div class="stat-card">
      <h3>Використано</h3>
      <p class="stat-value">${userDoc.used_vacation_days || 0}</p>
    </div>
    <div class="stat-card">
      <h3>Залишок</h3>
      <p class="stat-value">${(userDoc.total_vacation_days || 0) - (userDoc.used_vacation_days || 0)}</p>
    </div>
  `;
    container.appendChild(stats);

    // Calendar
    renderCalendar(employees);

    elements.mainContent.appendChild(container);
}

/**
 * Render Manager View
 * @param {Array} employees - Team employees
 * @param {Object} userDoc - User document
 */
function renderManagerView(employees, userDoc) {
    if (!elements.mainContent) return;

    clearNode(elements.mainContent);

    const container = createElement("div", "manager-view");

    // Team stats
    const stats = createElement("div", "stats-grid");
    stats.innerHTML = `
    <div class="stat-card">
      <h3>Команда</h3>
      <p class="stat-value">${employees.length}</p>
    </div>
    <div class="stat-card">
      <h3>У відпустці</h3>
      <p class="stat-value">${employees.filter(e => e.computedStatus === "У відпустці").length}</p>
    </div>
  `;
    container.appendChild(stats);

    // Calendar
    renderCalendar(employees);

    elements.mainContent.appendChild(container);
}

/**
 * Render HR View
 * @param {Array} employees - All employees
 * @param {Object} userDoc - User document
 */
function renderHRView(employees, userDoc) {
    if (!elements.mainContent) return;

    clearNode(elements.mainContent);

    const container = createElement("div", "hr-view");

    // Stats
    const stats = createElement("div", "stats-grid");
    stats.innerHTML = `
    <div class="stat-card">
      <h3>Всього співробітників</h3>
      <p class="stat-value">${employees.length}</p>
    </div>
    <div class="stat-card">
      <h3>У відпустці</h3>
      <p class="stat-value">${employees.filter(e => e.computedStatus === "У відпустці").length}</p>
    </div>
  `;
    container.appendChild(stats);

    // Table
    renderEmployeeTable(employees);

    elements.mainContent.appendChild(container);
}

/**
 * Render employee table
 * @param {Array} employees - Employees to render
 */
function renderEmployeeTable(employees) {
    // Simplified table rendering
    console.log('[ui] Rendering table with', employees.length, 'employees');
}


