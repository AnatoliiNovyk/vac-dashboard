/**
 * Main entry point for modular Vacation Dashboard
 */

// Import core modules
import { connectEmulatorsIfNeeded } from './core/config.js';
import { appState, appData } from './core/state.js';

// Import functional modules
import { initAuth, showDashboard, refreshAuthClaims } from './modules/auth.js';
import { initData, setupListeners, enrichEmployeeData, getEmployeeById, getEnrichedEmployeeById } from './modules/data.js';
import { initUI, renderMainContent, rerenderUI } from './modules/ui.js';
import { initCalendar, renderCalendar, navigateCalendar } from './modules/calendar.js';
import { initVacationManager, openModal as openVacationModal } from './modules/vacation-manager.js';
import { initBAS, appendBasLog, clearBasLog } from './modules/bas.js';
import { initFilters, applyFilters, resetFilters } from './modules/filters.js';
import { initEmployeeInfo, openEmployeeInfoModal, closeEmployeeInfoModal, refreshEmployeeInfoModal } from './modules/employee-info.js';

// Initialize Firebase
const firebaseConfig = window.firebaseConfig || {
    apiKey: "your-api-key",
    authDomain: "your-auth-domain",
    projectId: "your-project-id",
    storageBucket: "your-storage-bucket",
    messagingSenderId: "your-messaging-sender-id",
    appId: "your-app-id"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(app);
const auth = firebase.auth(app);
const functions = firebase.functions(app);

connectEmulatorsIfNeeded();

// Get DOM elements
const elements = {
    loginScreen: document.getElementById("login-screen"),
    loginForm: document.getElementById("login-form"),
    taxIdInput: document.getElementById("tax-id-input"),
    loginBtn: document.getElementById("login-btn"),
    loginError: document.getElementById("login-error"),
    dashboard: document.getElementById("dashboard-container"),
    logoutBtn: document.getElementById("logout-btn"),
    tabsNav: document.getElementById("tabs-nav"),
    currentUserName: document.getElementById("current-user-name"),
    currentUserRole: document.getElementById("current-user-role"),
    mainContent: document.getElementById("main-content"),
    tableBody: document.getElementById("table-body"),
    filtersSection: document.getElementById("filters-section"),
    filtersGrid: document.getElementById("filters-grid"),
    calendar: document.getElementById("calendar"),
    calendarControls: document.getElementById("calendar-controls"),
    calendarLegend: document.getElementById("calendar-legend"),
    vacationModal: document.getElementById("vacation-manager-modal"),
    vacationModalForm: document.getElementById("vacation-manager-form"),
    vacationModalClose: document.getElementById("vacation-manager-close"),
    vacationModalCancel: document.getElementById("vacation-manager-cancel"),
    vacationModalEmployeeName: document.getElementById("vacation-manager-employee-name"),
    vacationPeriodList: document.getElementById("vacation-period-list"),
    vacationPeriodAddBtn: document.getElementById("vacation-period-add"),
    vacationModalSave: document.getElementById("vacation-modal-save"),
    basImportBtn: document.getElementById("bas-import-button"),
    basExportBtn: document.getElementById("bas-export-button"),
    basImportFileInput: document.getElementById("bas-import-file"),
    basImportProgress: document.getElementById("bas-import-progress"),
    basImportProgressBar: document.getElementById("bas-import-progress-bar"),
    basImportProgressLabel: document.getElementById("bas-import-progress-label"),
    basSyncLog: document.getElementById("bas-sync-log"),
    employeeInfoModal: document.getElementById("employee-info-modal"),
    employeeInfoClose: document.getElementById("employee-info-close"),
    employeeInfoName: document.getElementById("employee-info-name"),
    employeeInfoTaxId: document.getElementById("employee-info-tax-id"),
    employeeInfoDepartment: document.getElementById("employee-info-department"),
    employeeInfoPosition: document.getElementById("employee-info-position"),
    employeeInfoManager: document.getElementById("employee-info-manager"),
    employeeInfoAccrued: document.getElementById("employee-info-accrued"),
    employeeInfoBalance: document.getElementById("employee-info-balance"),
    employeeInfoHistoryList: document.getElementById("employee-info-history-list"),
    employeeInfoHistoryEmpty: document.getElementById("employee-info-history-empty")
};

// Initialize modules
initAuth({ auth, functions, elements });
initData({ db, elements });
initUI({ elements });
initCalendar({ elements });
initVacationManager({ db, elements });
initBAS({ functions, elements });
initFilters({ elements });
initEmployeeInfo(elements, getEnrichedEmployeeById, window.computeStatus);

// Set up global callbacks for cross-module communication
window.onUserAuthenticated = async (user) => {
    console.log('[main] User authenticated, loading data...');

    try {
        // Refresh auth claims
        await refreshAuthClaims(user);

        // Load user document from Firestore
        const userDoc = await db.collection('employees').doc(user.uid).get({ source: 'server' });
        if (!userDoc.exists) {
            throw new Error('User document not found');
        }

        const userData = userDoc.data();
        console.log('[main] Raw userDoc.data():', userData);
        console.log('[main] Object keys:', Object.keys(userData));
        console.log('[main] Explicit isHR check:', userData.isHR, userDoc.get('isHR'));

        appState.currentUser = { id: userDoc.id, ...userData };
        console.log('[main] Current user loaded:', appState.currentUser);

        // Set up realtime listeners
        setupListeners();

        // Show dashboard and render UI
        showDashboard();
        await rerenderUI();
    } catch (error) {
        console.error('[main] Error loading user data:', error);
        throw error;
    }
};

window.onDataUpdated = (type) => {
    console.log('[main] Data updated:', type);
    rerenderUI();
};

window.onFiltersChanged = () => {
    console.log('[main] Filters changed');
    rerenderUI();
};

window.onCalendarNavigate = () => {
    console.log('[main] Calendar navigated');
    const employees = enrichEmployeeData();
    renderCalendar(employees);
};

// Expose functions for legacy compatibility and cross-module access
window.openVacationModal = openVacationModal;
window.openEmployeeInfoModal = openEmployeeInfoModal;
window.closeEmployeeInfoModal = closeEmployeeInfoModal;
window.refreshEmployeeInfoModal = refreshEmployeeInfoModal;
window.getEmployeeById = getEmployeeById;
window.getEnrichedEmployeeById = getEnrichedEmployeeById;
window.enrichEmployeeData = enrichEmployeeData;
window.appData = appData;
window.appState = appState;
window.db = db;
window.auth = auth;
window.functions = functions;

// Utility function for status computation (used by multiple modules)
window.computeStatus = (periods) => {
    if (!periods || periods.length === 0) {
        return "На роботі";
    }

    const today = new Date();
    const todayIso = today.toISOString().split('T')[0];

    for (const period of periods) {
        if (period.start_date <= todayIso && period.end_date >= todayIso) {
            return "У відпустці";
        }
    }

    const futurePeriods = periods.filter(p => p.start_date > todayIso);
    if (futurePeriods.length > 0) {
        return "Заплановано";
    }

    return "На роботі";
};

console.log('[main] Modular architecture initialized');
