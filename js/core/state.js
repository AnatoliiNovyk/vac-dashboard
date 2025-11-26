/**
 * Centralized State Management
 * All application state objects in one place
 */

/**
 * Main application state
 */
export const appState = {
    isInitialized: false,
    currentUser: null,
    currentTab: "My View",
    listeners: [],
    filters: {
        department: "",
        status: ""
    },
    myViewYear: "",
    myViewStatus: "",
    editingEmployeeId: null,
    calendarBaseDateIso: null,
    calendarMonthOffset: 0,
    basSyncMessages: [],
    authClaims: null,
    hasHrCustomClaim: false
};

/**
 * Application data (from Firestore)
 */
export const appData = {
    employees: [],
    departments: [],
    vacationPeriods: []
};

/**
 * BAS sync state
 */
export const basSyncState = {
    messages: []
};

/**
 * BAS export modal state
 */
export const basExportState = {
    isOpen: false,
    isBusy: false,
    formHydrated: false
};

/**
 * Vacation manager modal state
 */
export const modalState = {
    employeeId: null,
    employeeSnapshot: null,
    periods: [],
    originalPeriods: [],
    errors: new Map(),
    warnings: new Map(),
    hasOverlap: false,
    exceedsLimit: false,
    isDirty: false,
    isReadOnly: true,
    totalDays: 0,
    limitDays: 0,
    limitLabel: "",
    limitInputValue: "",
    limitOriginalValue: "",
    limitDirty: false,
    limitError: "",
    manualLimitOverride: false
};

/**
 * Employee info modal state
 */
export const infoModalState = {
    employeeId: null
};

/**
 * Modal success timer (for auto-close)
 */
export let modalSuccessTimer = null;

/**
 * Set modal success timer
 * @param {number|null} timer - Timer ID
 */
export function setModalSuccessTimer(timer) {
    modalSuccessTimer = timer;
}

/**
 * Get modal success timer
 * @returns {number|null}
 */
export function getModalSuccessTimer() {
    return modalSuccessTimer;
}

/**
 * Reset modal state to defaults
 */
export function resetModalState() {
    modalState.employeeId = null;
    modalState.employeeSnapshot = null;
    modalState.periods = [];
    modalState.originalPeriods = [];
    modalState.errors = new Map();
    modalState.warnings = new Map();
    modalState.hasOverlap = false;
    modalState.exceedsLimit = false;
    modalState.isDirty = false;
    modalState.isReadOnly = true;
    modalState.totalDays = 0;
    modalState.limitDays = 0;
    modalState.limitLabel = "";
    modalState.limitInputValue = "";
    modalState.limitOriginalValue = "";
    modalState.limitDirty = false;
    modalState.limitError = "";
    modalState.manualLimitOverride = false;
}

/**
 * Reset app state to defaults
 */
export function resetAppState() {
    appState.isInitialized = false;
    appState.currentUser = null;
    appState.currentTab = "My View";
    appState.listeners = [];
    appState.filters = { department: "", status: "" };
    appState.myViewYear = "";
    appState.myViewStatus = "";
    appState.editingEmployeeId = null;
    appState.calendarBaseDateIso = null;
    appState.calendarMonthOffset = 0;
    appState.basSyncMessages = [];
    appState.authClaims = null;
    appState.hasHrCustomClaim = false;
}

/**
 * Clear app data
 */
export function clearAppData() {
    appData.employees = [];
    appData.departments = [];
    appData.vacationPeriods = [];
}

/**
 * Update current user
 * @param {Object|null} user - User object
 */
export function setCurrentUser(user) {
    appState.currentUser = user;
}

/**
 * Update current tab
 * @param {string} tab - Tab name
 */
export function setCurrentTab(tab) {
    appState.currentTab = tab;
}

/**
 * Update filters
 * @param {Object} filters - Filter object
 */
export function setFilters(filters) {
    appState.filters = { ...appState.filters, ...filters };
}

/**
 * Add listener to cleanup list
 * @param {Function} unsubscribe - Firestore unsubscribe function
 */
export function addListener(unsubscribe) {
    appState.listeners.push(unsubscribe);
}

/**
 * Clear all listeners
 */
export function clearListeners() {
    appState.listeners.forEach(unsub => {
        try {
            unsub();
        } catch (error) {
            console.error("Error unsubscribing listener:", error);
        }
    });
    appState.listeners = [];
}
