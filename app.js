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
		}
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
		roleTestBtn: document.getElementById("role-test-btn")
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

	function renderTeamTable(tab, employees) {
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

		if (!employees || employees.length === 0) {
			const emptyRow = createElement("tr", "table-row-empty");
			const cell = createElement("td", "table-cell-empty", "Немає записів для відображення.");
			cell.colSpan = 6;
			emptyRow.appendChild(cell);
			elements.tableBody.appendChild(emptyRow);
			return;
		}

		const headRow = createElement("tr");
		["Ім'я", "Підрозділ", "Посада", "Статус", "Ближча відпустка", "Залишок днів"].forEach(label => {
			headRow.appendChild(createElement("th", "", label));
		});
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
		renderTeamTable(currentTab, employees);
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
		auth.onAuthStateChanged(handleAuthChange);
		if (elements.taxIdInput) {
			elements.taxIdInput.focus();
		}
	}

	initialize();
})();

