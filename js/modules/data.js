/**
 * Data Management Module
 * Handles Firestore listeners and data normalization
 */

import { appState, appData, addListener, clearListeners } from '../core/state.js';
import { computeDays } from '../utils/formatters.js';

let db = null;
let elements = {};

/**
 * Initialize data module
 * @param {Object} deps - Dependencies (db, elements)
 */
export function initData(deps) {
    db = deps.db;
    elements = deps.elements;
    console.log('[data] Data module initialized');
}

/**
 * Setup realtime Firestore listeners
 */
export function setupRealtimeListeners() {
    clearListeners();

    // Departments listener
    const departmentsListener = db.collection("departments").onSnapshot(snapshot => {
        appData.departments = snapshot.docs.map(normalizeDepartmentDoc);
        if (window.onDataUpdated) {
            window.onDataUpdated('departments');
        }
    }, error => console.error("Помилка слухача departments:", error));
    addListener(departmentsListener);

    // Employees listener
    const employeesListener = db.collection("employees").onSnapshot(snapshot => {
        appData.employees = snapshot.docs.map(normalizeEmployeeDoc);
        syncCurrentUserFromDataset();
        if (window.onDataUpdated) {
            window.onDataUpdated('employees');
        }
    }, error => console.error("Помилка слухача employees:", error));
    addListener(employeesListener);

    // Vacation periods listener
    const vacationsListener = db.collection("vacation_periods").onSnapshot(snapshot => {
        appData.vacationPeriods = snapshot.docs.map(normalizeVacationDoc);
        if (window.onDataUpdated) {
            window.onDataUpdated('vacations');
        }
    }, error => console.error("Помилка слухача vacation_periods:", error));
    addListener(vacationsListener);

    console.log('[data] Realtime listeners set up');
}

/**
 * Normalize department document
 * @param {Object} doc - Firestore document
 * @returns {Object} Normalized department
 */
function normalizeDepartmentDoc(doc) {
    const data = doc.data() || {};
    return {
        id: doc.id,
        name: data.name || doc.id
    };
}

/**
 * Normalize employee document
 * @param {Object} doc - Firestore document
 * @returns {Object} Normalized employee
 */
function normalizeEmployeeDoc(doc) {
    const data = doc.data() || {};
    const roleFlags = normalizeRoleFlags(data.roleFlags || {});
    const rawAllocation = data.allocation || {};
    const allocation = {
        ...rawAllocation,
        totalAllocatedDays: typeof rawAllocation.totalAllocatedDays === "number" && Number.isFinite(rawAllocation.totalAllocatedDays)
            ? rawAllocation.totalAllocatedDays
            : null,
        updatedAt: rawAllocation.updatedAt ?? null
    };

    return {
        id: doc.id,
        fullName: data.full_name || `${data.name || ""} ${data.surname || ""}`.trim(),
        name: data.name || "",
        surname: data.surname || "",
        department: data.department || "",
        department_id: data.department_id || data.department || "",
        position: data.position || "",
        manager_id: data.manager_id || null,
        total_vacation_days: data.total_vacation_days ?? 0,
        used_vacation_days: data.used_vacation_days ?? 0,
        tax_id: data.tax_id || "",
        roleFlags,
        isHR: roleFlags.isHR,
        isManager: roleFlags.isManager,
        isHRHead: roleFlags.isHRHead,
        allocation,
        raw: data
    };
}

/**
 * Normalize vacation document
 * @param {Object} doc - Firestore document
 * @returns {Object} Normalized vacation
 */
function normalizeVacationDoc(doc) {
    const data = doc.data() || {};
    return {
        id: doc.id,
        employee_id: data.employee_id || "",
        start_date: data.start_date || "",
        end_date: data.end_date || "",
        days: data.days ?? computeDays(data.start_date, data.end_date),
        manager_id: data.manager_id || null,
        type: data.type || ""
    };
}

/**
 * Normalize role flags
 * @param {Object} flags - Role flags object
 * @returns {Object} Normalized flags
 */
function normalizeRoleFlags(flags) {
    return {
        isHR: Boolean(flags.isHR),
        isManager: Boolean(flags.isManager),
        isHRHead: Boolean(flags.isHRHead)
    };
}

/**
 * Sync current user from dataset
 */
function syncCurrentUserFromDataset() {
    if (!appState.currentUser) {
        return;
    }
    const updated = appData.employees.find(emp => emp.id === appState.currentUser.id);
    if (updated) {
        appState.currentUser = updated;
    }
}

/**
 * Enrich employee data with departments and vacations
 * @returns {Array} Enriched employees
 */
export function enrichEmployeeData() {
    const departmentLookup = {};
    appData.departments.forEach(dep => {
        departmentLookup[dep.id] = dep;
        departmentLookup[dep.name] = dep;
    });

    return appData.employees.map(employee => {
        const department = departmentLookup[employee.department_id] || departmentLookup[employee.department] || {};
        const periods = appData.vacationPeriods.filter(period => period.employee_id === employee.id);

        return {
            ...employee,
            departmentName: department.name || employee.department || "",
            vacationPeriods: periods,
            computedStatus: window.computeStatus ? window.computeStatus(periods) : "На роботі"
        };
    });
}

/**
 * Get employee by ID
 * @param {string} id - Employee ID
 * @returns {Object|null} Employee object
 */
export function getEmployeeById(id) {
    return appData.employees.find(emp => emp.id === id) || null;
}

/**
 * Get enriched employee by ID
 * @param {string} id - Employee ID
 * @returns {Object|null} Enriched employee object
 */
export function getEnrichedEmployeeById(id) {
    if (!id) {
        return null;
    }
    const enriched = enrichEmployeeData();
    return enriched.find(emp => emp.id === id) || null;
}

/**
 * Get manager's team (async, uses Cloud Function)
 * @param {string} managerId - Manager ID
 * @returns {Promise<Array>} Team employees
 */
export async function getManagerEmployees(managerId) {
    // This will call the Cloud Function getManagerTeam
    // For now, fallback to client-side BFS
    if (!managerId) {
        return [];
    }

    const stack = appData.employees.filter(emp => emp.manager_id === managerId).map(emp => emp.id);
    const visited = new Set();
    const team = [];

    while (stack.length) {
        const currentId = stack.pop();
        if (!currentId || visited.has(currentId)) {
            continue;
        }
        visited.add(currentId);
        const employee = getEmployeeById(currentId);
        if (employee) {
            team.push(employee);
            appData.employees
                .filter(emp => emp.manager_id === currentId)
                .forEach(child => stack.push(child.id));
        }
    }

    return team;
}

export {
    setupRealtimeListeners as setupListeners,
    clearListeners as teardownListeners
};
