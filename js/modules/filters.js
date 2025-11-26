/**
 * Filters Module
 * Handles filtering logic for different views
 */

import { appState, setFilters } from '../core/state.js';
import { toggleHidden, createElement, clearNode } from '../utils/dom.js';

let elements = {};

/**
 * Initialize filters module
 * @param {Object} deps - Dependencies (elements)
 */
export function initFilters(deps) {
    elements = deps.elements;
    console.log('[filters] Filters module initialized');
}

/**
 * Apply filters
 * @param {Object} filters - Filter object {department, status}
 */
export function applyFilters(filters) {
    setFilters(filters);
    if (window.onFiltersChanged) {
        window.onFiltersChanged();
    }
}

/**
 * Reset all filters
 */
export function resetFilters() {
    setFilters({ department: "", status: "" });
    if (window.onFiltersChanged) {
        window.onFiltersChanged();
    }
}

/**
 * Get active filters
 * @returns {Object} Current filters
 */
export function getActiveFilters() {
    return { ...appState.filters };
}

/**
 * Render filters section
 * @param {Object} userDoc - User document
 * @param {string} tab - Current tab
 */
export function renderFilters(userDoc, tab) {
    if (!elements.filtersSection || !elements.filtersGrid) {
        return;
    }

    // Hide filters for My View
    if (tab === "My View") {
        toggleHidden(elements.filtersSection, true);
        return;
    }

    clearNode(elements.filtersGrid);

    // Department filter (for HR/Manager views)
    if (tab === "HR View" || tab === "Manager View") {
        const deptFilter = createDepartmentFilter();
        if (deptFilter) {
            elements.filtersGrid.appendChild(deptFilter);
        }
    }

    // Status filter
    const statusFilter = createStatusFilter();
    if (statusFilter) {
        elements.filtersGrid.appendChild(statusFilter);
    }

    toggleHidden(elements.filtersSection, false);
}

/**
 * Create department filter element
 * @returns {HTMLElement|null}
 */
function createDepartmentFilter() {
    const wrapper = createElement("div", "filter-item");
    const label = createElement("label", "filter-label", "Департамент:");
    const select = createElement("select", "filter-select");
    select.id = "filter-department";

    // Add "All" option
    const allOption = createElement("option", "", "Всі");
    allOption.value = "";
    select.appendChild(allOption);

    // Add department options (would come from appData.departments)
    if (window.appData && window.appData.departments) {
        window.appData.departments.forEach(dept => {
            const option = createElement("option", "", dept.name);
            option.value = dept.id;
            select.appendChild(option);
        });
    }

    select.value = appState.filters.department || "";
    select.addEventListener("change", (e) => {
        applyFilters({ ...appState.filters, department: e.target.value });
    });

    wrapper.appendChild(label);
    wrapper.appendChild(select);
    return wrapper;
}

/**
 * Create status filter element
 * @returns {HTMLElement|null}
 */
function createStatusFilter() {
    const wrapper = createElement("div", "filter-item");
    const label = createElement("label", "filter-label", "Статус:");
    const select = createElement("select", "filter-select");
    select.id = "filter-status";

    const statuses = ["", "У відпустці", "Заплановано", "На роботі"];
    statuses.forEach(status => {
        const option = createElement("option", "", status || "Всі");
        option.value = status;
        select.appendChild(option);
    });

    select.value = appState.filters.status || "";
    select.addEventListener("change", (e) => {
        applyFilters({ ...appState.filters, status: e.target.value });
    });

    wrapper.appendChild(label);
    wrapper.appendChild(select);
    return wrapper;
}
