
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

    // --- Connect to Emulators for Local Development ---
    // Using the recommended connect...Emulator functions
    // This check ensures emulators are only used in development environments
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        console.log("РОБОТА В РЕЖИМІ ЛОКАЛЬНОЇ РОЗРОБКИ: Підключення до емуляторів...");
        
    firebase.auth().useEmulator("http://localhost:9099");
    firebase.firestore().useEmulator("localhost", 8085);
    firebase.functions().useEmulator("localhost", 5001);
        
        console.log("Auth, Firestore та Functions SDK підключено до емуляторів.");
    }

    // --- Global State & DOM Elements (remain the same) ---
    let appData = {
        employees: [],
        vacation_periods: [],
        departments: []
    };
    let appState = {
        currentUser: null,
        currentTab: '',
        currentDate: new Date(),
        isInitialized: false,
        listeners: []
    };
    const elements = {
        loginScreen: document.getElementById('login-screen'),
        loginForm: document.getElementById('login-form'),
        taxIdInput: document.getElementById('tax-id-input'),
        loginBtn: document.getElementById('login-btn'),
        loginError: document.getElementById('login-error'),
        dashboardContainer: document.getElementById('dashboard-container'),
        tabsNav: document.getElementById('tabs-nav'),
        currentUserName: document.getElementById('current-user-name'),
        currentUserRole: document.getElementById('current-user-role'),
    };

    // --- Main Application Flow ---
    document.addEventListener('DOMContentLoaded', () => {
        setupEventListeners();
        setupAuthListener();
    });

    function setupAuthListener() {
        auth.onAuthStateChanged(async (user) => {
            appState.listeners.forEach(unsubscribe => unsubscribe());
            appState.listeners = [];

            if (user) {
                await initializeApp(user);
            } else {
                appState.currentUser = null;
                appState.isInitialized = false;
                showLoginState();
            }
        });
    }

    async function handleLogin(event) {
        event.preventDefault();
        const taxId = elements.taxIdInput.value.trim();
        if (!taxId) return;

        elements.loginBtn.disabled = true;
        elements.loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вхід...';
        elements.loginError.classList.add('hidden');

        try {
            // Using the new modular syntax for httpsCallable
            const signInWithTaxId = firebase.functions().httpsCallable('signInWithTaxId');
            const result = await signInWithTaxId({ tax_id: taxId });
            
            const token = result.data.token;
            if (!token) {
                throw new Error("Не вдалося отримати токен автентифікації.");
            }

            // Using the new modular syntax for signInWithCustomToken
            await firebase.auth().signInWithCustomToken(token);

        } catch (error) {
            console.error("Помилка входу:", error);
            const errorMessage = error.message || "Сталася невідома помилка.";
            elements.loginError.textContent = `Помилка: ${errorMessage}`;
            elements.loginError.classList.remove('hidden');
            elements.loginBtn.disabled = false;
            elements.loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Увійти';
        }
    }

    async function initializeApp(authUser) {
      try {
        showLoadingState();
        
        const userDoc = await db.collection('employees').doc(authUser.uid).get();
        if (!userDoc.exists) {
            throw new Error("Ваш профіль співробітника не знайдено в базі даних.");
        }
        appState.currentUser = { id: userDoc.id, ...userDoc.data() };

        const [departmentsSnap, allEmployeesSnap] = await Promise.all([
          db.collection('departments').get(),
          db.collection('employees').get()
        ]);

        appData.departments = departmentsSnap.docs.map(doc => doc.data().name);
        appData.employees = allEmployeesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log(`Завантажено: ${appData.employees.length} співробітників, ${appData.departments.length} департаментів.`);

        showDashboardState();
        await setupTabs(); 

        appState.isInitialized = true;
        console.log("Ініціалізація успішно завершена.");
        
        setupRealtimeListeners();

      } catch (error) {
        console.error("Критична помилка під час ініціалізації додатку:", error);
        auth.signOut();
      }
    }

    function showLoadingState() {
        elements.loginScreen.style.display = 'flex'; 
        elements.loginForm.style.display = 'none';
        document.querySelector('#login-screen h2').textContent = "Завантаження даних...";
        document.querySelector('#login-screen p').textContent = "Будь ласка, зачекайте.";
        elements.dashboardContainer.style.display = 'none';
    }

    function showLoginState() {
        elements.loginScreen.style.display = 'flex';
        elements.loginForm.style.display = 'block';
        document.querySelector('#login-screen h2').textContent = "Вхід до системи";
        document.querySelector('#login-screen p').textContent = "Будь ласка, введіть ваш ідентифікаційний номер (ІПН), щоб увійти.";
        elements.dashboardContainer.style.display = 'none';
        elements.loginBtn.disabled = false;
        elements.loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Увійти';
        elements.taxIdInput.value = '';
        elements.loginError.classList.add('hidden');
    }

    function showDashboardState() {
        elements.loginScreen.style.display = 'none';
        elements.dashboardContainer.style.display = 'block';
    }

        function setupEventListeners() {
            elements.loginForm.addEventListener('submit', handleLogin);
            const roleTestBtn = document.getElementById('role-test-btn');
            if (roleTestBtn) {
                roleTestBtn.onclick = runRoleTest;
            }
        }
    // Автоматичний тест ролі
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
                console.log(`  ${emp.name} ${emp.surname || ''} | ${emp.department || ''} | Залишок: ${(emp.total_vacation_days !== undefined && emp.used_vacation_days !== undefined) ? (emp.total_vacation_days - emp.used_vacation_days) : ''} | Статус: ${emp.status || ''}`);
                // Календар
                const periods = (window.vacationPeriods || []).filter(vp => vp.employee_id === emp.id);
                if (periods.length) {
                    console.log('  Відпустки:');
                    periods.forEach(vp => console.log(`    ${vp.start_date} — ${vp.end_date} (${vp.days} днів)`));
                } else {
                    console.log('  Відпусток немає');
                }
            }
        });
        console.log('--- Кінець тесту ---');
    }

    function setupRealtimeListeners() {
      const empListener = db.collection('employees').onSnapshot(snapshot => {
        appData.employees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (appState.isInitialized) rerenderUI();
      }, err => console.error("Listener error (employees):", err));
      appState.listeners.push(empListener);
    }

    async function rerenderUI() {
        if(!appState.currentUser) return;
        updateUserInfo();
        populateFilterDropdowns();
        await applyFilters();
    }

        async function setupTabs() {
            // Визначаємо вкладки згідно ролі
            const roleFlags = appState.currentUser?.roleFlags || {};
            const tabsNav = elements.tabsNav;
            if (!tabsNav) return;
            tabsNav.innerHTML = '';

            let tabs = [];
            if (roleFlags.is_hr && roleFlags.is_manager) {
                // HR-менеджер: HR, Manager, My View
                tabs = ['HR', 'Manager', 'My View'];
            } else if (roleFlags.is_hr) {
                // HR: HR, My View
                tabs = ['HR', 'My View'];
            } else if (roleFlags.is_manager) {
                // Manager: Manager, My View
                tabs = ['Manager', 'My View'];
            } else {
                // Employee: My View
                tabs = ['My View'];
            }

            tabs.forEach(tab => {
                const tabEl = document.createElement('button');
                tabEl.className = 'tab-btn';
                tabEl.textContent = tab;
                tabEl.onclick = () => {
                    appState.currentTab = tab;
                    renderTabContent(tab);
                };
                tabsNav.appendChild(tabEl);
            });
            // Відразу рендеримо контент для першої вкладки
            if (tabs.length > 0) {
                appState.currentTab = tabs[0];
                renderTabContent(tabs[0]);
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
        const periods = (window.vacationPeriods || []).filter(vp => vp.employee_id === emp.id);
        if (!periods.length) {
            calendar.innerHTML = '<em>Відпусток не знайдено.</em>';
            return;
        }
        calendar.innerHTML = `<ul>${periods.map(vp => `<li>${vp.start_date} — ${vp.end_date} (${vp.days} днів)</li>`).join('')}</ul>`;
    }
        }

    // Include all other necessary UI and helper functions here...
    // e.g., updateUserInfo, populateFilterDropdowns, applyFilters, getTabsForCurrentUser, etc.

})();
