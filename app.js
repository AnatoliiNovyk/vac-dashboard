(function () {
	"use strict";

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
	const FEATURE_FLAGS = {
		BAS_SYNC_ENABLED: typeof window?.FEATURES?.BAS_SYNC_ENABLED === "boolean"
			? Boolean(window.FEATURES.BAS_SYNC_ENABLED)
			: true
	};

	connectEmulatorsIfNeeded();

	const loginGuard = {
		attempts: [],
		registerAttempt() {
			const now = Date.now();
			this.attempts.push(now);
			this.attempts = this.attempts.filter(ts => now - ts < 60000);
			return this.attempts.length;
		}
	};

	const appState = {
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
		basSyncMessages: []
	};

	const basSyncState = {
		messages: []
	};

	const modalState = {
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

	const infoModalState = {
		employeeId: null
	};

	let modalSuccessTimer = null;

	const PAST_STATUS_LABEL = "Минулі відпустки";
	const MY_VIEW_STATUS_OPTIONS = ["Заплановано", PAST_STATUS_LABEL];

	const appData = {
		employees: [],
		departments: [],
		vacationPeriods: []
	};

	const elements = {
		loginScreen: document.getElementById("login-screen"),
		loginForm: document.getElementById("login-form"),
		taxIdInput: document.getElementById("tax-id-input"),
		loginBtn: document.getElementById("login-btn"),
		loginError: document.getElementById("login-error"),
		dashboard: document.getElementById("dashboard-container"),
		currentUserName: document.getElementById("current-user-name"),
		currentUserRole: document.getElementById("current-user-role"),
		logoutBtn: document.getElementById("logout-btn"),
		statsGrid: document.getElementById("stats-grid"),
		tabsNav: document.getElementById("tabs-nav"),
		filtersSection: document.getElementById("filters-section"),
		filtersGrid: document.getElementById("filters-grid"),
		calendarSection: document.getElementById("calendar-section"),
		calendarControls: document.getElementById("calendar-controls"),
		calendar: document.getElementById("vacation-calendar"),
		calendarLegend: document.getElementById("calendar-legend"),
		tableSection: document.getElementById("table-section"),
		tableTitle: document.getElementById("table-title"),
		tableHead: document.getElementById("table-head"),
		tableBody: document.getElementById("table-body"),
		basActions: document.getElementById("bas-actions"),
		basImportBtn: document.getElementById("bas-import-button"),
		basExportBtn: document.getElementById("bas-export-button"),
		basSyncLog: document.getElementById("bas-sync-log"),
		myViewControls: document.getElementById("my-view-controls"),
		myViewYearFilter: document.getElementById("my-view-year-filter"),
		myViewStatusFilter: document.getElementById("my-view-status-filter"),
		myViewResetFilters: document.getElementById("my-view-reset-filters"),
		vacationModal: document.getElementById("vacation-manager-modal"),
		vacationModalClose: document.getElementById("vacation-manager-close"),
		vacationModalForm: document.getElementById("vacation-manager-form"),
		vacationModalEmployeeName: document.getElementById("vacation-manager-employee-name"),
		vacationModalEmployeeSelect: document.getElementById("vacation-manager-employee-select"),
		vacationPeriodList: document.getElementById("vacation-periods-list"),
		vacationPeriodsEmpty: document.getElementById("vacation-periods-empty"),
		vacationPeriodAddBtn: document.getElementById("vacation-period-add"),
		vacationPeriodsTotal: document.getElementById("vacation-periods-total"),
		vacationPeriodsLimit: document.getElementById("vacation-periods-limit"),
		vacationLimitInput: document.getElementById("vacation-limit-input"),
		vacationLimitError: document.getElementById("vacation-limit-error"),
		vacationModalError: document.getElementById("vacation-modal-error"),
		vacationModalWarning: document.getElementById("vacation-modal-warning"),
		vacationModalSuccess: document.getElementById("vacation-modal-success"),
		vacationModalSave: document.getElementById("vacation-modal-save"),
		vacationModalCancel: document.getElementById("vacation-modal-cancel"),
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

	function connectEmulatorsIfNeeded() {
		const host = window.location.hostname;
		const localHosts = ["localhost", "127.0.0.1", "0.0.0.0"];
		if (!localHosts.includes(host)) {
			return;
		}
		try {
			auth.useEmulator("http://localhost:9099");
		} catch (error) {
			// auth emulator already connected
		}
		try {
			db.useEmulator("localhost", 8085);
		} catch (error) {
			// firestore emulator already connected
		}
		try {
			functions.useEmulator("localhost", 5001);
		} catch (error) {
			// functions emulator already connected
		}
	}

	function normalizeText(value) {
		return String(value || "").trim();
	}

	function formatDate(date) {
		if (!date) {
			return "";
		}
		const value = date instanceof Date ? date : new Date(date);
		if (Number.isNaN(value.getTime())) {
			return "";
		}
		return value.toISOString().split("T")[0];
	}
	function formatRange(start, end) {
		if (!start || !end) {
			return "";
		}
		if (start === end) {
			return start;
		}
		return `${start} — ${end}`;
	}

	function computeDays(start, end) {
		if (!start || !end) {
			return 0;
		}
		const startDate = new Date(start);
		const endDate = new Date(end);
		if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
			return 0;
		}
		const diff = Math.abs(endDate - startDate);
		return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
	}

	function periodIntersectsYear(period, year) {
		if (!period || !period.start_date || !period.end_date || !Number.isFinite(year)) {
			return false;
		}
		const startDate = parseIsoDateToUtc(period.start_date);
		const endDate = parseIsoDateToUtc(period.end_date);
		if (!startDate || !endDate) {
			return false;
		}
		const yearStart = createUtcDate(year, 0, 1);
		const yearEnd = createUtcDate(year, 11, 31);
		return startDate <= yearEnd && endDate >= yearStart;
	}

	function getYearsFromPeriods(periods) {
		if (!Array.isArray(periods)) {
			return [];
		}
		const set = new Set();
		periods.forEach(period => {
			const startDate = parseIsoDateToUtc(period?.start_date);
			const endDate = parseIsoDateToUtc(period?.end_date);
			if (startDate) {
				set.add(startDate.getUTCFullYear());
			}
			if (endDate) {
				set.add(endDate.getUTCFullYear());
			}
		});
		return Array.from(set).filter(Number.isFinite).sort((a, b) => b - a);
	}

	function getMyViewPeriodStatus(period, todayIso = formatDate(new Date())) {
		if (!period || !period.start_date || !period.end_date) {
			return "";
		}
		const startIso = formatDate(period.start_date);
		const endIso = formatDate(period.end_date);
		if (!startIso || !endIso) {
			return "";
		}
		if (endIso < todayIso) {
			return PAST_STATUS_LABEL;
		}
		if (startIso <= todayIso && endIso >= todayIso) {
			return "У відпустці";
		}
		if (startIso > todayIso) {
			return "Заплановано";
		}
		return PAST_STATUS_LABEL;
	}

	function createUtcDate(year, monthIndex, day) {
		return new Date(Date.UTC(year, monthIndex, day));
	}

	function addMonthsUtc(date, months) {
		const result = createUtcDate(date.getUTCFullYear(), date.getUTCMonth(), 1);
		result.setUTCMonth(result.getUTCMonth() + months);
		return result;
	}

	function addDaysUtc(date, days) {
		const result = new Date(date.getTime());
		result.setUTCDate(result.getUTCDate() + days);
		return result;
	}

	function startOfMonthUtc(date) {
		return createUtcDate(date.getUTCFullYear(), date.getUTCMonth(), 1);
	}

	function startOfWeekMondayUtc(date) {
		const weekday = date.getUTCDay();
		const offset = (weekday + 6) % 7; // convert Sunday-first to Monday-first
		return addDaysUtc(date, -offset);
	}

	function formatMonthLabel(date) {
		const formatter = new Intl.DateTimeFormat("uk-UA", {
			month: "long",
			year: "numeric"
		});
		return formatter.format(date);
	}

	function parseIsoDateToUtc(iso) {
		if (typeof iso !== "string" || iso.length < 10) {
			return null;
		}
		const [yearStr, monthStr, dayStr] = iso.split("-");
		const year = Number(yearStr);
		const monthIndex = Number(monthStr) - 1;
		const day = Number(dayStr);
		if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) {
			return null;
		}
		return createUtcDate(year, monthIndex, day);
	}

	function formatDateHuman(date) {
		if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
			return "";
		}
		const day = String(date.getDate()).padStart(2, "0");
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const year = date.getFullYear();
		return `${day}.${month}.${year}`;
	}

	// Normalizes Firestore timestamps, ISO strings, or epoch numbers to Date.
	function parseTimestampToDate(value) {
		if (!value) {
			return null;
		}
		if (value instanceof Date) {
			return Number.isNaN(value.getTime()) ? null : value;
		}
		if (typeof value === "number") {
			const date = new Date(value);
			return Number.isNaN(date.getTime()) ? null : date;
		}
		if (typeof value === "string") {
			const date = new Date(value);
			return Number.isNaN(date.getTime()) ? null : date;
		}
		if (typeof value.toDate === "function") {
			const date = value.toDate();
			return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
		}
		if (typeof value.seconds === "number") {
			const milliseconds = value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
			const date = new Date(milliseconds);
			return Number.isNaN(date.getTime()) ? null : date;
		}
		return null;
	}

	function getAllocationInfo(allocation) {
		const total = typeof allocation?.totalAllocatedDays === "number" && Number.isFinite(allocation.totalAllocatedDays)
			? allocation.totalAllocatedDays
			: null;
		const display = total !== null ? String(total) : "—";
		const updatedAtDate = parseTimestampToDate(allocation?.updatedAt);
		if (!updatedAtDate) {
			return { display, tooltip: "" };
		}
		const tooltipParts = [`оновлено: ${formatDateHuman(updatedAtDate)}`];
		const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
		if (Date.now() - updatedAtDate.getTime() > thirtyDaysMs) {
			tooltipParts.push("дані можуть бути застарілими");
		}
		return { display, tooltip: tooltipParts.join(". ") };
	}

	function computeStatus(periods, today = new Date()) {
		if (!Array.isArray(periods) || periods.length === 0) {
			return "На роботі";
		}
		const todayIso = formatDate(today);
		let hasOngoing = false;
		let hasUpcoming = false;
		periods.forEach(period => {
			if (!period || !period.start_date || !period.end_date) {
				return;
			}
			if (period.start_date <= todayIso && period.end_date >= todayIso) {
				hasOngoing = true;
			} else if (period.start_date > todayIso) {
				hasUpcoming = true;
			}
		});
		if (hasOngoing) {
			return "У відпустці";
		}
		if (hasUpcoming) {
			return "Заплановано";
		}
		return "На роботі";
	}

	function isCurrentVacation(period) {
		if (!period) {
			return false;
		}
		const todayIso = formatDate(new Date());
		return period.start_date <= todayIso && period.end_date >= todayIso;
	}

	function clearNode(node) {
		if (!node) {
			return;
		}
		while (node.firstChild) {
			node.removeChild(node.firstChild);
		}
	}

	function createElement(tag, className, textContent) {
		const el = document.createElement(tag);
		if (className) {
			el.className = className;
		}
		if (typeof textContent === "string") {
			el.textContent = textContent;
		}
		return el;
	}

	function normalizeStatusKey(value) {
		return typeof value === "string" ? value.trim().toLowerCase() : "";
	}

	const STATUS_BADGE_VARIANTS = {
		current: {
			className: "status-badge--current",
			matches: ["у відпустці", "відпустка", "active", "approved"]
		},
		planned: {
			className: "status-badge--planned",
			matches: ["заплановано", "запланована", "scheduled", "planned"]
		},
		past: {
			className: "status-badge--past",
			matches: [normalizeStatusKey(PAST_STATUS_LABEL), "минулі", "минулі відпустки", "past"]
		},
		work: {
			className: "status-badge--work",
			matches: ["на роботі", "at work", "working", "work"]
		},
		pending: {
			className: "status-badge--pending",
			matches: ["в очікуванні", "очікує", "pending", "очікування", "awaiting"]
		},
		rejected: {
			className: "status-badge--rejected",
			matches: ["відхилено", "rejected", "відхилена", "declined", "denied"]
		},
		cancelled: {
			className: "status-badge--cancelled",
			matches: ["скасовано", "скасована", "cancelled", "canceled", "скасовано hr"]
		},
		default: {
			className: "status-badge--default",
			matches: []
		}
	};

	const STATUS_BADGE_LOOKUP = new Map();
	Object.entries(STATUS_BADGE_VARIANTS).forEach(([key, variant]) => {
		if (!Array.isArray(variant.matches)) {
			return;
		}
		variant.matches.forEach(match => {
			const normalized = normalizeStatusKey(match);
			if (normalized && !STATUS_BADGE_LOOKUP.has(normalized)) {
				STATUS_BADGE_LOOKUP.set(normalized, key);
			}
		});
	});

	function getStatusBadgeKey(statusLabel) {
		const normalized = normalizeStatusKey(statusLabel);
		if (!normalized) {
			return "default";
		}
		return STATUS_BADGE_LOOKUP.get(normalized) || "default";
	}

	function createStatusBadge(statusLabel) {
		const label = typeof statusLabel === "string" && statusLabel.trim().length > 0 ? statusLabel.trim() : "—";
		const key = getStatusBadgeKey(label);
		const variant = STATUS_BADGE_VARIANTS[key] || STATUS_BADGE_VARIANTS.default;
		const badge = createElement("span", `status-badge ${variant.className}`, label);
		badge.dataset.statusKey = key;
		return badge;
	}

	function toggleHidden(element, hidden) {
		if (!element) {
			return;
		}
		element.classList.toggle("hidden", hidden);
	}

	function isBasSyncEnabled() {
		return Boolean(FEATURE_FLAGS.BAS_SYNC_ENABLED);
	}

	function canCurrentUserSyncBas(userDoc) {
		return Boolean(userDoc?.isHR || userDoc?.isHRHead);
	}

	function formatBasLogTimestamp(date) {
		if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
			return "";
		}
		return date.toLocaleString("uk-UA", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		});
	}

	function clearBasLog() {
		basSyncState.messages = [];
		appState.basSyncMessages = [];
		if (!elements.basSyncLog) {
			return;
		}
		clearNode(elements.basSyncLog);
		toggleHidden(elements.basSyncLog, true);
	}

	function appendBasLog(type, message) {
		if (!elements.basSyncLog || !message) {
			return;
		}
		const entry = {
			type: typeof type === "string" ? type : "info",
			message: message.trim(),
			timestamp: new Date()
		};
		basSyncState.messages.push(entry);
		if (basSyncState.messages.length > 100) {
			basSyncState.messages.shift();
		}
		appState.basSyncMessages = basSyncState.messages.slice();
		const iconMap = {
			info: "fas fa-info-circle",
			success: "fas fa-check-circle",
			error: "fas fa-times-circle",
			warning: "fas fa-exclamation-triangle"
		};
		const badgeClass = `bas-actions__log-entry bas-actions__log-entry--${entry.type}`;
		const row = createElement("div", badgeClass);
		const iconWrapper = createElement("span", "bas-actions__log-icon");
		iconWrapper.innerHTML = `<i class="${iconMap[entry.type] || iconMap.info}"></i>`;
		const messageWrapper = createElement("div", "bas-actions__log-message");
		messageWrapper.textContent = entry.message;
		const timestampNode = createElement("span", "bas-actions__log-timestamp", formatBasLogTimestamp(entry.timestamp));
		messageWrapper.appendChild(timestampNode);
		row.appendChild(iconWrapper);
		row.appendChild(messageWrapper);
		elements.basSyncLog.appendChild(row);
		elements.basSyncLog.scrollTop = elements.basSyncLog.scrollHeight;
		toggleHidden(elements.basSyncLog, false);
	}

	function handleBasImportClick() {
		appendBasLog("info", "Імпорт BAS наразі в процесі налаштування. Продовжуйте роботу, а оновлення з'являться найближчим часом.");
	}

	function handleBasExportClick() {
		appendBasLog("info", "Експорт BAS буде доступний після завершення конфігурації. Дякуємо за терпіння.");
	}

	function ensureBasActionsBindings() {
		if (!elements.basActions || elements.basActions.dataset.bound === "true") {
			return;
		}
		if (elements.basImportBtn) {
			elements.basImportBtn.addEventListener("click", handleBasImportClick);
		}
		if (elements.basExportBtn) {
			elements.basExportBtn.addEventListener("click", handleBasExportClick);
		}
		elements.basActions.dataset.bound = "true";
	}

	function renderBasActions(userDoc, currentTab) {
		if (!elements.basActions) {
			return;
		}
		const visible = currentTab === "HR View" && canCurrentUserSyncBas(userDoc) && isBasSyncEnabled();
		toggleHidden(elements.basActions, !visible);
		elements.basActions.setAttribute("aria-hidden", visible ? "false" : "true");
		if (elements.basImportBtn) {
			elements.basImportBtn.disabled = !visible;
		}
		if (elements.basExportBtn) {
			elements.basExportBtn.disabled = !visible;
		}
		if (!visible) {
			clearBasLog();
			return;
		}
		ensureBasActionsBindings();
	}

	function getLocalStorageSafe() {
		try {
			return window.localStorage;
		} catch (error) {
			console.warn("LocalStorage недоступний:", error);
			return null;
		}
	}

	function getMyViewYearStorageKey(userId) {
		return userId ? `myViewYear:${userId}` : "";
	}

	function sanitizeYearValue(value) {
		if (typeof value === "number" && Number.isFinite(value)) {
			return value >= 0 ? String(Math.trunc(value)) : "";
		}
		const candidate = typeof value === "string" ? value.trim() : "";
		return /^\d{4}$/.test(candidate) ? candidate : "";
	}

	function loadMyViewYearPreference(userId) {
		const key = getMyViewYearStorageKey(userId);
		if (!key) {
			return "";
		}
		const storage = getLocalStorageSafe();
		if (!storage) {
			return "";
		}
		const rawValue = storage.getItem(key);
		return sanitizeYearValue(rawValue);
	}

	function persistMyViewYearPreference(userId, value) {
		const key = getMyViewYearStorageKey(userId);
		if (!key) {
			return;
		}
		const storage = getLocalStorageSafe();
		if (!storage) {
			return;
		}
		const sanitized = sanitizeYearValue(value);
		if (sanitized) {
			storage.setItem(key, sanitized);
		} else {
			storage.removeItem(key);
		}
	}

	function loadMyViewYearFromUrl() {
		try {
			const url = new URL(window.location.href);
			const value = url.searchParams.get("myViewYear");
			return sanitizeYearValue(value);
		} catch (error) {
			console.warn("Не вдалося прочитати параметр myViewYear з URL:", error);
			return "";
		}
	}

	function persistMyViewYearToUrl(value) {
		try {
			const sanitized = sanitizeYearValue(value);
			const url = new URL(window.location.href);
			if (sanitized) {
				url.searchParams.set("myViewYear", sanitized);
			} else {
				url.searchParams.delete("myViewYear");
			}
			const newUrl = `${url.pathname}${url.search}${url.hash}`;
			window.history.replaceState({}, "", newUrl);
		} catch (error) {
			console.warn("Не вдалося оновити параметр myViewYear у URL:", error);
		}
	}

	function applyMyViewYearSelection(rawValue, { shouldRerender = true } = {}) {
		const sanitized = sanitizeYearValue(rawValue);
		const currentUser = appState.currentUser;
		appState.myViewYear = sanitized;
		if (currentUser) {
			persistMyViewYearPreference(currentUser.id, sanitized);
		}
		persistMyViewYearToUrl(sanitized);
		appState.calendarMonthOffset = 0;
		appState.calendarBaseDateIso = null;
		if (shouldRerender && currentUser) {
			renderMyView(currentUser);
		}
		return sanitized;
	}

	function sanitizeMyViewStatus(value) {
		if (typeof value !== "string") {
			return "";
		}
		const trimmed = value.trim();
		return MY_VIEW_STATUS_OPTIONS.includes(trimmed) ? trimmed : "";
	}

	function getMyViewStatusStorageKey(userId) {
		return userId ? `myViewStatus:${userId}` : "";
	}

	function loadMyViewStatusPreference(userId) {
		const key = getMyViewStatusStorageKey(userId);
		if (!key) {
			return "";
		}
		const storage = getLocalStorageSafe();
		if (!storage) {
			return "";
		}
		const rawValue = storage.getItem(key);
		return sanitizeMyViewStatus(rawValue || "");
	}

	function persistMyViewStatusPreference(userId, value) {
		const key = getMyViewStatusStorageKey(userId);
		if (!key) {
			return;
		}
		const storage = getLocalStorageSafe();
		if (!storage) {
			return;
		}
		const sanitized = sanitizeMyViewStatus(value || "");
		if (sanitized) {
			storage.setItem(key, sanitized);
		} else {
			storage.removeItem(key);
		}
	}

	function loadMyViewStatusFromUrl() {
		try {
			const url = new URL(window.location.href);
			return sanitizeMyViewStatus(url.searchParams.get("myViewStatus") || "");
		} catch (error) {
			console.warn("Не вдалося прочитати параметр myViewStatus з URL:", error);
			return "";
		}
	}

	function persistMyViewStatusToUrl(value) {
		try {
			const sanitized = sanitizeMyViewStatus(value || "");
			const url = new URL(window.location.href);
			if (sanitized) {
				url.searchParams.set("myViewStatus", sanitized);
			} else {
				url.searchParams.delete("myViewStatus");
			}
			const newUrl = `${url.pathname}${url.search}${url.hash}`;
			window.history.replaceState({}, "", newUrl);
		} catch (error) {
			console.warn("Не вдалося оновити параметр myViewStatus у URL:", error);
		}
	}

	function applyMyViewStatusSelection(rawValue, { shouldRerender = true } = {}) {
		const sanitized = sanitizeMyViewStatus(rawValue || "");
		const currentUser = appState.currentUser;
		appState.myViewStatus = sanitized;
		if (currentUser) {
			persistMyViewStatusPreference(currentUser.id, sanitized);
		}
		persistMyViewStatusToUrl(sanitized);
		appState.calendarMonthOffset = 0;
		appState.calendarBaseDateIso = null;
		if (shouldRerender && currentUser) {
			renderMyView(currentUser);
		}
		return sanitized;
	}

	function resetMyViewFilters() {
		const currentUser = appState.currentUser;
		appState.myViewYear = "";
		appState.myViewStatus = "";
		const userId = currentUser?.id;
		if (userId) {
			persistMyViewYearPreference(userId, "");
			persistMyViewStatusPreference(userId, "");
		}
		persistMyViewYearToUrl("");
		persistMyViewStatusToUrl("");
		appState.calendarMonthOffset = 0;
		appState.calendarBaseDateIso = null;
		if (currentUser) {
			renderMyView(currentUser);
		}
	}

	function hideModalSuccess() {
		if (modalSuccessTimer) {
			clearTimeout(modalSuccessTimer);
			modalSuccessTimer = null;
		}
		if (!elements.vacationModalSuccess) {
			return;
		}
		elements.vacationModalSuccess.textContent = "";
		toggleHidden(elements.vacationModalSuccess, true);
	}

	function showModalSuccess(message) {
		if (!elements.vacationModalSuccess) {
			return;
		}
		elements.vacationModalSuccess.textContent = message;
		toggleHidden(elements.vacationModalSuccess, false);
		if (modalSuccessTimer) {
			clearTimeout(modalSuccessTimer);
		}
		modalSuccessTimer = window.setTimeout(() => {
			if (!modalState.isDirty) {
				hideModalSuccess();
			}
		}, 4000);
	}

	function isHrUser(userDoc) {
		return Boolean(userDoc && (userDoc.isHR || userDoc.isHRHead));
	}

	function resetModalState() {
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
		hideModalSuccess();
		if (elements.vacationLimitInput) {
			elements.vacationLimitInput.value = "";
		}
		if (elements.vacationLimitError) {
			elements.vacationLimitError.textContent = "";
			toggleHidden(elements.vacationLimitError, true);
		}
	}

	function generateTempId() {
		return `temp-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
	}

	function clonePeriodForModal(source) {
		const startDate = formatDate(source.start_date || source.startDate || "");
		const endDate = formatDate(source.end_date || source.endDate || "");
		const id = source.id || source.refId || generateTempId();
		return {
			id,
			refId: source.id || source.refId || (id.startsWith("temp-") ? null : id),
			startDate,
			endDate
		};
	}

	function sortModalPeriods(periods) {
		periods.sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));
	}

	function getEmployeeLimitValue(employee) {
		const allocationValue = Number(employee?.allocation?.totalAllocatedDays);
		if (Number.isFinite(allocationValue) && allocationValue >= 0) {
			return allocationValue;
		}
		const totalValue = Number(employee?.total_vacation_days);
		if (Number.isFinite(totalValue) && totalValue >= 0) {
			return totalValue;
		}
		return null;
	}

	function updateModalLimitInfo(employee) {
		const usedDays = Number(employee?.used_vacation_days || 0);
		const limitValue = Number.isFinite(modalState.limitDays) ? modalState.limitDays : 0;
		const remaining = limitValue > 0 ? Math.max(limitValue - modalState.totalDays, 0) : 0;
		const manualNote = modalState.manualLimitOverride || employee?.allocation?.manualOverride
			? "встановлено вручну HR"
			: employee?.allocation?.source
				? `імпортовано з ${employee.allocation.source}`
				: "";
		if (limitValue > 0) {
			const note = manualNote ? ` — ${manualNote}` : "";
			modalState.limitLabel = `Ліміт: ${limitValue} дн. (залишилось ${remaining} дн., використано ${usedDays} дн.)${note}`;
		} else {
			const note = manualNote ? ` — ${manualNote}` : "";
			modalState.limitLabel = `Ліміт: не задано${note}`;
		}
	}

	function validateModalPeriods(periods) {
		const errors = new Map();
		const warnings = new Map();
		const sorted = periods.slice().sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));
		let hasOverlap = false;
		let totalDays = 0;

		const push = (map, periodId, message) => {
			if (!periodId || !message) {
				return;
			}
			const messages = map.get(periodId) || [];
			if (!messages.includes(message)) {
				messages.push(message);
				map.set(periodId, messages);
			}
		};

		sorted.forEach((period, index) => {
			if (!period.startDate) {
				push(errors, period.id, "Заповніть дату початку.");
			}
			if (!period.endDate) {
				push(errors, period.id, "Заповніть дату завершення.");
			}
			if (period.startDate && period.endDate) {
				if (period.startDate > period.endDate) {
					push(errors, period.id, "Дата завершення не може бути раніше початку.");
				} else {
					totalDays += computeDays(period.startDate, period.endDate);
				}
			}
			if (index > 0) {
				const prev = sorted[index - 1];
				if (period.startDate && period.endDate && prev.startDate && prev.endDate && period.startDate <= prev.endDate) {
					hasOverlap = true;
					const overlapMessage = "Період перетинається з іншим записом.";
					push(warnings, period.id, overlapMessage);
					push(warnings, prev.id, overlapMessage);
				}
			}
		});

		return { errors, warnings, hasOverlap, totalDays };
	}

	function arePeriodsEqual(current, original) {
		if (current.length !== original.length) {
			return false;
		}
		const serialize = period => {
			const baseId = period.refId || period.id;
			return `${baseId}|${period.startDate || ""}|${period.endDate || ""}`;
		};
		const a = current.slice().map(serialize).sort();
		const b = original.slice().map(serialize).sort();
		return a.every((value, index) => value === b[index]);
	}

	function calculateModalState() {
		const validation = validateModalPeriods(modalState.periods);
		modalState.errors = validation.errors;
		modalState.warnings = validation.warnings;
		modalState.hasOverlap = validation.hasOverlap;
		modalState.totalDays = validation.totalDays;
		modalState.exceedsLimit = modalState.limitDays > 0 && modalState.totalDays > modalState.limitDays;
		const periodsDirty = !arePeriodsEqual(modalState.periods, modalState.originalPeriods);
		modalState.isDirty = periodsDirty || modalState.limitDirty;
	}

	function renderEmployeeSelector(userDoc) {
		const select = elements.vacationModalEmployeeSelect;
		const nameNode = elements.vacationModalEmployeeName;
		const employee = getActiveModalEmployee();
		if (select) {
			clearNode(select);
		}
		if (nameNode) {
			nameNode.textContent = employee?.fullName || employee?.name || "—";
		}
		if (!select || !userDoc) {
			return;
		}
		const isHr = isHrUser(userDoc);
		if (!isHr) {
			select.disabled = true;
			toggleHidden(select, true);
			return;
		}
		select.disabled = false;
		toggleHidden(select, false);
		const employees = appData.employees.slice().sort((a, b) => {
			const nameA = a.fullName || `${a.name || ""} ${a.surname || ""}`.trim();
			const nameB = b.fullName || `${b.name || ""} ${b.surname || ""}`.trim();
			return nameA.localeCompare(nameB);
		});
		employees.forEach(emp => {
			const option = document.createElement("option");
			option.value = emp.id;
			option.textContent = emp.fullName || `${emp.name || ""} ${emp.surname || ""}`.trim() || emp.id;
			option.selected = emp.id === modalState.employeeId;
			select.appendChild(option);
		});
	}

	function renderModalPeriods() {
		if (!elements.vacationPeriodList) {
			return;
		}
		clearNode(elements.vacationPeriodList);
		const hasPeriods = modalState.periods.length > 0;
		toggleHidden(elements.vacationPeriodsEmpty, hasPeriods);
		if (!hasPeriods) {
			return;
		}
		modalState.periods.forEach(period => {
			const row = createElement("div", "vacation-period-row");
			row.dataset.periodId = period.id;

			const inputsWrapper = createElement("div", "vacation-period-row-inputs");
			const startField = createElement("div", "vacation-period-field");
			const startLabel = createElement("label", "form-label", "Початок");
			const startInput = createElement("input", "form-control vacation-period-input");
			startInput.type = "date";
			startInput.value = period.startDate || "";
			startInput.dataset.periodId = period.id;
			startInput.dataset.field = "startDate";
			startInput.disabled = modalState.isReadOnly;
			startField.appendChild(startLabel);
			startField.appendChild(startInput);

			const endField = createElement("div", "vacation-period-field");
			const endLabel = createElement("label", "form-label", "Завершення");
			const endInput = createElement("input", "form-control vacation-period-input");
			endInput.type = "date";
			endInput.value = period.endDate || "";
			endInput.dataset.periodId = period.id;
			endInput.dataset.field = "endDate";
			endInput.disabled = modalState.isReadOnly;
			endField.appendChild(endLabel);
			endField.appendChild(endInput);

			inputsWrapper.appendChild(startField);
			inputsWrapper.appendChild(endField);
			row.appendChild(inputsWrapper);

			const days = period.startDate && period.endDate ? computeDays(period.startDate, period.endDate) : 0;
			row.appendChild(createElement("div", "vacation-period-days", `Днів: ${days}`));

			const actionsWrapper = createElement("div", "vacation-period-actions");
			if (!modalState.isReadOnly) {
				const deleteBtn = createElement("button", "btn btn--danger btn--small");
				deleteBtn.type = "button";
				deleteBtn.dataset.action = "delete";
				deleteBtn.dataset.periodId = period.id;
				deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
				actionsWrapper.appendChild(deleteBtn);
			}
			row.appendChild(actionsWrapper);

			const rowErrors = modalState.errors.get(period.id) || [];
			const rowWarnings = modalState.warnings.get(period.id) || [];
			const rowMessages = [...rowErrors, ...rowWarnings];
			if (rowMessages.length > 0) {
				row.classList.add("vacation-period-row--error");
				const errorBlock = createElement("div", "vacation-period-row-error");
				errorBlock.innerHTML = rowMessages.map(message => `<span>${message}</span>`).join("<br>");
				row.appendChild(errorBlock);
			}
			elements.vacationPeriodList.appendChild(row);
		});
	}

	function updateModalSummary() {
		if (elements.vacationPeriodsTotal) {
			elements.vacationPeriodsTotal.textContent = `Сумарно: ${modalState.totalDays} дн.`;
		}
		if (elements.vacationLimitInput) {
			const input = elements.vacationLimitInput;
			if (input.value !== modalState.limitInputValue) {
				input.value = modalState.limitInputValue;
			}
			input.disabled = modalState.isReadOnly;
			input.readOnly = modalState.isReadOnly;
			input.setAttribute("aria-disabled", modalState.isReadOnly ? "true" : "false");
			input.setAttribute("aria-invalid", modalState.limitError ? "true" : "false");
			input.classList.toggle("form-control--error", Boolean(modalState.limitError));
			input.classList.toggle("vacation-limit-input--exceeded", Boolean(modalState.exceedsLimit && modalState.limitDays > 0));
			if (modalState.isReadOnly) {
				input.title = "Редагування доступне лише HR";
			} else {
				input.removeAttribute("title");
			}
		}
		if (elements.vacationLimitError) {
			if (modalState.limitError) {
				elements.vacationLimitError.textContent = modalState.limitError;
				toggleHidden(elements.vacationLimitError, false);
			} else {
				elements.vacationLimitError.textContent = "";
				toggleHidden(elements.vacationLimitError, true);
			}
		}
		if (elements.vacationPeriodsLimit) {
			elements.vacationPeriodsLimit.textContent = modalState.limitLabel || "";
			elements.vacationPeriodsLimit.classList.toggle("vacation-periods-limit--exceeded", Boolean(modalState.exceedsLimit && modalState.limitDays > 0));
		}
		if (elements.vacationPeriodAddBtn) {
			elements.vacationPeriodAddBtn.disabled = modalState.isReadOnly;
			toggleHidden(elements.vacationPeriodAddBtn, modalState.isReadOnly);
		}
	}

	function renderModalWarnings() {
		const errorMessages = [];
		const warningMessages = [];
		const isHr = isHrUser(appState.currentUser);

		if (modalState.errors.size > 0) {
			errorMessages.push("Перевірте періоди перед збереженням.");
		}
		if (modalState.limitError) {
			errorMessages.push(modalState.limitError);
		}
		if (modalState.hasOverlap) {
			if (isHr) {
				warningMessages.push("Виявлено перетини між періодами. Підтвердьте збереження, якщо це очікувано.");
			} else {
				errorMessages.push("Періоди не повинні перетинатися між собою.");
			}
		}
		if (modalState.exceedsLimit && modalState.limitDays > 0) {
			if (isHr) {
				warningMessages.push("Перевищено ліміт днів відпустки. Підтвердьте, щоб зберегти.");
			} else {
				errorMessages.push("Перевищено доступний ліміт днів.");
			}
		}

		if (elements.vacationModalError) {
			if (errorMessages.length > 0) {
				elements.vacationModalError.innerHTML = errorMessages.join("<br>");
				toggleHidden(elements.vacationModalError, false);
			} else {
				elements.vacationModalError.innerHTML = "";
				toggleHidden(elements.vacationModalError, true);
			}
		}
		if (elements.vacationModalWarning) {
			if (warningMessages.length > 0) {
				elements.vacationModalWarning.innerHTML = warningMessages.join("<br>");
				toggleHidden(elements.vacationModalWarning, false);
			} else {
				elements.vacationModalWarning.innerHTML = "";
				toggleHidden(elements.vacationModalWarning, true);
			}
		}
	}

	function updateModalSaveState() {
		if (!elements.vacationModalSave) {
			return;
		}
		const isHr = isHrUser(appState.currentUser);
		const hasBlockingOverlap = modalState.hasOverlap && !isHr;
		const hasBlockingLimit = modalState.exceedsLimit && modalState.limitDays > 0 && !isHr;
		const disabled = modalState.isReadOnly || hasBlockingOverlap || hasBlockingLimit || modalState.errors.size > 0 || Boolean(modalState.limitError) || !modalState.isDirty;
		elements.vacationModalSave.disabled = disabled;
	}

	function scrollModalToFirstError() {
		if (!elements.vacationModal || modalState.errors.size === 0) {
			return;
		}
		const errorRow = elements.vacationModal.querySelector(".vacation-period-row-error, .vacation-period-row--error");
		if (errorRow && typeof errorRow.scrollIntoView === "function") {
			errorRow.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	}

	function loadModalForEmployee(employee) {
		if (!employee) {
			return false;
		}
		appState.editingEmployeeId = employee.id;
		modalState.employeeId = employee.id;
		modalState.employeeSnapshot = { ...employee };
		modalState.isReadOnly = !isHrUser(appState.currentUser);
		const dataset = getVacationPeriodsForEmployees([employee.id]).map(clonePeriodForModal);
		sortModalPeriods(dataset);
		modalState.periods = dataset.map(period => ({ ...period }));
		modalState.originalPeriods = dataset.map(period => ({ ...period }));
		const limitValue = getEmployeeLimitValue(employee);
		modalState.limitDays = Number.isFinite(limitValue) && limitValue !== null ? limitValue : 0;
		modalState.limitOriginalValue = limitValue !== null ? String(limitValue) : "";
		modalState.limitInputValue = modalState.limitOriginalValue;
		modalState.limitDirty = false;
		modalState.limitError = "";
		modalState.manualLimitOverride = Boolean(employee?.allocation?.manualOverride);
		calculateModalState();
		updateModalLimitInfo(employee);
		renderEmployeeSelector(appState.currentUser);
		renderModalPeriods();
		updateModalSummary();
		renderModalWarnings();
		updateModalSaveState();
		return true;
	}

	function openVacationManagerModal(employee) {
		if (!elements.vacationModal || !employee) {
			return;
		}
		if (!loadModalForEmployee(employee)) {
			return;
		}
		elements.vacationModal.setAttribute("aria-hidden", "false");
		elements.vacationModal.style.display = "flex";
		toggleHidden(elements.vacationModal, false);
		const firstInput = elements.vacationPeriodList ? elements.vacationPeriodList.querySelector("input") : null;
		if (firstInput && !modalState.isReadOnly) {
			firstInput.focus();
		}
	}

	function closeVacationManagerModal(force = false) {
		if (modalState.isDirty && !force) {
			const confirmed = window.confirm("Закрити без збереження змін?");
			if (!confirmed) {
				return;
			}
		}
		resetModalState();
		appState.editingEmployeeId = null;
		if (elements.vacationModal) {
			elements.vacationModal.setAttribute("aria-hidden", "true");
			elements.vacationModal.style.display = "none";
			toggleHidden(elements.vacationModal, true);
		}
	}

	function handleModalEmployeeChange(event) {
		if (!event || !event.target || event.target !== elements.vacationModalEmployeeSelect) {
			return;
		}
		const employeeId = event.target.value;
		const employee = getEmployeeById(employeeId);
		if (modalState.isDirty) {
			const confirmed = window.confirm("Змінити співробітника без збереження поточних правок?");
			if (!confirmed) {
				event.target.value = modalState.employeeId || "";
				return;
			}
		}
		resetModalState();
		loadModalForEmployee(employee);
	}

	function addModalPeriod() {
		if (modalState.isReadOnly) {
			return;
		}
		hideModalSuccess();
		const today = formatDate(new Date());
		const newPeriod = {
			id: generateTempId(),
			refId: null,
			startDate: today,
			endDate: today
		};
		modalState.periods.push(newPeriod);
		sortModalPeriods(modalState.periods);
		calculateModalState();
		updateModalLimitInfo(getActiveModalEmployee());
		renderModalPeriods();
		updateModalSummary();
		renderModalWarnings();
		updateModalSaveState();
		const focusInput = elements.vacationPeriodList ? elements.vacationPeriodList.querySelector(`[data-period-id="${newPeriod.id}"] input`) : null;
		if (focusInput) {
			focusInput.focus();
		}
	}

	function handleModalListInput(event) {
		const target = event.target;
		if (!target || target.tagName !== "INPUT" || target.type !== "date" || !target.dataset.periodId) {
			return;
		}
		const period = modalState.periods.find(item => item.id === target.dataset.periodId);
		if (!period || modalState.isReadOnly) {
			target.value = period ? period[target.dataset.field] || "" : target.value;
			return;
		}
		hideModalSuccess();
		const field = target.dataset.field;
		if (field === "startDate") {
			period.startDate = target.value || "";
			if (!period.endDate && period.startDate) {
				period.endDate = period.startDate;
			}
		} else if (field === "endDate") {
			period.endDate = target.value || "";
		}
		sortModalPeriods(modalState.periods);
		calculateModalState();
		updateModalLimitInfo(getActiveModalEmployee());
		renderModalPeriods();
		updateModalSummary();
		renderModalWarnings();
		updateModalSaveState();
	}

	function handleModalListClick(event) {
		const button = event.target.closest("button[data-action]");
		if (!button || modalState.isReadOnly) {
			return;
		}
		const periodId = button.dataset.periodId;
		if (button.dataset.action === "delete") {
			hideModalSuccess();
			modalState.periods = modalState.periods.filter(item => item.id !== periodId);
			calculateModalState();
			updateModalLimitInfo(getActiveModalEmployee());
			renderModalPeriods();
			updateModalSummary();
			renderModalWarnings();
			updateModalSaveState();
		}
	}

	function handleLimitInput(event) {
		if (!event || !event.target || event.target !== elements.vacationLimitInput) {
			return;
		}
		if (modalState.isReadOnly) {
			event.target.value = modalState.limitInputValue;
			return;
		}
		hideModalSuccess();
		const rawValue = event.target.value ?? "";
		modalState.limitInputValue = rawValue;
		const trimmed = rawValue.trim();
		modalState.limitDirty = modalState.limitInputValue !== modalState.limitOriginalValue;
		let error = "";
		let nextLimit = modalState.limitDays;
		if (trimmed === "") {
			nextLimit = 0;
		} else if (!/^\d+$/.test(trimmed)) {
			error = "Використовуйте лише цифри.";
		} else {
			const numericValue = Number(trimmed);
			if (!Number.isFinite(numericValue) || numericValue < 0) {
				error = "Ліміт має бути числом не меншим за 0.";
			} else {
				nextLimit = numericValue;
			}
		}
		modalState.limitError = error;
		if (!error) {
			modalState.limitDays = nextLimit;
			modalState.manualLimitOverride = true;
		}
		calculateModalState();
		updateModalLimitInfo(getActiveModalEmployee());
		updateModalSummary();
		renderModalWarnings();
		updateModalSaveState();
	}

	async function commitModalChanges() {
		const employee = getEmployeeById(modalState.employeeId) || modalState.employeeSnapshot;
		if (!employee) {
			throw new Error("Профіль співробітника не знайдено.");
		}
		const collectionRef = db.collection("vacation_periods");
		const user = appState.currentUser;
		const now = firebase.firestore.FieldValue.serverTimestamp();
		const batch = db.batch();
		const persistedIds = new Set();

		modalState.periods.forEach(period => {
			const docRef = period.refId ? collectionRef.doc(period.refId) : collectionRef.doc();
			const payload = {
				start_date: period.startDate,
				end_date: period.endDate,
				days: computeDays(period.startDate, period.endDate),
				employee_id: modalState.employeeId,
				manager_id: employee.manager_id || null,
				updatedAt: now,
				updatedBy: user?.id || null,
				updatedByName: user?.fullName || user?.name || "",
				lastAction: "manual_periods_update"
			};
			batch.set(docRef, { ...payload, id: docRef.id }, { merge: true });
			persistedIds.add(docRef.id);
			if (!period.refId) {
				period.refId = docRef.id;
				period.id = docRef.id;
			}
		});

		modalState.originalPeriods.forEach(original => {
			const docId = original.refId || original.id;
			if (docId && !persistedIds.has(docId)) {
				batch.delete(collectionRef.doc(docId));
			}
		});

		if (modalState.limitDirty && !modalState.limitError) {
			const employeeRef = db.collection("employees").doc(modalState.employeeId);
			const updatePayload = {
				allocation: {
					...employee.allocation,
					totalAllocatedDays: modalState.limitDays,
					manualOverride: true,
					updatedAt: now,
					updatedBy: user?.id || null,
					updatedByName: user?.fullName || user?.name || ""
				}
			};
			batch.set(employeeRef, updatePayload, { merge: true });
		}

		await batch.commit();
		modalState.originalPeriods = modalState.periods.map(period => ({ ...period }));
		modalState.limitOriginalValue = modalState.limitInputValue;
		modalState.limitDirty = false;
		modalState.isDirty = false;
		const refreshedEmployee = getEmployeeById(modalState.employeeId) || employee;
		modalState.manualLimitOverride = true;
		calculateModalState();
		updateModalLimitInfo(refreshedEmployee);
		showModalSuccess("Ліміт і періоди успішно збережено.");
	}

	function handleVacationModalSubmit(event) {
		if (event) {
			event.preventDefault();
		}
		if (modalState.isReadOnly) {
			closeVacationManagerModal();
			return;
		}
		calculateModalState();
		renderModalWarnings();
		updateModalSaveState();
		if (modalState.errors.size > 0) {
			scrollModalToFirstError();
			return;
		}
		const isHr = isHrUser(appState.currentUser);
		if (modalState.hasOverlap && !isHr) {
			scrollModalToFirstError();
			return;
		}
		if (modalState.hasOverlap && isHr) {
			const confirmedOverlap = window.confirm("Виявлено перетини між періодами. Зберегти попри попередження?");
			if (!confirmedOverlap) {
				return;
			}
		}
		if (modalState.exceedsLimit && modalState.limitDays > 0) {
			if (!isHr) {
				scrollModalToFirstError();
				return;
			}
			const confirmedLimit = window.confirm("Перевищено ліміт днів відпустки. Зберегти зміни?");
			if (!confirmedLimit) {
				return;
			}
		}
		if (!modalState.isDirty) {
			closeVacationManagerModal();
			return;
		}
		if (elements.vacationModalSave) {
			elements.vacationModalSave.disabled = true;
			elements.vacationModalSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Збереження...';
		}
		commitModalChanges().then(() => {
			closeVacationManagerModal(true);
		}).catch(error => {
			console.error("Не вдалося зберегти періоди відпустки:", error, {
				employeeId: modalState.employeeId,
				periodCount: modalState.periods.length
			});
			if (elements.vacationModalError) {
				const extra = error && error.message ? `<br><small>${error.message}</small>` : "";
				elements.vacationModalError.innerHTML = `Не вдалося зберегти зміни. Спробуйте ще раз.${extra}`;
				toggleHidden(elements.vacationModalError, false);
			}
		}).finally(() => {
			if (elements.vacationModalSave) {
				elements.vacationModalSave.disabled = false;
				elements.vacationModalSave.innerHTML = '<i class="fas fa-save"></i> Зберегти';
			}
		});
	}

	function refreshVacationManagerModal() {
		if (!elements.vacationModal || elements.vacationModal.classList.contains("hidden") || !modalState.employeeId) {
			return;
		}
		if (modalState.isDirty) {
			return;
		}
		const employee = getEmployeeById(modalState.employeeId) || modalState.employeeSnapshot;
		if (!employee) {
			closeVacationManagerModal(true);
			return;
		}
		loadModalForEmployee(employee);
	}

	function handleVacationModalBackdropClick(event) {
		if (event.target === elements.vacationModal) {
			closeVacationManagerModal();
		}
	}

	function handleEmployeeInfoModalBackdropClick(event) {
		if (event.target === elements.employeeInfoModal) {
			closeEmployeeInfoModal();
		}
	}

	function handleGlobalKeydown(event) {
		if (event.key !== "Escape") {
			return;
		}
		let handled = false;
		if (elements.vacationModal && !elements.vacationModal.classList.contains("hidden")) {
			closeVacationManagerModal();
			handled = true;
		}
		if (elements.employeeInfoModal && !elements.employeeInfoModal.classList.contains("hidden")) {
			closeEmployeeInfoModal();
			handled = true;
		}
		if (handled) {
			event.preventDefault();
		}
	}

	function openEmployeeInfoModal(employeeOrId) {
		const employeeId = typeof employeeOrId === "string" ? employeeOrId : employeeOrId?.id;
		if (!employeeId) {
			return;
		}
		const employee = getEnrichedEmployeeById(employeeId);
		if (!employee) {
			console.warn("Не знайдено дані співробітника для інфо-модалки", { employeeId });
			return;
		}
		infoModalState.employeeId = employeeId;
		populateEmployeeInfoModal(employee);
		toggleHidden(elements.employeeInfoModal, false);
		if (elements.employeeInfoClose) {
			elements.employeeInfoClose.focus();
		}
	}

	function closeEmployeeInfoModal() {
		infoModalState.employeeId = null;
		if (elements.employeeInfoModal) {
			toggleHidden(elements.employeeInfoModal, true);
		}
	}

	function populateEmployeeInfoModal(employee) {
		if (!employee) {
			return;
		}
		const manager = employee.manager_id ? getEnrichedEmployeeById(employee.manager_id) : null;
		const accrued = getEmployeeAccruedDays(employee);
		const balance = getEmployeeBalance(employee);
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
		if (elements.employeeInfoHistoryList) {
			clearNode(elements.employeeInfoHistoryList);
			const history = (employee.vacationPeriods || []).slice().sort((a, b) => b.start_date.localeCompare(a.start_date));
			if (history.length === 0) {
				toggleHidden(elements.employeeInfoHistoryList, true);
				toggleHidden(elements.employeeInfoHistoryEmpty, false);
				return;
			}
			toggleHidden(elements.employeeInfoHistoryList, false);
			toggleHidden(elements.employeeInfoHistoryEmpty, true);
			history.forEach(period => {
				const item = createElement("li", "info-history-item");
				item.appendChild(createElement("div", "info-history-range", formatRange(period.start_date, period.end_date) || "—"));
				const statusLabel = computeStatus([period]);
				item.appendChild(createElement("div", "info-history-status", `Статус: ${statusLabel}`));
				elements.employeeInfoHistoryList.appendChild(item);
			});
		}
	}

	function refreshEmployeeInfoModal() {
		if (!infoModalState.employeeId || !elements.employeeInfoModal || elements.employeeInfoModal.classList.contains("hidden")) {
			return;
		}
		const updatedEmployee = getEnrichedEmployeeById(infoModalState.employeeId);
		if (!updatedEmployee) {
			closeEmployeeInfoModal();
			return;
		}
		populateEmployeeInfoModal(updatedEmployee);
	}

	function normalizeRoleFlags(flags = {}) {
		return {
			isHR: Boolean(flags.is_hr || flags.isHR),
			isManager: Boolean(flags.is_manager || flags.isManager),
			isHRHead: Boolean(flags.is_hr_head || flags.isHRHead || flags.is_hr_manager)
		};
	}

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

	function normalizeDepartmentDoc(doc) {
		const data = doc.data() || {};
		return {
			id: doc.id,
			name: data.name || doc.id
		};
	}

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

	function enrichEmployeeData() {
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
				computedStatus: computeStatus(periods)
			};
		});
	}

	function getEnrichedEmployeeById(id) {
		if (!id) {
			return null;
		}
		const enriched = enrichEmployeeData();
		return enriched.find(emp => emp.id === id) || null;
	}

	function getEmployeeAccruedDays(employee) {
		const allocationTotal = employee?.allocation?.totalAllocatedDays;
		if (typeof allocationTotal === "number" && Number.isFinite(allocationTotal)) {
			return allocationTotal;
		}
		const total = employee?.total_vacation_days;
		return typeof total === "number" && Number.isFinite(total) ? total : null;
	}

	function getEmployeeBalance(employee) {
		const accrued = getEmployeeAccruedDays(employee);
		if (typeof accrued === "number") {
			const used = typeof employee?.used_vacation_days === "number" && Number.isFinite(employee.used_vacation_days)
				? employee.used_vacation_days
				: 0;
			const balance = accrued - used;
			if (Number.isFinite(balance)) {
				return balance;
			}
		}
		const fallback = employee?.raw?.days_left;
		return typeof fallback === "number" && Number.isFinite(fallback) ? fallback : null;
	}

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

	function syncCurrentUserFromDataset() {
		if (!appState.currentUser) {
			return;
		}
		const match = appData.employees.find(emp => emp.id === appState.currentUser.id);
		if (match) {
			appState.currentUser = { ...appState.currentUser, ...match };
		}
	}

	function getDepartmentById(id) {
		return appData.departments.find(dep => dep.id === id) || null;
	}

	function getEmployeeById(id) {
		return appData.employees.find(emp => emp.id === id) || null;
	}

	function getActiveModalEmployee() {
		return getEmployeeById(modalState.employeeId) || modalState.employeeSnapshot || null;
	}

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

	function getRoleLabels(userDoc) {
		if (!userDoc) {
			return ["Guest"];
		}
		const labels = [];
		if (userDoc.isHRHead) {
			labels.push("HR Head");
		} else if (userDoc.isHR) {
			labels.push("HR");
		}
		if (userDoc.isManager) {
			labels.push("Manager");
		}
		if (labels.length === 0) {
			labels.push("Employee");
		}
		return labels;
	}

	function getManagerEmployees(managerId) {
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

	function getEmployeesForRendering(tab, userDoc) {
		const employees = enrichEmployeeData();
		if (!userDoc) {
			return employees;
		}
		if (tab === "My View") {
			return employees.filter(emp => emp.id === userDoc.id);
		}
		let filtered = employees.slice();
		const filters = appState.filters || {};
		if (filters.department) {
			filtered = filtered.filter(emp => {
				return (
					emp.department_id === filters.department ||
					emp.department === filters.department ||
					emp.departmentName === filters.department
				);
			});
		}
		if (filters.status) {
			filtered = filtered.filter(emp => emp.computedStatus === filters.status);
		}
		if (tab === "Manager View") {
			const teamMembers = getManagerEmployees(userDoc.id);
			const allowedIds = new Set(teamMembers.map(emp => emp.id));
			allowedIds.add(userDoc.id);
			filtered = filtered.filter(emp => allowedIds.has(emp.id));
			if (userDoc.isHRHead) {
				const userDepartments = new Set([
					userDoc.department_id,
					userDoc.department,
					userDoc.departmentName
				].map(value => (typeof value === "string" ? value.trim().toLowerCase() : "")).filter(Boolean));
				filtered = filtered.filter(emp => {
					const employeeDepartments = [
						emp.department_id,
						emp.department,
						emp.departmentName
					].map(value => (typeof value === "string" ? value.trim().toLowerCase() : "")).filter(Boolean);
					if (employeeDepartments.length === 0) {
						return false;
					}
					return employeeDepartments.some(token => userDepartments.has(token));
				});
			}
		}
		return filtered;
	}

	function getVacationPeriodsForEmployees(employeeIds) {
		if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
			return [];
		}
		const idSet = new Set(employeeIds);
		return appData.vacationPeriods.filter(period => idSet.has(period.employee_id));
	}

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

	function updateUserSummary(userDoc) {
		if (elements.currentUserName) {
			elements.currentUserName.textContent = userDoc?.fullName || userDoc?.name || "—";
		}
		if (elements.currentUserRole) {
			elements.currentUserRole.textContent = getRoleLabels(userDoc).join(", ");
		}
	}

	function renderStatsGrid(employees) {
		if (!elements.statsGrid) {
			return;
		}
		clearNode(elements.statsGrid);
		if (!employees || employees.length === 0) {
			toggleHidden(elements.statsGrid, true);
			return;
		}
		toggleHidden(elements.statsGrid, false);
		const total = employees.length;
		const onVacation = employees.filter(emp => emp.computedStatus === "У відпустці").length;
		const planned = employees.filter(emp => emp.computedStatus === "Заплановано").length;
		const atWork = employees.filter(emp => emp.computedStatus === "На роботі").length;

		const cards = [
			{
				className: "stat-card stat-card--total",
				icon: "fas fa-users",
				value: total,
				label: "Всього співробітників"
			},
			{
				className: "stat-card stat-card--approved",
				icon: "fas fa-plane-departure",
				value: onVacation,
				label: "У відпустці"
			},
			{
				className: "stat-card stat-card--pending",
				icon: "fas fa-calendar-plus",
				value: planned,
				label: "Заплановано"
			},
			{
				className: "stat-card stat-card--info",
				icon: "fas fa-briefcase",
				value: atWork,
				label: "На роботі"
			}
		];

		cards.forEach(card => {
			const wrapper = createElement("div", card.className);
			const icon = createElement("div", "stat-card-icon");
			icon.innerHTML = `<i class="${card.icon}"></i>`;
			wrapper.appendChild(icon);
			wrapper.appendChild(createElement("div", "stat-card-value", String(card.value)));
			wrapper.appendChild(createElement("div", "stat-card-label", card.label));
			elements.statsGrid.appendChild(wrapper);
		});
	}

	function renderFiltersSection(userDoc, shouldShow) {
		if (!elements.filtersSection) {
			return;
		}
		if (!shouldShow) {
			toggleHidden(elements.filtersSection, true);
			clearNode(elements.filtersGrid);
			return;
		}
		const hasFilters = buildFilters(userDoc, appState.currentTab);
		toggleHidden(elements.filtersSection, !hasFilters);
	}

	function buildFilters(userDoc, currentTab) {
		if (!elements.filtersGrid) {
			return;
		}
		clearNode(elements.filtersGrid);
		if (!userDoc || (!userDoc.isHR && !userDoc.isHRHead && !userDoc.isManager)) {
			return false;
		}

		const includeDepartmentFilter = currentTab !== "Manager View";
		let hasFilters = false;
		let departmentSelect = null;

		if (includeDepartmentFilter) {
			const departmentGroup = createElement("div", "filter-group");
			const departmentLabel = createElement("label", "filter-label", "Підрозділ");
			departmentSelect = createElement("select", "filter-select");
			const defaultDepartmentOption = createElement("option", "", "Всі");
			defaultDepartmentOption.value = "";
			departmentSelect.appendChild(defaultDepartmentOption);
			appData.departments.forEach(department => {
				const option = createElement("option", "", department.name);
				option.value = department.id;
				if (appState.filters.department === department.id || appState.filters.department === department.name) {
					option.selected = true;
				}
				departmentSelect.appendChild(option);
			});
			departmentSelect.addEventListener("change", () => {
				appState.filters.department = departmentSelect.value;
				rerenderUI(appState.currentTab);
			});
			departmentGroup.appendChild(departmentLabel);
			departmentGroup.appendChild(departmentSelect);
			elements.filtersGrid.appendChild(departmentGroup);
			hasFilters = true;
		} else if (appState.filters.department) {
			appState.filters.department = "";
		}

		let statusSelect = null;
		if (userDoc.isHR || userDoc.isHRHead) {
			const statusGroup = createElement("div", "filter-group");
			const statusLabel = createElement("label", "filter-label", "Статус");
			statusSelect = createElement("select", "filter-select");
			const statuses = ["", "У відпустці", "Заплановано", "На роботі"];
			statuses.forEach(value => {
				const option = createElement("option", "", value || "Всі");
				option.value = value;
				if (appState.filters.status === value) {
					option.selected = true;
				}
				statusSelect.appendChild(option);
			});
			statusSelect.addEventListener("change", () => {
				appState.filters.status = statusSelect.value;
				rerenderUI(appState.currentTab);
			});
			statusGroup.appendChild(statusLabel);
			statusGroup.appendChild(statusSelect);
			elements.filtersGrid.appendChild(statusGroup);
			hasFilters = true;
		}

		const shouldRenderReset = userDoc.isHR || userDoc.isHRHead || userDoc.isManager;
		if (shouldRenderReset && hasFilters) {
			const resetGroup = createElement("div", "filter-group filter-group--reset");
			const resetButton = createElement("button", "btn btn--secondary filter-reset-button", "Скинути фільтри");
			resetButton.type = "button";
			resetButton.addEventListener("click", () => {
				appState.filters.department = "";
				appState.filters.status = "";
				if (departmentSelect) {
					departmentSelect.value = "";
				}
				if (statusSelect) {
					statusSelect.value = "";
				}
				rerenderUI(appState.currentTab);
			});
			resetGroup.appendChild(resetButton);
			elements.filtersGrid.appendChild(resetGroup);
		}

		return hasFilters;
	}

	function renderTeamCalendar(employees, options = {}) {
		if (!elements.calendar || !elements.calendarControls || !elements.calendarLegend) {
			return;
		}
		clearNode(elements.calendar);
		clearNode(elements.calendarControls);
		clearNode(elements.calendarLegend);

		if (!employees || employees.length === 0) {
			elements.calendar.innerHTML = "<em>Немає даних для відображення.</em>";
			return;
		}

		const todayIso = formatDate(new Date());
		const statusFilter = Object.prototype.hasOwnProperty.call(options, "statusFilterOverride")
			? sanitizeMyViewStatus(options.statusFilterOverride || "")
			: options.ignoreFilters
				? ""
				: appState.filters?.status || "";
		const includePast = Boolean(options.includePast);
		const yearFilter = Number.isFinite(options.yearFilter) ? options.yearFilter : null;
		const yearStartDate = yearFilter !== null ? createUtcDate(yearFilter, 0, 1) : null;
		const yearEndDate = yearFilter !== null ? createUtcDate(yearFilter, 11, 31) : null;
		const yearStartIso = yearStartDate ? formatDate(yearStartDate) : null;
		const yearEndIso = yearEndDate ? formatDate(yearEndDate) : null;
		const relevantPeriods = [];

		// Collect only active or upcoming periods so the month grid mirrors the filtered dataset.
		employees.forEach(employee => {
			const employeeName = employee.fullName || `${employee.name || ""} ${employee.surname || ""}`.trim() || employee.id;
			(employee.vacationPeriods || []).forEach(period => {
				if (!period || !period.start_date || !period.end_date) {
					return;
				}
				const startIso = formatDate(period.start_date);
				const endIso = formatDate(period.end_date);
				if (!startIso || !endIso) {
					return;
				}
				if (yearFilter !== null && !periodIntersectsYear(period, yearFilter)) {
					return;
				}
				const displayStartIso = yearFilter !== null && yearStartIso && startIso < yearStartIso ? yearStartIso : startIso;
				const displayEndIso = yearFilter !== null && yearEndIso && endIso > yearEndIso ? yearEndIso : endIso;
				if (displayStartIso > displayEndIso) {
					return;
				}
				let periodStatus = "Заплановано";
				if (endIso < todayIso) {
					if (!includePast) {
						return;
					}
					periodStatus = PAST_STATUS_LABEL;
				} else if (startIso <= todayIso && endIso >= todayIso) {
					periodStatus = "У відпустці";
				}
				if (statusFilter && periodStatus !== statusFilter) {
					return;
				}
				relevantPeriods.push({
					employeeId: employee.id,
					employeeName,
					start_date: displayStartIso,
					end_date: displayEndIso,
					status: periodStatus,
					tooltipRange: formatRange(startIso, endIso)
				});
			});
		});

		const fallbackIso = todayIso;
		const candidateIso = relevantPeriods
			.map(period => (period.status === "У відпустці" && period.start_date <= todayIso ? todayIso : period.start_date))
			.sort()[0];
		const defaultYearBase = yearStartIso || fallbackIso;
		const baseDateIso = yearFilter !== null ? defaultYearBase : candidateIso || fallbackIso;
		if (appState.calendarBaseDateIso !== baseDateIso) {
			appState.calendarBaseDateIso = baseDateIso;
			appState.calendarMonthOffset = 0;
		}

		const defaultNavigationSpan = 12;
		const minOffset = yearFilter !== null ? 0 : -defaultNavigationSpan;
		const maxOffset = yearFilter !== null ? 11 : defaultNavigationSpan;
		let offset = appState.calendarMonthOffset || 0;
		if (offset < minOffset || offset > maxOffset) {
			offset = Math.min(Math.max(offset, minOffset), maxOffset);
			appState.calendarMonthOffset = offset;
		}

		const anchorDate = parseIsoDateToUtc(appState.calendarBaseDateIso) || parseIsoDateToUtc(todayIso) || new Date();
		const targetMonthDate = addMonthsUtc(anchorDate, offset);
		const monthStart = startOfMonthUtc(targetMonthDate);
		const gridStart = startOfWeekMondayUtc(monthStart);

		const calendarGrid = createElement("div", "calendar-grid");
		const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
		weekDays.forEach(label => {
			const headerCell = createElement("div", "calendar-day calendar-day--header", label);
			calendarGrid.appendChild(headerCell);
		});

		const cellCount = 42;
		let cursor = gridStart;
		const summary = {
			current: new Set(),
			planned: new Set(),
			past: new Set()
		};

		for (let i = 0; i < cellCount; i += 1) {
			const dayIso = formatDate(cursor);
			const inCurrentMonth = cursor.getUTCMonth() === monthStart.getUTCMonth();
			const day = createElement("div", "calendar-day");
			if (!inCurrentMonth) {
				day.classList.add("calendar-day--other-month");
			}
			if (dayIso === todayIso) {
				day.classList.add("calendar-day--today");
			}

			const dateLabel = createElement("div", "calendar-day-date", String(cursor.getUTCDate()));
			day.appendChild(dateLabel);

			const dayStatuses = [];
			relevantPeriods.forEach(period => {
				if (dayIso >= period.start_date && dayIso <= period.end_date) {
					dayStatuses.push(period);
				}
			});

			if (dayStatuses.length > 0) {
				day.classList.add("calendar-day--has-data");
				const badgeContainer = createElement("div", "calendar-day-badges");
				const currentEntries = [];
				const plannedEntries = [];
				const pastEntries = [];
				dayStatuses.forEach(period => {
					if (period.status === "У відпустці") {
						currentEntries.push(period);
						summary.current.add(period.employeeId);
					} else if (period.status === "Заплановано") {
						plannedEntries.push(period);
						summary.planned.add(period.employeeId);
					} else if (period.status === PAST_STATUS_LABEL) {
						pastEntries.push(period);
						summary.past.add(period.employeeId);
					}
				});

				if (currentEntries.length > 0) {
					const badge = createElement(
						"div",
						"calendar-day-badge calendar-day-badge--current",
						String(currentEntries.length)
					);
					badge.title = currentEntries
						.map(entry => `${entry.employeeName} — ${entry.tooltipRange}`)
						.join("\n");
					badgeContainer.appendChild(badge);
				}
				if (plannedEntries.length > 0) {
					const badge = createElement(
						"div",
						"calendar-day-badge calendar-day-badge--planned",
						String(plannedEntries.length)
					);
					badge.title = plannedEntries
						.map(entry => `${entry.employeeName} — ${entry.tooltipRange}`)
						.join("\n");
					badgeContainer.appendChild(badge);
				}
				if (pastEntries.length > 0) {
					const badge = createElement(
						"div",
						"calendar-day-badge calendar-day-badge--past",
						String(pastEntries.length)
					);
					badge.title = pastEntries
						.map(entry => `${entry.employeeName} — ${entry.tooltipRange}`)
						.join("\n");
					badgeContainer.appendChild(badge);
				}
				day.appendChild(badgeContainer);
			}

			calendarGrid.appendChild(day);
			cursor = addDaysUtc(cursor, 1);
		}

		const prevBtn = createElement("button", "btn btn--secondary btn--icon calendar-nav-btn");
		prevBtn.type = "button";
		prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
		prevBtn.disabled = offset <= minOffset;
		const scheduleRerender = () => renderTeamCalendar(employees, options);
		prevBtn.addEventListener("click", () => {
			appState.calendarMonthOffset = Math.max(offset - 1, minOffset);
			scheduleRerender();
		});

		const nextBtn = createElement("button", "btn btn--secondary btn--icon calendar-nav-btn");
		nextBtn.type = "button";
		nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
		nextBtn.disabled = offset >= maxOffset;
		nextBtn.addEventListener("click", () => {
			appState.calendarMonthOffset = Math.min(offset + 1, maxOffset);
			scheduleRerender();
		});

		const resetBtn = createElement("button", "btn btn--secondary calendar-nav-btn calendar-nav-btn--reset", "Сьогодні");
		resetBtn.type = "button";
		resetBtn.disabled = offset === 0;
		resetBtn.addEventListener("click", () => {
			appState.calendarMonthOffset = 0;
			scheduleRerender();
		});

		const monthLabel = createElement("span", "calendar-month-label", formatMonthLabel(monthStart));
		monthLabel.style.textTransform = "capitalize";

		elements.calendarControls.appendChild(prevBtn);
		elements.calendarControls.appendChild(monthLabel);
		elements.calendarControls.appendChild(nextBtn);
		elements.calendarControls.appendChild(resetBtn);

		elements.calendar.appendChild(calendarGrid);

		if (relevantPeriods.length === 0) {
			const emptyHint = yearFilter !== null
				? "Відпустків не знайдено."
				: "За вибраними фільтрами немає запланованих або активних відпусток.";
			elements.calendar.appendChild(createElement("div", "calendar-empty-hint", emptyHint));
		}

		const legendConfig = [
			{
				status: "У відпустці",
				label: `У відпустці${summary.current.size ? ` — ${summary.current.size}` : ""}`,
				className: "legend-color legend-color--current"
			},
			{
				status: "Заплановано",
				label: `Заплановано${summary.planned.size ? ` — ${summary.planned.size}` : ""}`,
				className: "legend-color legend-color--planned"
			}
		];
		if (includePast) {
			legendConfig.push({
				status: PAST_STATUS_LABEL,
				label: `${PAST_STATUS_LABEL}${summary.past.size ? ` — ${summary.past.size}` : ""}`,
				className: "legend-color legend-color--past"
			});
		}

		legendConfig
			.filter(item => !statusFilter || statusFilter === item.status)
			.forEach(item => {
				const legendItem = createElement("div", "legend-item");
				const colorSwatch = createElement("span", item.className);
				const label = createElement("span", "", item.label);
				legendItem.appendChild(colorSwatch);
				legendItem.appendChild(label);
				elements.calendarLegend.appendChild(legendItem);
			});

		if (elements.calendarLegend.children.length === 0) {
			const legendItem = createElement("div", "legend-item");
			legendItem.appendChild(createElement("span", "legend-color legend-color--empty"));
			legendItem.appendChild(createElement("span", "", "Немає відпусток для відображення."));
			elements.calendarLegend.appendChild(legendItem);
		}
	}

	function renderTeamTable(tab, employees, userDoc) {
		if (!elements.tableHead || !elements.tableBody || !elements.tableTitle) {
			return;
		}
		clearNode(elements.tableHead);
		clearNode(elements.tableBody);

		const titleMap = {
			"HR View": "HR View — всі співробітники",
			"Manager View": "Manager View — вертикаль підлеглих"
		};
		elements.tableTitle.textContent = titleMap[tab] || "Перелік співробітників";

		const canManageVacations = tab === "HR View" && isHrUser(userDoc);
		const includeDepartmentColumn = tab !== "Manager View";

		if (!employees || employees.length === 0) {
			const emptyRow = createElement("tr", "table-row-empty");
			const cell = createElement("td", "table-cell-empty", "Немає записів для відображення.");
			const baseColumns = 6 + (includeDepartmentColumn ? 1 : 0);
			cell.colSpan = canManageVacations ? baseColumns + 1 : baseColumns;
			emptyRow.appendChild(cell);
			elements.tableBody.appendChild(emptyRow);
			return;
		}

		const headRow = createElement("tr");
		const headCells = [
			{ label: "#", className: "col-index" },
			{ label: "Ім'я" }
		];
		if (includeDepartmentColumn) {
			headCells.push({ label: "Підрозділ" });
		}
		headCells.push(
			{ label: "Посада" },
			{ label: "Статус", className: "table-head--status" },
			{ label: "Ближча відпустка" },
			{ label: "Нарах.", className: "col-earned" },
			{ label: "Залишок днів" }
		);
		headCells.forEach(cell => {
			headRow.appendChild(createElement("th", cell.className || "", cell.label));
		});
		if (canManageVacations) {
			headRow.appendChild(createElement("th", "", "Дії"));
		}
		elements.tableHead.appendChild(headRow);

		const todayIso = formatDate(new Date());

		employees.forEach((employee, index) => {
			const row = createElement("tr");
			const fullName = employee.fullName || `${employee.name} ${employee.surname}`.trim();
			row.appendChild(createElement("td", "col-index", String(index + 1)));
			row.appendChild(createElement("td", "", fullName || "—"));
			if (includeDepartmentColumn) {
				row.appendChild(createElement("td", "", employee.departmentName || "—"));
			}
			row.appendChild(createElement("td", "", employee.position || "—"));
			const statusLabel = employee.computedStatus || "На роботі";
			const statusCell = createElement("td", "table-cell--status");
			statusCell.appendChild(createStatusBadge(statusLabel));
			row.appendChild(statusCell);

			const upcomingPeriod = (employee.vacationPeriods || [])
				.filter(period => period.start_date >= todayIso)
				.sort((a, b) => a.start_date.localeCompare(b.start_date))[0];

			row.appendChild(createElement("td", "", upcomingPeriod ? formatRange(upcomingPeriod.start_date, upcomingPeriod.end_date) : "—"));

			const allocationInfo = getAllocationInfo(employee.allocation);
			const allocationCell = createElement("td", "col-earned", allocationInfo.display);
			if (allocationInfo.tooltip) {
				allocationCell.title = allocationInfo.tooltip;
			}
			row.appendChild(allocationCell);

			const totalDays = Number(employee.total_vacation_days ?? 0);
			const usedDays = Number(employee.used_vacation_days ?? 0);
			const balanceValue = totalDays - usedDays;
			const balanceDisplay = Number.isFinite(balanceValue) ? String(balanceValue) : "—";
			row.appendChild(createElement("td", "", balanceDisplay));

			if (canManageVacations) {
				const actionsCell = createElement("td", "actions-column");
				const actionsWrapper = createElement("div", "action-buttons");
				const infoButton = document.createElement("button");
				infoButton.type = "button";
				infoButton.className = "btn btn--action-icon btn--icon-only";
				infoButton.title = "Інформація про співробітника";
				infoButton.setAttribute("aria-label", `Інформація про співробітника: ${fullName || "співробітник"}`);
				infoButton.setAttribute("aria-haspopup", "dialog");
				infoButton.addEventListener("click", () => openEmployeeInfoModal(employee.id));
				infoButton.appendChild(createElement("i", "fas fa-eye"));
				infoButton.appendChild(createElement("span", "sr-only", "Інформація"));

				const manageButton = document.createElement("button");
				manageButton.type = "button";
				manageButton.className = "btn btn--action-icon btn--icon-only";
				manageButton.title = "Відпусткові періоди";
				manageButton.setAttribute("aria-label", "Відпусткові періоди");
				manageButton.setAttribute("aria-haspopup", "dialog");
				manageButton.addEventListener("click", () => openVacationManagerModal(employee));
				manageButton.appendChild(createElement("i", "fas fa-pen-to-square"));
				manageButton.appendChild(createElement("span", "sr-only", "Відпусткові періоди"));
				actionsWrapper.appendChild(infoButton);
				actionsWrapper.appendChild(manageButton);
				actionsCell.appendChild(actionsWrapper);
				row.appendChild(actionsCell);
			}

			elements.tableBody.appendChild(row);
		});
	}

	function renderMyView(userDoc) {
		if (!userDoc || !elements.tableHead || !elements.tableBody || !elements.tableTitle || !elements.calendar) {
			return;
		}
		clearNode(elements.tableHead);
		clearNode(elements.tableBody);
		elements.tableTitle.textContent = "Мої відпустки";

		const headRow = createElement("tr");
		["#", "Період", "Днів", "Статус"].forEach((label, idx) => {
			let className = "";
			if (idx === 0) {
				className = "col-index";
			} else if (label === "Статус") {
				className = "table-head--status";
			}
			headRow.appendChild(createElement("th", className, label));
		});
		elements.tableHead.appendChild(headRow);

		const userId = userDoc.id;
		const periods = getVacationPeriodsForEmployees([userId]).sort((a, b) => a.start_date.localeCompare(b.start_date));

		const availableYears = getYearsFromPeriods(periods);
		const selectedYear = sanitizeYearValue(appState.myViewYear);
		const optionYears = availableYears.slice();
		if (selectedYear) {
			const numericSelected = Number(selectedYear);
			if (!optionYears.includes(numericSelected)) {
				optionYears.push(numericSelected);
			}
		}
		optionYears.sort((a, b) => b - a);
		const yearFilterValue = selectedYear ? Number(selectedYear) : null;
		const yearFilteredPeriods = yearFilterValue !== null
			? periods.filter(period => periodIntersectsYear(period, yearFilterValue))
			: periods.slice();
		const periodsWithStatus = yearFilteredPeriods.map(period => ({
			...period,
			computedStatus: getMyViewPeriodStatus(period)
		}));
		const selectedStatus = sanitizeMyViewStatus(appState.myViewStatus);
		const filteredPeriods = selectedStatus
			? periodsWithStatus.filter(period => period.computedStatus === selectedStatus)
			: periodsWithStatus;
		const hasFiltersApplied = Boolean(selectedYear || selectedStatus);

		if (elements.myViewControls) {
			toggleHidden(elements.myViewControls, false);
			elements.myViewControls.setAttribute("aria-hidden", "false");
			elements.myViewControls.setAttribute("data-empty-state", !filteredPeriods.length && hasFiltersApplied ? "true" : "false");
		}

		if (elements.myViewYearFilter) {
			const select = elements.myViewYearFilter;
			const previousValue = select.value;
			select.innerHTML = "";
			const defaultOption = document.createElement("option");
			defaultOption.value = "";
			defaultOption.textContent = "Всі роки";
			select.appendChild(defaultOption);
			optionYears.forEach(year => {
				const option = document.createElement("option");
				const label = String(year);
				option.value = label;
				option.textContent = label;
				if (label === selectedYear) {
					option.selected = true;
				}
				select.appendChild(option);
			});
			select.value = selectedYear;
			select.dataset.active = selectedYear ? "true" : "false";
			if (!select.dataset.bound) {
				select.addEventListener("change", event => {
					applyMyViewYearSelection(event.target.value);
				});
				select.dataset.bound = "true";
			}
			if (previousValue !== select.value) {
				const normalizedValue = sanitizeYearValue(select.value);
				select.value = normalizedValue;
				appState.myViewYear = normalizedValue;
				const currentUser = appState.currentUser;
				if (currentUser) {
					persistMyViewYearPreference(currentUser.id, normalizedValue);
				}
				persistMyViewYearToUrl(normalizedValue);
			}
		}

		if (elements.myViewStatusFilter) {
			const statusSelect = elements.myViewStatusFilter;
			const previousStatus = statusSelect.value;
			statusSelect.innerHTML = "";
			const statusOptions = [
				{ value: "", label: "Всі статуси" },
				...MY_VIEW_STATUS_OPTIONS.map(option => ({ value: option, label: option }))
			];
			statusOptions.forEach(option => {
				const node = document.createElement("option");
				node.value = option.value;
				node.textContent = option.label;
				if (option.value === selectedStatus) {
					node.selected = true;
				}
				statusSelect.appendChild(node);
			});
			statusSelect.value = selectedStatus;
			statusSelect.dataset.active = selectedStatus ? "true" : "false";
			if (!statusSelect.dataset.bound) {
				statusSelect.addEventListener("change", event => {
					applyMyViewStatusSelection(event.target.value);
				});
				statusSelect.dataset.bound = "true";
			}
			if (previousStatus !== statusSelect.value) {
				const normalizedStatus = sanitizeMyViewStatus(statusSelect.value);
				statusSelect.value = normalizedStatus;
				appState.myViewStatus = normalizedStatus;
				const currentUser = appState.currentUser;
				if (currentUser) {
					persistMyViewStatusPreference(currentUser.id, normalizedStatus);
				}
				persistMyViewStatusToUrl(normalizedStatus);
			}
		}

		const noDataTooltip = !filteredPeriods.length && hasFiltersApplied ? "Відпустків не знайдено для вибраних фільтрів." : "";
		if (elements.myViewYearFilter) {
			if (noDataTooltip) {
				elements.myViewYearFilter.setAttribute("title", noDataTooltip);
			} else {
				elements.myViewYearFilter.removeAttribute("title");
			}
		}
		if (elements.myViewStatusFilter) {
			if (noDataTooltip) {
				elements.myViewStatusFilter.setAttribute("title", noDataTooltip);
			} else {
				elements.myViewStatusFilter.removeAttribute("title");
			}
		}

		if (elements.myViewResetFilters) {
			if (!elements.myViewResetFilters.dataset.bound) {
				elements.myViewResetFilters.addEventListener("click", () => resetMyViewFilters());
				elements.myViewResetFilters.dataset.bound = "true";
			}
			elements.myViewResetFilters.disabled = !hasFiltersApplied;
			elements.myViewResetFilters.setAttribute("aria-disabled", elements.myViewResetFilters.disabled ? "true" : "false");
		}

		const personalEmployee = {
			id: userDoc.id,
			fullName: userDoc.fullName || `${userDoc.name || ""} ${userDoc.surname || ""}`.trim() || userDoc.id,
			vacationPeriods: filteredPeriods
		};

		if (filteredPeriods.length === 0) {
			const emptyRow = createElement("tr", "table-row-empty");
			const message = periods.length === 0
				? "Відпусток ще не заплановано."
				: hasFiltersApplied
					? "Відпустків не знайдено."
					: "Відпусток для вибраного фільтра не знайдено.";
			const cell = createElement("td", "table-cell-empty", message);
			cell.colSpan = 4;
			emptyRow.appendChild(cell);
			elements.tableBody.appendChild(emptyRow);
		} else {
			filteredPeriods.forEach((period, index) => {
				const row = createElement("tr");
				row.appendChild(createElement("td", "col-index", String(index + 1)));
				row.appendChild(createElement("td", "", formatRange(period.start_date, period.end_date)));
				row.appendChild(createElement("td", "", String(period.days || computeDays(period.start_date, period.end_date))));
				const statusLabel = period.computedStatus || getMyViewPeriodStatus(period);
				const statusCell = createElement("td", "table-cell--status");
				statusCell.appendChild(createStatusBadge(statusLabel));
				row.appendChild(statusCell);
				elements.tableBody.appendChild(row);
			});
		}

		renderTeamCalendar([personalEmployee], {
			ignoreFilters: true,
			includePast: true,
			yearFilter: yearFilterValue,
			statusFilterOverride: selectedStatus
		});
	}

	function renderMainContent(userDoc) {
		if (!userDoc) {
			return;
		}
		const currentTab = appState.currentTab;
		if (currentTab !== "My View" && elements.myViewControls) {
			toggleHidden(elements.myViewControls, true);
			elements.myViewControls.setAttribute("aria-hidden", "true");
		}
		if (currentTab === "My View") {
			toggleHidden(elements.statsGrid, true);
			renderFiltersSection(userDoc, false);
			renderMyView(userDoc);
			renderBasActions(userDoc, currentTab);
			return;
		}

		const showFilters = userDoc.isHR || userDoc.isHRHead || userDoc.isManager;
		renderFiltersSection(userDoc, showFilters);

		const employees = getEmployeesForRendering(currentTab, userDoc);
		renderStatsGrid(employees);
		renderTeamCalendar(employees);
		renderTeamTable(currentTab, employees, userDoc);
		renderBasActions(userDoc, currentTab);
	}

	function rerenderUI(forceTab) {
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
		const activeButtons = elements.tabsNav ? Array.from(elements.tabsNav.querySelectorAll(".tab-button")) : [];
		activeButtons.forEach(button => {
			button.classList.toggle("active", button.textContent === appState.currentTab);
		});
		updateUserSummary(userDoc);
		renderMainContent(userDoc);
	}

	function setActiveTab(tabName) {
		if (appState.currentTab === tabName) {
			return;
		}
		appState.currentTab = tabName;
		rerenderUI(tabName);
	}

	async function handleLogin(event) {
		event.preventDefault();
		const taxIdRaw = elements.taxIdInput ? elements.taxIdInput.value : "";
		const taxId = normalizeText(taxIdRaw);

		if (!/^\d{10}$/.test(taxId)) {
			showLoginError("ІПН має містити рівно 10 цифр.");
			return;
		}

		const attemptCount = loginGuard.registerAttempt();
		if (attemptCount > 5) {
			showLoginError("Забагато спроб входу. Спробуйте знову через хвилину.");
			return;
		}

		if (elements.loginBtn) {
			elements.loginBtn.disabled = true;
			elements.loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вхід...';
		}
		toggleHidden(elements.loginError, true);

		try {
			const callable = functions.httpsCallable("signInWithTaxId");
			const result = await callable({ tax_id: taxId });
			const token = result?.data?.token;
			if (!token) {
				throw new Error("Не вдалося отримати токен авторизації.");
			}
			await auth.signInWithCustomToken(token);
		} catch (error) {
			console.error("Помилка входу:", error);
			showLoginError(error.message || "Сталася помилка входу. Спробуйте пізніше.");
			resetLoginButton();
		}
	}

	function resetLoginButton() {
		if (!elements.loginBtn) {
			return;
		}
		elements.loginBtn.disabled = false;
		elements.loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Увійти';
	}

	function setLogoutVisibility(isVisible) {
		const button = elements.logoutBtn;
		if (!button) {
			return;
		}
		if (!isVisible && document.activeElement === button) {
			button.blur();
		}
		toggleHidden(button, !isVisible);
		button.setAttribute("aria-hidden", isVisible ? "false" : "true");
	}

	async function handleLogoutClick() {
		if (!elements.logoutBtn) {
			return;
		}
		if (!auth.currentUser) {
			showLoginScreen();
			return;
		}
		elements.logoutBtn.disabled = true;
		try {
			await signOutWithCleanup();
		} catch (error) {
			console.error("Помилка виходу користувача:", error);
		} finally {
			elements.logoutBtn.disabled = false;
		}
	}

	function showLoginError(message) {
		if (!elements.loginError) {
			return;
		}
		elements.loginError.textContent = message;
		toggleHidden(elements.loginError, false);
	}

	function teardownListeners() {
		appState.listeners.forEach(unsub => {
			try {
				unsub();
			} catch (error) {
				console.error("Помилка при відписці від слухача:", error);
			}
		});
		appState.listeners = [];
	}

	function setupRealtimeListeners() {
		teardownListeners();

		const departmentsListener = db.collection("departments").onSnapshot(snapshot => {
			appData.departments = snapshot.docs.map(normalizeDepartmentDoc);
			rerenderUI(appState.currentTab);
		}, error => console.error("Помилка слухача departments:", error));
		appState.listeners.push(departmentsListener);

		const employeesListener = db.collection("employees").onSnapshot(snapshot => {
			appData.employees = snapshot.docs.map(normalizeEmployeeDoc);
			syncCurrentUserFromDataset();
			rerenderUI(appState.currentTab);
			refreshEmployeeInfoModal();
		}, error => console.error("Помилка слухача employees:", error));
		appState.listeners.push(employeesListener);

		const vacationsListener = db.collection("vacation_periods").onSnapshot(snapshot => {
			appData.vacationPeriods = snapshot.docs.map(normalizeVacationDoc);
			rerenderUI(appState.currentTab);
			refreshVacationManagerModal();
			refreshEmployeeInfoModal();
		}, error => console.error("Помилка слухача vacation_periods:", error));
		appState.listeners.push(vacationsListener);
	}

	async function handleAuthChange(user) {
		if (!user) {
			teardownListeners();
			appState.currentUser = null;
			appState.isInitialized = false;
			appState.currentTab = "My View";
			appState.filters = { department: "", status: "" };
			appState.myViewYear = "";
			appState.myViewStatus = "";
			appState.calendarBaseDateIso = null;
			appState.calendarMonthOffset = 0;
			clearBasLog();
			persistMyViewYearToUrl("");
			persistMyViewStatusToUrl("");
			if (elements.taxIdInput) {
				elements.taxIdInput.value = "";
			}
			setLogoutVisibility(false);
			showLoginScreen();
			resetLoginButton();
			return;
		}

		try {
			const doc = await db.collection("employees").doc(user.uid).get();
			if (!doc.exists) {
				throw new Error("Профіль користувача не знайдено у базі.");
			}
			appState.currentUser = normalizeEmployeeDoc(doc);
			appState.isInitialized = true;
			appState.currentTab = getVisibleTabs(appState.currentUser)[0];
			appState.filters = { department: "", status: "" };
			appState.calendarBaseDateIso = null;
			appState.calendarMonthOffset = 0;
			const urlYear = loadMyViewYearFromUrl();
			const storedYear = loadMyViewYearPreference(appState.currentUser.id);
			const preferredYear = urlYear || storedYear || "";
			appState.myViewYear = preferredYear;
			if (preferredYear) {
				persistMyViewYearPreference(appState.currentUser.id, preferredYear);
				persistMyViewYearToUrl(preferredYear);
			} else {
				persistMyViewYearPreference(appState.currentUser.id, "");
				persistMyViewYearToUrl("");
			}
			const urlStatus = loadMyViewStatusFromUrl();
			const storedStatus = loadMyViewStatusPreference(appState.currentUser.id);
			const preferredStatus = urlStatus || storedStatus || "";
			appState.myViewStatus = preferredStatus;
			if (preferredStatus) {
				persistMyViewStatusPreference(appState.currentUser.id, preferredStatus);
				persistMyViewStatusToUrl(preferredStatus);
			} else {
				persistMyViewStatusPreference(appState.currentUser.id, "");
				persistMyViewStatusToUrl("");
			}
			showDashboard();
			setupRealtimeListeners();
			rerenderUI(appState.currentTab);
		} catch (error) {
			console.error("Не вдалося завантажити дані користувача:", error);
			await signOutWithCleanup("Не вдалося завантажити профіль користувача.");
		} finally {
			resetLoginButton();
		}
	}

	async function signOutWithCleanup(message) {
		teardownListeners();
		closeVacationManagerModal(true);
		closeEmployeeInfoModal();
		setLogoutVisibility(false);
		try {
			await auth.signOut();
		} catch (error) {
			console.error("Помилка виходу:", error);
		}
		if (message) {
			showLoginError(message);
		}
		showLoginScreen();
	}

	function showDashboard() {
		toggleHidden(elements.loginScreen, true);
		if (elements.loginScreen) {
			elements.loginScreen.style.display = "none";
		}
		toggleHidden(elements.dashboard, false);
		if (elements.dashboard) {
			elements.dashboard.style.display = "";
		}
		setLogoutVisibility(true);
	}

	function showLoginScreen() {
		toggleHidden(elements.dashboard, true);
		if (elements.dashboard) {
			elements.dashboard.style.display = "none";
		}
		toggleHidden(elements.loginScreen, false);
		if (elements.loginScreen) {
			elements.loginScreen.style.display = "";
		}
		setLogoutVisibility(false);
	}

	function initialize() {
		if (elements.loginForm) {
			elements.loginForm.addEventListener("submit", handleLogin);
		}
		if (elements.vacationModalForm) {
			elements.vacationModalForm.addEventListener("submit", handleVacationModalSubmit);
		}
		if (elements.vacationModalClose) {
			elements.vacationModalClose.addEventListener("click", () => closeVacationManagerModal());
		}
		if (elements.vacationModalCancel) {
			elements.vacationModalCancel.addEventListener("click", () => closeVacationManagerModal());
		}
		if (elements.vacationModal) {
			elements.vacationModal.addEventListener("click", handleVacationModalBackdropClick);
		}
		if (elements.vacationPeriodAddBtn) {
			elements.vacationPeriodAddBtn.addEventListener("click", addModalPeriod);
		}
		if (elements.vacationPeriodList) {
			elements.vacationPeriodList.addEventListener("input", handleModalListInput);
			elements.vacationPeriodList.addEventListener("click", handleModalListClick);
		}
		if (elements.vacationModalEmployeeSelect) {
			elements.vacationModalEmployeeSelect.addEventListener("change", handleModalEmployeeChange);
		}
		if (elements.vacationLimitInput) {
			elements.vacationLimitInput.addEventListener("input", handleLimitInput);
		}
		if (elements.employeeInfoClose) {
			elements.employeeInfoClose.addEventListener("click", () => closeEmployeeInfoModal());
		}
		if (elements.employeeInfoModal) {
			elements.employeeInfoModal.addEventListener("click", handleEmployeeInfoModalBackdropClick);
		}
		if (elements.logoutBtn) {
			elements.logoutBtn.addEventListener("click", handleLogoutClick);
		}
		setLogoutVisibility(false);
		document.addEventListener("keydown", handleGlobalKeydown);
		auth.onAuthStateChanged(handleAuthChange);
		if (elements.taxIdInput) {
			elements.taxIdInput.focus();
		}
	}

	initialize();
})();

