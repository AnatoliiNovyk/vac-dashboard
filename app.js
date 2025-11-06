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
		editingEmployeeId: null
	};

	const modalState = {
		employeeId: null,
		periods: [],
		originalPeriods: [],
		errors: new Map(),
		hasOverlap: false,
		exceedsLimit: false,
		isDirty: false,
		isReadOnly: true,
		totalDays: 0,
		limitDays: 0,
		limitLabel: ""
	};

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
		roleTestBtn: document.getElementById("role-test-btn"),
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
		vacationModalError: document.getElementById("vacation-modal-error"),
		vacationModalWarning: document.getElementById("vacation-modal-warning"),
		vacationModalSave: document.getElementById("vacation-modal-save"),
		vacationModalCancel: document.getElementById("vacation-modal-cancel")
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

	function toggleHidden(element, hidden) {
		if (!element) {
			return;
		}
		element.classList.toggle("hidden", hidden);
	}

	function isHrUser(userDoc) {
		return Boolean(userDoc && (userDoc.isHR || userDoc.isHRHead));
	}

	function resetModalState() {
		modalState.employeeId = null;
		modalState.periods = [];
		modalState.originalPeriods = [];
		modalState.errors = new Map();
		modalState.hasOverlap = false;
		modalState.exceedsLimit = false;
		modalState.isDirty = false;
		modalState.isReadOnly = true;
		modalState.totalDays = 0;
		modalState.limitDays = 0;
		modalState.limitLabel = "";
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

	function updateModalLimitInfo(employee) {
		const totalDays = Number(employee?.total_vacation_days || modalState.limitDays || 0);
		const usedDays = Number(employee?.used_vacation_days || 0);
		modalState.limitDays = totalDays > 0 ? totalDays : 0;
		const remaining = modalState.limitDays > 0 ? Math.max(modalState.limitDays - modalState.totalDays, 0) : 0;
		if (modalState.limitDays > 0) {
			modalState.limitLabel = `Ліміт: ${modalState.limitDays} дн. (залишилось ${remaining} дн., використано ${usedDays} дн.)`;
		} else {
			modalState.limitLabel = "Ліміт: не задано";
		}
	}

	function validateModalPeriods(periods) {
		const errors = new Map();
		const sorted = periods.slice().sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));
		let hasOverlap = false;
		let totalDays = 0;

		const pushError = (periodId, message) => {
			if (!periodId || !message) {
				return;
			}
			const messages = errors.get(periodId) || [];
			if (!messages.includes(message)) {
				messages.push(message);
				errors.set(periodId, messages);
			}
		};

		sorted.forEach((period, index) => {
			if (!period.startDate) {
				pushError(period.id, "Заповніть дату початку.");
			}
			if (!period.endDate) {
				pushError(period.id, "Заповніть дату завершення.");
			}
			if (period.startDate && period.endDate) {
				if (period.startDate > period.endDate) {
					pushError(period.id, "Дата завершення не може бути раніше початку.");
				} else {
					totalDays += computeDays(period.startDate, period.endDate);
				}
			}
			if (index > 0) {
				const prev = sorted[index - 1];
				if (period.startDate && period.endDate && prev.startDate && prev.endDate && period.startDate <= prev.endDate) {
					hasOverlap = true;
					pushError(period.id, "Період перетинається з іншим записом.");
					pushError(prev.id, "Період перетинається з іншим записом.");
				}
			}
		});

		return { errors, hasOverlap, totalDays };
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
		modalState.hasOverlap = validation.hasOverlap;
		modalState.totalDays = validation.totalDays;
		modalState.exceedsLimit = modalState.limitDays > 0 && modalState.totalDays > modalState.limitDays;
		modalState.isDirty = !arePeriodsEqual(modalState.periods, modalState.originalPeriods);
	}

	function renderEmployeeSelector(userDoc) {
		const select = elements.vacationModalEmployeeSelect;
		const nameNode = elements.vacationModalEmployeeName;
		const employee = getEmployeeById(modalState.employeeId);
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

			const rowErrors = modalState.errors.get(period.id);
			if (rowErrors && rowErrors.length > 0) {
				row.classList.add("vacation-period-row--error");
				const errorBlock = createElement("div", "vacation-period-row-error");
				errorBlock.innerHTML = rowErrors.map(message => `<span>${message}</span>`).join("<br>");
				row.appendChild(errorBlock);
			}
			elements.vacationPeriodList.appendChild(row);
		});
	}

	function updateModalSummary() {
		if (elements.vacationPeriodsTotal) {
			elements.vacationPeriodsTotal.textContent = `Сумарно: ${modalState.totalDays} дн.`;
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
		const disabled = modalState.isReadOnly || hasBlockingOverlap || hasBlockingLimit || modalState.errors.size > 0 || !modalState.isDirty;
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
		modalState.isReadOnly = !isHrUser(appState.currentUser);
		const dataset = getVacationPeriodsForEmployees([employee.id]).map(clonePeriodForModal);
		sortModalPeriods(dataset);
		modalState.periods = dataset.map(period => ({ ...period }));
		modalState.originalPeriods = dataset.map(period => ({ ...period }));
		modalState.limitDays = Number(employee?.total_vacation_days || 0) > 0 ? Number(employee.total_vacation_days) : 0;
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
		updateModalLimitInfo(getEmployeeById(modalState.employeeId));
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
		updateModalLimitInfo(getEmployeeById(modalState.employeeId));
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
			modalState.periods = modalState.periods.filter(item => item.id !== periodId);
			calculateModalState();
			updateModalLimitInfo(getEmployeeById(modalState.employeeId));
			renderModalPeriods();
			updateModalSummary();
			renderModalWarnings();
			updateModalSaveState();
		}
	}

	async function commitModalChanges() {
		const employee = getEmployeeById(modalState.employeeId);
		if (!employee) {
			throw new Error("Профіль співробітника не знайдено.");
		}
		const collectionRef = db.collection("vacation_periods");
		const user = appState.currentUser;
		const now = firebase.firestore.FieldValue.serverTimestamp();
		const persistedIds = new Set();

		await db.runTransaction(async transaction => {
			for (const period of modalState.periods) {
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
				transaction.set(docRef, { ...payload, id: docRef.id }, { merge: true });
				persistedIds.add(docRef.id);
				if (!period.refId) {
					period.refId = docRef.id;
					period.id = docRef.id;
				}
			}
			for (const original of modalState.originalPeriods) {
				const docId = original.refId || original.id;
				if (docId && !persistedIds.has(docId)) {
					transaction.delete(collectionRef.doc(docId));
				}
			}
		});
		modalState.originalPeriods = modalState.periods.map(period => ({ ...period }));
		modalState.isDirty = false;
		calculateModalState();
		updateModalLimitInfo(employee);
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
			console.error("Не вдалося зберегти періоди відпустки:", error);
			if (elements.vacationModalError) {
				elements.vacationModalError.innerHTML = "Не вдалося зберегти зміни. Спробуйте ще раз.";
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
		const employee = getEmployeeById(modalState.employeeId);
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

	function handleVacationModalKeydown(event) {
		if (event.key === "Escape" && elements.vacationModal && !elements.vacationModal.classList.contains("hidden")) {
			event.preventDefault();
			closeVacationManagerModal();
		}
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
		if (tab === "Manager View" && userDoc.isManager && !userDoc.isHR && !userDoc.isHRHead) {
			const teamIds = new Set(getManagerEmployees(userDoc.id).map(emp => emp.id));
			filtered = filtered.filter(emp => teamIds.has(emp.id));
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
		toggleHidden(elements.filtersSection, false);
		buildFilters(userDoc);
	}

	function buildFilters(userDoc) {
		if (!elements.filtersGrid) {
			return;
		}
		clearNode(elements.filtersGrid);
		if (!userDoc || (!userDoc.isHR && !userDoc.isHRHead && !userDoc.isManager)) {
			return;
		}

		const departmentGroup = createElement("div", "filter-group");
		const departmentLabel = createElement("label", "filter-label", "Підрозділ");
		const departmentSelect = createElement("select", "filter-select");
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

		if (userDoc.isHR || userDoc.isHRHead) {
			const statusGroup = createElement("div", "filter-group");
			const statusLabel = createElement("label", "filter-label", "Статус");
			const statusSelect = createElement("select", "filter-select");
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
		}
	}

	function renderTeamCalendar(employees) {
		if (!elements.calendar) {
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
		const periods = [];
		employees.forEach(employee => {
			(employee.vacationPeriods || []).forEach(period => {
				periods.push({
					...period,
					employeeName: employee.fullName || `${employee.name} ${employee.surname}`.trim(),
					status: isCurrentVacation(period)
						? "У відпустці"
						: period.start_date > todayIso
							? "Заплановано"
							: "На роботі"
				});
			});
		});

		periods.sort((a, b) => a.start_date.localeCompare(b.start_date));

		if (periods.length === 0) {
			elements.calendar.innerHTML = "<em>Відпустки не знайдені.</em>";
			return;
		}

		const list = createElement("ul", "calendar-list");
		periods.forEach(period => {
			const item = createElement("li", `calendar-list-item calendar-list-item--${period.status === "У відпустці" ? "current" : period.status === "Заплановано" ? "planned" : "default"}`);
			const title = createElement("div", "calendar-list-item-title", period.employeeName || "Невідомий співробітник");
			const range = createElement("div", "calendar-list-item-range", formatRange(period.start_date, period.end_date));
			const status = createElement("span", "calendar-list-item-status", period.status);
			item.appendChild(title);
			item.appendChild(range);
			item.appendChild(status);
			list.appendChild(item);
		});

		elements.calendar.appendChild(list);
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

		if (!employees || employees.length === 0) {
			const emptyRow = createElement("tr", "table-row-empty");
			const cell = createElement("td", "table-cell-empty", "Немає записів для відображення.");
			cell.colSpan = canManageVacations ? 7 : 6;
			emptyRow.appendChild(cell);
			elements.tableBody.appendChild(emptyRow);
			return;
		}

		const headRow = createElement("tr");
		["Ім'я", "Підрозділ", "Посада", "Статус", "Ближча відпустка", "Залишок днів"].forEach(label => {
			headRow.appendChild(createElement("th", "", label));
		});
		if (canManageVacations) {
			headRow.appendChild(createElement("th", "", "Дії"));
		}
		elements.tableHead.appendChild(headRow);

		const todayIso = formatDate(new Date());

		employees.forEach(employee => {
			const row = createElement("tr");
			const fullName = employee.fullName || `${employee.name} ${employee.surname}`.trim();
			row.appendChild(createElement("td", "", fullName || "—"));
			row.appendChild(createElement("td", "", employee.departmentName || "—"));
			row.appendChild(createElement("td", "", employee.position || "—"));
			row.appendChild(createElement("td", "", employee.computedStatus || "На роботі"));

			const upcomingPeriod = (employee.vacationPeriods || [])
				.filter(period => period.start_date >= todayIso)
				.sort((a, b) => a.start_date.localeCompare(b.start_date))[0];

			row.appendChild(createElement("td", "", upcomingPeriod ? formatRange(upcomingPeriod.start_date, upcomingPeriod.end_date) : "—"));

			const balance = (employee.total_vacation_days || 0) - (employee.used_vacation_days || 0);
			row.appendChild(createElement("td", "", String(balance)));

			if (canManageVacations) {
				const actionsCell = createElement("td", "actions-column");
				const actionsWrapper = createElement("div", "action-buttons");
				const manageButton = createElement("button", "btn btn--secondary btn--small", "Періоди");
				manageButton.type = "button";
				manageButton.addEventListener("click", () => openVacationManagerModal(employee));
				actionsWrapper.appendChild(manageButton);
				actionsCell.appendChild(actionsWrapper);
				row.appendChild(actionsCell);
			}

			elements.tableBody.appendChild(row);
		});
	}

	function renderMyView(userDoc) {
		if (!elements.tableHead || !elements.tableBody || !elements.tableTitle || !elements.calendar) {
			return;
		}
		clearNode(elements.tableHead);
		clearNode(elements.tableBody);
		clearNode(elements.calendar);
		elements.tableTitle.textContent = "Мої відпустки";

		const headRow = createElement("tr");
		["Період", "Днів", "Статус"].forEach(label => headRow.appendChild(createElement("th", "", label)));
		elements.tableHead.appendChild(headRow);

		const periods = getVacationPeriodsForEmployees([userDoc.id]).sort((a, b) => a.start_date.localeCompare(b.start_date));

		if (periods.length === 0) {
			const emptyRow = createElement("tr", "table-row-empty");
			const cell = createElement("td", "table-cell-empty", "Відпусток ще не заплановано.");
			cell.colSpan = 3;
			emptyRow.appendChild(cell);
			elements.tableBody.appendChild(emptyRow);
			elements.calendar.innerHTML = "<em>Відпусток не знайдено.</em>";
			return;
		}

		periods.forEach(period => {
			const row = createElement("tr");
			row.appendChild(createElement("td", "", formatRange(period.start_date, period.end_date)));
			row.appendChild(createElement("td", "", String(period.days || computeDays(period.start_date, period.end_date))));
			row.appendChild(createElement("td", "", computeStatus([period])));
			elements.tableBody.appendChild(row);
		});

		const list = createElement("ul", "calendar-list");
		periods.forEach(period => {
			const item = createElement("li", `calendar-list-item calendar-list-item--${isCurrentVacation(period) ? "current" : "planned"}`);
			item.appendChild(createElement("div", "calendar-list-item-range", formatRange(period.start_date, period.end_date)));
			item.appendChild(createElement("span", "calendar-list-item-status", isCurrentVacation(period) ? "У відпустці" : "Заплановано"));
			list.appendChild(item);
		});
		elements.calendar.appendChild(list);
	}

	function renderMainContent(userDoc) {
		if (!userDoc) {
			return;
		}
		const currentTab = appState.currentTab;
		if (currentTab === "My View") {
			toggleHidden(elements.statsGrid, true);
			renderFiltersSection(userDoc, false);
			renderMyView(userDoc);
			return;
		}

		const showFilters = userDoc.isHR || userDoc.isHRHead || userDoc.isManager;
		renderFiltersSection(userDoc, showFilters);

		const employees = getEmployeesForRendering(currentTab, userDoc);
		renderStatsGrid(employees);
		renderTeamCalendar(employees);
		renderTeamTable(currentTab, employees, userDoc);
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

	function showLoginError(message) {
		if (!elements.loginError) {
			return;
		}
		elements.loginError.textContent = message;
		toggleHidden(elements.loginError, false);
	}

	function handleRoleTest() {
		if (!appState.currentUser) {
			console.warn("Користувач не авторизований.");
			return;
		}
		const user = appState.currentUser;
		const tabs = getVisibleTabs(user);
		console.group("Role Test");
		console.log("User ID:", user.id);
		console.log("Roles:", getRoleLabels(user).join(", "));
		console.log("Available Tabs:", tabs.join(", "));
		tabs.forEach(tabName => {
			const employees = getEmployeesForRendering(tabName, user);
			console.log(`[${tabName}]`, employees.map(emp => ({
				id: emp.id,
				name: emp.fullName,
				status: emp.computedStatus
			})));
		});
		console.groupEnd();
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
		}, error => console.error("Помилка слухача employees:", error));
		appState.listeners.push(employeesListener);

		const vacationsListener = db.collection("vacation_periods").onSnapshot(snapshot => {
			appData.vacationPeriods = snapshot.docs.map(normalizeVacationDoc);
			rerenderUI(appState.currentTab);
			refreshVacationManagerModal();
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
			if (elements.taxIdInput) {
				elements.taxIdInput.value = "";
			}
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
	}

	function initialize() {
		if (elements.loginForm) {
			elements.loginForm.addEventListener("submit", handleLogin);
		}
		if (elements.roleTestBtn) {
			elements.roleTestBtn.addEventListener("click", handleRoleTest);
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
		document.addEventListener("keydown", handleVacationModalKeydown);
		auth.onAuthStateChanged(handleAuthChange);
		if (elements.taxIdInput) {
			elements.taxIdInput.focus();
		}
	}

	initialize();
})();

