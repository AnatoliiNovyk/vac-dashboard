
// Self-executing function to encapsulate Firebase setup and app logic
(function() {
    // --- Firebase Initialization with Modular SDKs ---
    // Використовуємо window.firebaseConfig, якщо він є
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

    async function handleLogin(event) {
        event.preventDefault();
        const taxId = elements.taxIdInput.value.trim();
        if (!taxId) return;

        elements.loginBtn.disabled = true;
        elements.loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вхід...';
        elements.loginError.classList.add('hidden');

        try {
            const signInWithTaxId = firebase.functions().httpsCallable('signInWithTaxId');
            const result = await signInWithTaxId({ tax_id: taxId });

            const token = result.data.token;
            if (!token) {
                throw new Error("Не вдалося отримати токен автентифікації.");
            }

            await firebase.auth().signInWithCustomToken(token);
        } catch (error) {
            console.error("Помилка входу:", error);
            const errorMessage = error.message || "Сталася невідома помилка.";
            elements.loginError.textContent = `Помилка: ${errorMessage}`;
            elements.loginError.classList.remove('hidden');
            elements.loginBtn.disabled = false;
            elements.loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Увійти';
        }
                console.log('[DEBUG] employees loaded:', appData.employees.length);
                rerenderUI();
    function runRoleTest() {
        if (!appState.currentUser) {
            console.warn('Користувач не авторизований');
            return;
        }
        const roleFlags = appState.currentUser.roleFlags || {};
        let tabs = [];
        if (roleFlags.is_hr && roleFlags.is_manager) {
            tabs = ['HR', 'Manager', 'My View'];
        } else if (roleFlags.is_hr) {
            tabs = ['HR', 'My View'];
        } else if (roleFlags.is_manager) {
            tabs = ['Manager', 'My View'];
        } else {
            tabs = ['My View'];
        }
        console.log('--- Тест ролі ---');
        console.log('ID:', appState.currentUser.id);
        console.log('Роль:', JSON.stringify(roleFlags));
        console.log('Вкладки:', tabs.join(', '));
        tabs.forEach(tab => {
            if (tab === 'HR') {
                console.log('[HR] Кількість співробітників:', appData.employees.length);
                appData.employees.forEach(emp => {
                    console.log(`  ${emp.name} ${emp.surname || ''} | ${emp.department || ''} | Залишок: ${(emp.total_vacation_days !== undefined && emp.used_vacation_days !== undefined) ? (emp.total_vacation_days - emp.used_vacation_days) : ''} | Статус: ${emp.status || ''}`);
                });
            } else if (tab === 'Manager') {
                const managed = appData.employees.filter(emp => emp.manager_id === appState.currentUser.id);
                console.log('[Manager] Кількість підлеглих:', managed.length);
                managed.forEach(emp => {
                    console.log(`  ${emp.name} ${emp.surname || ''} | ${emp.department || ''} | Залишок: ${(emp.total_vacation_days !== undefined && emp.used_vacation_days !== undefined) ? (emp.total_vacation_days - emp.used_vacation_days) : ''} | Статус: ${emp.status || ''}`);
                });
            } else if (tab === 'My View') {
                const emp = appState.currentUser;
                console.log('[My View]');
                console.log(`  ${emp.name} ${emp.surname || ''} | ${emp.department || ''} | Залишок: ${(emp.total_vacation_days !== undefined && emp.used_vacation_days !== undefined) ? (emp.total_vacation_days - emp.used_vакуацію`); -- (Oops text delim?).
            appState.listeners.push(empListener);

            const vacationListener = db.collection('vacation_periods').onSnapshot(snapshot => {
                appData.vacationPeriods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                console.log('[DEBUG] vacation periods loaded:', appData.vacationPeriods.length);
                rerenderUI();
            }, err => console.error('Listener error (vacation_periods):', err));
            appState.listeners.push(vacationListener);
        }

        async function rerenderUI() {
            if (!appState.currentUser) return;

            const roleFlags = appState.currentUser.roleFlags || {};
            const statsGrid = document.getElementById('stats-grid');
            const filtersSection = document.getElementById('filters-section');
            const filtersGrid = document.getElementById('filters-grid');
            const isEmployeeOnly = !roleFlags.is_hr && !roleFlags.is_manager;
            const isMyView = appState.currentTab === 'My View';

            if (isEmployeeOnly || isMyView) {
                if (statsGrid) {
                    statsGrid.innerHTML = '';
                    statsGrid.classList.add('hidden');
                }
                if (filtersSection) filtersSection.classList.add('hidden');
                if (filtersGrid) filtersGrid.innerHTML = '';

                if (elements.currentUserName) {
                    elements.currentUserName.textContent = appState.currentUser.name || '';
                }
                if (elements.currentUserRole && isEmployeeOnly) {
                    elements.currentUserRole.textContent = 'Employee';
                }

                renderEmployeeCalendarAndTable();
            } else {
                if (statsGrid) statsGrid.classList.remove('hidden');
                if (filtersSection) filtersSection.classList.remove('hidden');

                if (elements.currentUserName) {
                    elements.currentUserName.textContent = appState.currentUser.name || '';
                }
                if (elements.currentUserRole) {
                    let roleText = '';
                    if (roleFlags.is_hr && roleFlags.is_manager) roleText = 'HR, Manager';
                    else if (roleFlags.is_hr) roleText = 'HR';
                    else if (roleFlags.is_manager) roleText = 'Manager';
                    elements.currentUserRole.textContent = roleText;
                }

                renderStatsGrid();
                renderFiltersSection();
                renderContentArea();
            }
        }

        async function setupTabs() {
            // Визначаємо вкладки згідно ролі
            const roleFlags = appState.currentUser?.roleFlags || {};
            const tabsNav = elements.tabsNav;
            if (!tabsNav) return;
            tabsNav.innerHTML = '';

            let tabs = [];
            if (roleFlags.is_hr && roleFlags.is_manager) {
                tabs = ['HR', 'Manager', 'My View'];
            } else if (roleFlags.is_hr) {
                tabs = ['HR', 'My View'];
            } else if (roleFlags.is_manager) {
                tabs = ['Manager', 'My View'];
            } else {
                tabs = ['My View'];
            }

            tabs.forEach((tab, idx) => {
                const tabEl = document.createElement('button');
                tabEl.className = 'tab-button' + (idx === 0 ? ' active' : '');
                tabEl.textContent = tab;
                tabEl.onclick = () => {
                    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                    tabEl.classList.add('active');
                    appState.currentTab = tab;
                    rerenderUI();
                };
                tabsNav.appendChild(tabEl);
            });
            // Відразу рендеримо контент для першої вкладки
            if (tabs.length > 0) {
                appState.currentTab = tabs[0];
                rerenderUI();
            }
    // Рендер контенту для вкладок
    function renderTabContent(tab) {
        const tabContent = document.getElementById('tab-content');
        if (!tabContent) return;
        tabContent.innerHTML = '';

        // Фільтри
        let filterDepartment = '';
        let filterStatus = '';
        if (tab === 'HR' || tab === 'Manager') {
            // Рендер фільтрів
            const depOptions = appData.departments.map(dep => `<option value="${dep}">${dep}</option>`).join('');
            const statusOptions = ['У відпустці', 'Заплановано', 'На роботі'].map(st => `<option value="${st}">${st}</option>`).join('');
            tabContent.innerHTML += `
                <div class="filters">
                    <label>Департамент: <select id="filter-department"><option value="">Всі</option>${depOptions}</select></label>
                    <label>Статус: <select id="filter-status"><option value="">Всі</option>${statusOptions}</select></label>
                </div>
            `;
        }

        // HR View
        if (tab === 'HR') {
            tabContent.innerHTML += `<h2>HR View</h2>
                <table class="table">
                    <thead><tr><th>Ім'я</th><th>Відділ</th><th>Залишок</th><th>Статус</th></tr></thead>
                    <tbody id="hr-table-body"></tbody>
                </table>`;
            // Рендеримо таблицю після вибору фільтрів
            setTimeout(() => renderHRTable(), 0);
        }
        // Manager View
        else if (tab === 'Manager') {
            tabContent.innerHTML += `<h2>Manager View</h2>
                <table class="table">
                    <thead><tr><th>Ім'я</th><th>Відділ</th><th>Залишок</th><th>Статус</th></tr></thead>
                    <tbody id="manager-table-body"></tbody>
                </table>`;
            setTimeout(() => renderManagerTable(), 0);
        }
        // My View
        else if (tab === 'My View') {
            const emp = appState.currentUser;
            tabContent.innerHTML += `<h2>My View</h2>
                <div>
                    <strong>Ім'я:</strong> ${emp.name} ${emp.surname || ''}<br>
                    <strong>Відділ:</strong> ${emp.department || ''}<br>
                    <strong>Залишок:</strong> ${(emp.total_vacation_days !== undefined && emp.used_vacation_days !== undefined) ? (emp.total_vacation_days - emp.used_vacation_days) : ''}<br>
                    <strong>Статус:</strong> ${emp.status || ''}
                </div>
                <h3>Календар відпусток</h3>
                <div id="vacation-calendar"></div>
            `;
            setTimeout(() => renderVacationCalendar(emp), 0);
        }

        // Фільтри: обробка змін
        if (tab === 'HR') {
            setTimeout(() => {
                document.getElementById('filter-department').onchange = renderHRTable;
                document.getElementById('filter-status').onchange = renderHRTable;
            }, 0);
        } else if (tab === 'Manager') {
            setTimeout(() => {
                document.getElementById('filter-department').onchange = renderManagerTable;
                document.getElementById('filter-status').onchange = renderManagerTable;
            }, 0);
        }
    }

    // HR Table
    function renderHRTable() {
        const tbody = document.getElementById('hr-table-body');
        if (!tbody) return;
        const dep = document.getElementById('filter-department').value;
        const status = document.getElementById('filter-status').value;
        let filtered = appData.employees;
        if (dep) filtered = filtered.filter(emp => emp.department === dep);
        if (status) filtered = filtered.filter(emp => emp.status === status);
        tbody.innerHTML = filtered.map(emp => `
            <tr>
                <td>${emp.name} ${emp.surname || ''}</td>
                <td>${emp.department || ''}</td>
                <td>${(emp.total_vacation_days !== undefined && emp.used_vacation_days !== undefined) ? (emp.total_vacation_days - emp.used_vacation_days) : ''}</td>
                <td>${emp.status || ''}</td>
            </tr>
        `).join('');
    }

    // Manager Table
    function renderManagerTable() {
        const tbody = document.getElementById('manager-table-body');
        if (!tbody) return;
        const dep = document.getElementById('filter-department').value;
        const status = document.getElementById('filter-status').value;
        let filtered = appData.employees.filter(emp => emp.manager_id === appState.currentUser.id);
        if (dep) filtered = filtered.filter(emp => emp.department === dep);
        if (status) filtered = filtered.filter(emp => emp.status === status);
        tbody.innerHTML = filtered.map(emp => `
            <tr>
                <td>${emp.name} ${emp.surname || ''}</td>
                <td>${emp.department || ''}</td>
                <td>${(emp.total_vacation_days !== undefined && emp.used_vacation_days !== undefined) ? (emp.total_vacation_days - emp.used_vacation_days) : ''}</td>
                <td>${emp.status || ''}</td>
            </tr>
        `).join('');
    }

    // Vacation Calendar (My View)
    function renderVacationCalendar(emp) {
        const calendar = document.getElementById('vacation-calendar');
        if (!calendar) return;
        // Пошук відпусток поточного співробітника
        // vacation_periods: [{employee_id, start_date, end_date, days}]
    const periods = appData.vacationPeriods.filter(vp => vp.employee_id === emp.id);
        if (!periods.length) {
            calendar.innerHTML = '<em>Відпусток не знайдено.</em>';
            return;
        }
        calendar.innerHTML = `<ul>${periods.map(vp => `<li>${vp.start_date} — ${vp.end_date} (${vp.days} днів)</li>`).join('')}</ul>`;
    }

    // Include all other necessary UI and helper functions here...
    // --- Advanced UI Rendering Functions ---
    function renderStatsGrid() {
        const statsGrid = document.getElementById('stats-grid');
        if (!statsGrid) return;
        // Example stats: total employees, on vacation, planned, at work
        let employees = appData.employees;
        if (appState.currentTab === 'Manager') {
            employees = employees.filter(emp => emp.manager_id === appState.currentUser.id);
        } else if (appState.currentTab === 'My View') {
            employees = [appState.currentUser];
        }
        const total = employees.length;
        const onVacation = employees.filter(e => e.status === 'У відпустці').length;
        const planned = employees.filter(e => e.status === 'Заплановано').length;
        const atWork = employees.filter(e => e.status === 'На роботі').length;
        statsGrid.innerHTML = `
            <div class="stat-card stat-card--total">
                <div class="stat-card-icon"><i class="fas fa-users"></i></div>
                <div class="stat-card-value">${total}</div>
                <div class="stat-card-label">Всього співробітників</div>
            </div>
            <div class="stat-card stat-card--approved">
                <div class="stat-card-icon"><i class="fas fa-plane-departure"></i></div>
                <div class="stat-card-value">${onVacation}</div>
                <div class="stat-card-label">У відпустці</div>
            </div>
            <div class="stat-card stat-card--pending">
                <div class="stat-card-icon"><i class="fas fa-calendar-plus"></i></div>
                <div class="stat-card-value">${planned}</div>
                <div class="stat-card-label">Заплановано</div>
            </div>
            <div class="stat-card stat-card--info">
                <div class="stat-card-icon"><i class="fas fa-briefcase"></i></div>
                <div class="stat-card-value">${atWork}</div>
                <div class="stat-card-label">На роботі</div>
            </div>
        `;
    }

    function renderFiltersSection() {
        const filtersGrid = document.getElementById('filters-grid');
        if (!filtersGrid) return;
        // Only show filters for HR and Manager
        if (appState.currentTab === 'HR' || appState.currentTab === 'Manager') {
            const depOptions = appData.departments.map(dep => `<option value="${dep}">${dep}</option>`).join('');
            const statusOptions = ['У відпустці', 'Заплановано', 'На роботі'].map(st => `<option value="${st}">${st}</option>`).join('');
            filtersGrid.innerHTML = `
                <div class="filter-group">
                    <label for="filter-department" class="form-label">Департамент</label>
                    <select id="filter-department" class="form-control">
                        <option value="">Всі</option>
                        ${depOptions}
                    </select>
                </div>
                <div class="filter-group">
                    <label for="filter-status" class="form-label">Статус</label>
                    <select id="filter-status" class="form-control">
                        <option value="">Всі</option>
                        ${statusOptions}
                    </select>
                </div>
            `;
            setTimeout(() => {
                document.getElementById('filter-department').onchange = rerenderUI;
                document.getElementById('filter-status').onchange = rerenderUI;
            }, 0);
        } else {
            filtersGrid.innerHTML = '';
        }
    }

    function renderContentArea() {
        // For Employee (My View), show calendar and table for self
        if (appState.currentTab === 'My View') {
            renderEmployeeCalendarAndTable();
        } else {
            renderCalendarSection();
            renderTableSection();
        }
    }

    function renderEmployeeCalendarAndTable() {
        // Render calendar section
        const calendar = document.getElementById('vacation-calendar');
        if (calendar) {
            const emp = appState.currentUser;
            const periods = appData.vacationPeriods.filter(vp => vp.employee_id === emp.id);
            if (!periods.length) {
                calendar.innerHTML = '<em>Відпусток не знайдено.</em>';
            } else {
                calendar.innerHTML = `<ul>${periods.map(vp => `<li>${vp.start_date} — ${vp.end_date} (${vp.days} днів)</li>`).join('')}</ul>`;
            }
        }
        // Render table section
        const tableTitle = document.getElementById('table-title');
        const tableHead = document.getElementById('table-head');
        const tableBody = document.getElementById('table-body');
        if (tableTitle && tableHead && tableBody) {
            tableTitle.textContent = 'Мої відпустки';
            tableHead.innerHTML = `<tr>
                <th>Період</th>
                <th>Днів</th>
                <th>Тип</th>
                <th>Менеджер</th>
            </tr>`;
            const emp = appState.currentUser;
            const periods = appData.vacationPeriods.filter(vp => vp.employee_id === emp.id);
            if (!periods.length) {
                tableBody.innerHTML = `<tr><td colspan="4"><em>Відпусток не знайдено.</em></td></tr>`;
            } else {
                tableBody.innerHTML = periods.map(vp => `
                    <tr>
                        <td>${vp.start_date} — ${vp.end_date}</td>
                        <td>${vp.days}</td>
                        <td>${vp.type || ''}</td>
                        <td>${getManagerName(vp.manager_id) || ''}</td>
                    </tr>
                `).join('');
            }
        }

        // Допоміжна функція для пошуку імені менеджера
        function getManagerName(managerId) {
            if (!managerId) return '';
            const manager = appData.employees.find(e => e.id == managerId);
            return manager ? manager.name : '';
        }
    }

    function renderCalendarSection() {
        const calendar = document.getElementById('vacation-calendar');
        if (!calendar) return;
        let employee = appState.currentUser;
        if (appState.currentTab === 'Manager') {
            // Show nothing or summary for manager
            calendar.innerHTML = '<em>Календар доступний лише для My View.</em>';
            return;
        }
        // My View: show employee's vacation periods
    const periods = appData.vacationPeriods.filter(vp => vp.employee_id === employee.id);
        if (!periods.length) {
            calendar.innerHTML = '<em>Відпусток не знайдено.</em>';
            return;
        }
        calendar.innerHTML = `<ul>${periods.map(vp => `<li>${vp.start_date} — ${vp.end_date} (${vp.days} днів)</li>`).join('')}</ul>`;
    }

    function renderTableSection() {
        const tableTitle = document.getElementById('table-title');
        const tableHead = document.getElementById('table-head');
        const tableBody = document.getElementById('table-body');
        if (!tableTitle || !tableHead || !tableBody) return;
        let employees = appData.employees;
        if (appState.currentTab === 'Manager') {
            employees = employees.filter(emp => emp.manager_id === appState.currentUser.id);
        } else if (appState.currentTab === 'My View') {
            employees = [appState.currentUser];
        }
        // Apply filters
        if (appState.currentTab === 'HR' || appState.currentTab === 'Manager') {
            const dep = document.getElementById('filter-department')?.value;
            const status = document.getElementById('filter-status')?.value;
            if (dep) employees = employees.filter(emp => emp.department === dep);
            if (status) employees = employees.filter(emp => emp.status === status);
        }
        // Table columns
        tableTitle.textContent = appState.currentTab === 'HR' ? 'HR View' : appState.currentTab === 'Manager' ? 'Manager View' : 'My View';
        tableHead.innerHTML = `<tr><th>Ім'я</th><th>Відділ</th><th>Залишок</th><th>Статус</th></tr>`;
        tableBody.innerHTML = employees.map(emp => `
            <tr>
                <td>${emp.name} ${emp.surname || ''}</td>
                <td>${emp.department || ''}</td>
                <td>${(emp.total_vacation_days !== undefined && emp.used_vacation_days !== undefined) ? (emp.total_vacation_days - emp.used_vacation_days) : ''}</td>
                <td><span class="status ${getStatusClass(emp.status)}">${emp.status || ''}</span></td>
            </tr>
        `).join('');
    }

    function getStatusClass(status) {
        if (status === 'У відпустці') return 'status--approved';
        if (status === 'Заплановано') return 'status--pending';
        if (status === 'На роботі') return 'status--info';
        return '';
    }
    // e.g., updateUserInfo, populateFilterDropdowns, applyFilters, getTabsForCurrentUser, etc.

})();
