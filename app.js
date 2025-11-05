// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- Global State ---
let appData = {
  employees: [],
  vacation_periods: [],
  departments: []
};
let appState = {
  currentUser: null,
  currentRole: '',
  currentTab: '',
  currentDate: new Date(),
  isInitialized: false,
};

// --- DOM Elements ---
const elements = {
  welcomeScreen: document.getElementById('welcome-screen'),
  welcomeMessage: document.querySelector('#welcome-screen p'),
  dashboardContainer: document.getElementById('dashboard-container'),
  roleSwitcher: document.getElementById('role-switcher'),
  tabsNav: document.getElementById('tabs-nav'),
  currentUserName: document.getElementById('current-user-name'),
  currentUserRole: document.getElementById('current-user-role'),
  totalDays: document.getElementById('total-days'),
  usedDays: document.getElementById('used-days'),
  remainingDays: document.getElementById('remaining-days'),
  filtersSection: document.getElementById('filters-section'),
  departmentFilterGroup: document.getElementById('department-filter-group'),
  departmentFilter: document.getElementById('department-filter'),
  statusFilterGroup: document.getElementById('status-filter-group'),
  statusFilter: document.getElementById('status-filter'),
  clearFilters: document.getElementById('clear-filters'),
  calendarGrid: document.getElementById('calendar-grid'),
  currentMonthYear: document.getElementById('current-month-year'),
  prevMonth: document.getElementById('prev-month'),
  nextMonth: document.getElementById('next-month'),
  vacationsTable: document.getElementById('vacations-table'),
  vacationsTableHeader: document.querySelector('#vacations-table thead'),
  vacationsTableBody: document.getElementById('vacations-table-body'),
  addVacationBtn: document.getElementById('add-vacation-btn'),
  vacationFormModal: document.getElementById('vacation-form-modal'),
  vacationFormModalClose: document.getElementById('vacation-form-modal-close'),
  vacationForm: document.getElementById('vacation-form'),
  vacationFormTitle: document.getElementById('vacation-form-title'),
  vacationIdInput: document.getElementById('vacation-id-input'),
  startDateInput: document.getElementById('start-date-input'),
  endDateInput: document.getElementById('end-date-input'),
  vacationDaysInput: document.getElementById('vacation-days-input'),
  cancelVacationFormBtn: document.getElementById('cancel-vacation-form-btn'),
  employeeSelectGroup: document.getElementById('employee-select-group'),
  employeeSelect: document.getElementById('employee-select')
};


// --- Main Application Flow ---

document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
  try {
    // 1. Show loading screen immediately
    showLoadingState("Завантаження початкових даних...");
    console.log("Ініціалізація... Стан завантаження показано.");

    // 2. Fetch all initial data
    console.log("Запит даних з Firestore...");
    const [employeesSnap, vacationsSnap, departmentsSnap] = await Promise.all([
      db.collection('employees').get(),
      db.collection('vacation_periods').get(),
      db.collection('departments').get()
    ]);
    console.log(`Завантажено: ${employeesSnap.size} співробітників, ${vacationsSnap.size} періодів відпусток, ${departmentsSnap.size} департаментів.`);

    // 3. Populate global data object
    appData.employees = employeesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    appData.vacation_periods = vacationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    appData.departments = departmentsSnap.docs.map(doc => doc.data().name);
    console.log("Глобальні дані заповнено.");

    // 4. Check if essential data is loaded
    if (!appData.employees.length) {
      showErrorState("Помилка: не вдалося завантажити дані співробітників. База даних може бути порожньою або правила безпеки блокують доступ.");
      console.error("Критична помилка: Масив співробітників порожній після завантаження.");
      return;
    }

    // 5. Setup UI and event listeners
    console.log("Налаштування обробників подій та початкового інтерфейсу...");
    setupEventListeners();
    handleRoleChange(elements.roleSwitcher.value); // Set initial view

    // 6. Everything is ready, show the dashboard
    showDashboardState();
    appState.isInitialized = true;
    console.log("Ініціалізація успішно завершена. Дашборд показано.");

    // 7. Attach real-time listeners for future updates
    setupRealtimeListeners();
    console.log("Слухачі реального часу підключено.");

  } catch (error) {
    console.error("Критична помилка під час ініціалізації додатку:", error);
    showErrorState(`Помилка завантаження: ${error.message}. Перевірте консоль розробника (F12) для деталей.`);
  }
}

// --- Display State Functions (using direct styles for reliability) ---

function showLoadingState(message) {
    elements.welcomeMessage.textContent = message;
    elements.welcomeMessage.style.color = '';
    elements.welcomeScreen.style.display = 'flex';
    elements.dashboardContainer.style.display = 'none';
}

function showErrorState(errorMessage) {
    elements.welcomeMessage.textContent = errorMessage;
    elements.welcomeMessage.style.color = 'red';
    elements.welcomeScreen.style.display = 'flex';
    elements.dashboardContainer.style.display = 'none';
}

function showDashboardState() {
    elements.welcomeScreen.style.display = 'none';
    elements.dashboardContainer.style.display = 'block';
}


function setupEventListeners() {
  elements.roleSwitcher.addEventListener('change', (e) => handleRoleChange(e.target.value));
  elements.clearFilters.addEventListener('click', clearAndApplyFilters);
  elements.prevMonth.addEventListener('click', () => changeMonth(-1));
  elements.nextMonth.addEventListener('click', () => changeMonth(1));
  elements.departmentFilter.addEventListener('change', applyFilters);
  elements.statusFilter.addEventListener('change', applyFilters);
  elements.addVacationBtn.addEventListener('click', () => openVacationForm());
  elements.vacationFormModalClose.addEventListener('click', () => closeModal(elements.vacationFormModal));
  elements.cancelVacationFormBtn.addEventListener('click', () => closeModal(elements.vacationFormModal));
  elements.vacationForm.addEventListener('submit', handleVacationFormSubmit);
  elements.startDateInput.addEventListener('change', calculateVacationDays);
  elements.endDateInput.addEventListener('change', calculateVacationDays);
}

function setupRealtimeListeners() {
  db.collection('employees').onSnapshot(snapshot => {
    appData.employees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (appState.isInitialized) rerenderUI();
  }, err => console.error("Listener error (employees):", err));

  db.collection('vacation_periods').onSnapshot(snapshot => {
    appData.vacation_periods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (appState.isInitialized) rerenderUI();
  }, err => console.error("Listener error (vacation_periods):", err));

  db.collection('departments').onSnapshot(snapshot => {
    appData.departments = snapshot.docs.map(doc => doc.data().name);
    if (appState.isInitialized) populateFilterDropdowns();
  }, err => console.error("Listener error (departments):", err));
}

// --- UI & State Management ---

function handleRoleChange(selectedRole) {
  appState.currentRole = selectedRole;

  switch(appState.currentRole) {
    case 'hr':
      appState.currentUser = appData.employees.find(emp => emp.is_hr_manager) || appData.employees.find(emp => emp.role === 'hr');
      break;
    case 'manager':
      appState.currentUser = appData.employees.find(emp => emp.role === 'manager' && !emp.is_hr_manager);
      break;
    case 'employee':
      appState.currentUser = appData.employees.find(emp => emp.role === 'employee');
      break;
    default:
      appState.currentUser = appData.employees[0];
  }

  if (!appState.currentUser) {
    console.warn(`Не знайдено представника для ролі: ${appState.currentRole}. Використовується перший співробітник.`);
    appState.currentUser = appData.employees[0];
  }
  
  elements.roleSwitcher.value = selectedRole;
  setupTabs();
  rerenderUI();
}

function rerenderUI() {
    if(!appState.currentUser) return;
    updateUserInfo();
    populateFilterDropdowns();
    applyFilters();
}

function setupTabs() {
  elements.tabsNav.innerHTML = '';
  const tabs = getTabsForRole(appState.currentRole, appState.currentUser.is_hr_manager);
  
  tabs.forEach((tab) => {
    const tabButton = document.createElement('button');
    tabButton.className = 'tab-button';
    tabButton.dataset.tabKey = tab.key;
    tabButton.innerHTML = `<i class="${tab.icon}"></i> ${tab.label}`;
    tabButton.addEventListener('click', () => switchTab(tab.key));
    elements.tabsNav.appendChild(tabButton);
  });

  if (tabs.length > 0) {
      switchTab(tabs[0].key);
  }
}

function switchTab(tabKey) {
  appState.currentTab = tabKey;

  document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tabKey === tabKey);
  });
  
  updateUIForTab();
}

function updateUIForTab() {
    const isHRView = appState.currentTab === 'hr-all';
    const isManagerView = appState.currentTab === 'manager-team';

    elements.filtersSection.style.display = (isHRView || isManagerView) ? 'block' : 'none';
    elements.departmentFilterGroup.style.display = isHRView ? 'block' : 'none';
    elements.statusFilterGroup.style.display = (isHRView || isManagerView) ? 'block' : 'none';
    
    if (isManagerView) {
        elements.departmentFilterGroup.style.display = 'none';
    }

    elements.addVacationBtn.classList.toggle('hidden', appState.currentRole !== 'hr');

    applyFilters();
}

function updateUserInfo() {
  if (!appState.currentUser) return;
  const user = appState.currentUser;
  elements.currentUserName.textContent = user.name;
  elements.currentUserRole.textContent = getRoleDisplayName(user.role);
  
  const totalDays = user.total_vacation_days || 0;
  const usedDays = calculateUsedVacationDays(user.id);
  
  elements.totalDays.textContent = totalDays;
  elements.usedDays.textContent = usedDays;
  elements.remainingDays.textContent = totalDays - usedDays;
}

function populateFilterDropdowns() {
  const selectedDept = elements.departmentFilter.value;
  const selectedEmp = elements.employeeSelect.value;
  
  elements.departmentFilter.innerHTML = '<option value="">Всі департаменти</option>';
  appData.departments.forEach(dept => {
    elements.departmentFilter.appendChild(new Option(dept, dept));
  });
  
  elements.employeeSelect.innerHTML = '<option value="">Оберіть співробітника</option>';
  appData.employees.forEach(emp => {
    elements.employeeSelect.appendChild(new Option(emp.name, emp.id));
  });

  elements.departmentFilter.value = selectedDept;
  elements.employeeSelect.value = selectedEmp;
}

function applyFilters() {
  if (!appState.isInitialized) return;
  let vacationPeriods = getVacationPeriodsForCurrentTab();
  const deptFilter = elements.departmentFilter.value;
  const statusFilter = elements.statusFilter.value;

  if (deptFilter) {
    vacationPeriods = vacationPeriods.filter(v => {
      const employee = appData.employees.find(emp => emp.id === v.employee_id);
      return employee && employee.department === deptFilter;
    });
  }

  if (statusFilter) {
    vacationPeriods = vacationPeriods.filter(v => {
      const status = getEmployeeStatus(v.employee_id).class;
      return status === statusFilter;
    });
  }

  renderTable(vacationPeriods);
  renderCalendar(vacationPeriods);
}

function clearAndApplyFilters() {
  elements.departmentFilter.value = '';
  elements.statusFilter.value = '';
  applyFilters();
}

function renderTable(vacationPeriods) {
  const isMyView = appState.currentTab === 'my-view';
  const isHRView = appState.currentTab === 'hr-all';
  
  updateTableHeaders(isMyView, isHRView);
  
  elements.vacationsTableBody.innerHTML = '';
  if (vacationPeriods.length === 0) {
    const colspan = elements.vacationsTableHeader.querySelector('tr').children.length;
    elements.vacationsTableBody.innerHTML = `<tr><td colspan="${colspan}" class="empty-state"><i class="fas fa-calendar-times"></i><p>Немає періодів відпусток</p></td></tr>`;
    return;
  }

  vacationPeriods.forEach((vacation, index) => {
    const employee = appData.employees.find(emp => emp.id === vacation.employee_id);
    if (!employee) return;

    const status = getEmployeeStatus(employee.id);
    const remainingDays = (employee.total_vacation_days || 0) - calculateUsedVacationDays(employee.id);
    const row = document.createElement('tr');

    let html = `<td>${index + 1}</td>`;

    if (!isMyView) html += `<td>${employee.name}</td>`;
    if (isHRView) html += `<td>${employee.department || 'N/A'}</td>`;

    html += `<td><span class="employee-status employee-status--${status.class}">${status.text}</span></td>
             <td>${formatDate(vacation.start_date)}</td>
             <td>${formatDate(vacation.end_date)}</td>
             <td>${vacation.days}</td>
             <td>${remainingDays}</td>`;

    if (isHRView) {
        html += `<td class="actions-column">
                   <div class="action-buttons">
                     <button class="btn btn--outline btn-icon" onclick="openVacationForm('${vacation.id}')" title="Редагувати"><i class="fas fa-pen"></i></button>
                     <button class="btn btn--reject btn-icon" onclick="deleteVacation('${vacation.id}')" title="Видалити"><i class="fas fa-trash"></i></button>
                   </div>
                 </td>`;
    } else {
        html += `<td></td>`;
    }

    row.innerHTML = html;
    elements.vacationsTableBody.appendChild(row);
  });
}

function updateTableHeaders(isMyView, isHRView) {
    let headerHtml = '<tr><th>#</th>';
    if (!isMyView) headerHtml += '<th>Співробітник</th>';
    if (isHRView) headerHtml += '<th>Департамент</th>';
    headerHtml += '<th>Статус</th><th>Початок</th><th>Кінець</th><th>Днів</th><th>Залишилось</th><th class="actions-column">Дії</th></tr>';
    elements.vacationsTableHeader.innerHTML = headerHtml;
}

function renderCalendar(vacationPeriods) {
    const year = appState.currentDate.getFullYear();
    const month = appState.currentDate.getMonth();
    elements.currentMonthYear.textContent = `${new Date(year, month).toLocaleString('uk-UA', { month: 'long' })} ${year}`;
    
    elements.calendarGrid.innerHTML = '';
    
    ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].forEach(day => {
        elements.calendarGrid.appendChild(Object.assign(document.createElement('div'), {className: 'calendar-day calendar-day--header', textContent: day}));
    });
    
    const firstDayOfMonth = new Date(year, month, 1);
    const startDayGrid = new Date(firstDayOfMonth);
    startDayGrid.setDate(startDayGrid.getDate() - (firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1));
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 42; i++) {
        const currentDay = new Date(startDayGrid);
        currentDay.setDate(startDayGrid.getDate() + i);
        
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = currentDay.getDate();
        
        if (currentDay.getMonth() !== month) dayElement.classList.add('calendar-day--other-month');
        if (currentDay.getTime() === today.getTime()) dayElement.classList.add('calendar-day--today');
        
        const dayVacations = vacationPeriods.filter(v => {
            const vacStart = new Date(v.start_date);
            const vacEnd = new Date(v.end_date);
            vacStart.setHours(0,0,0,0);
            vacEnd.setHours(0,0,0,0);
            return currentDay >= vacStart && currentDay <= vacEnd;
        });
        
        if (dayVacations.length > 0) {
            dayElement.classList.add('calendar-day--vacation');
            dayElement.title = dayVacations.map(v => appData.employees.find(e => e.id === v.employee_id)?.name || 'Unknown').join(', ');
        }
        
        elements.calendarGrid.appendChild(dayElement);
    }
}

// --- Helper Functions ---

function getTabsForRole(role, isHrManager) {
    let tabs = [{ key: 'my-view', label: 'Мій огляд', icon: 'fas fa-user' }];
    if (role === 'manager' || isHrManager) {
        tabs.unshift({ key: 'manager-team', label: 'Огляд команди', icon: 'fas fa-users' });
    }
    if (role === 'hr') {
        tabs.unshift({ key: 'hr-all', label: 'HR огляд', icon: 'fas fa-globe-americas' });
    }
    return tabs;
}

function getVacationPeriodsForCurrentTab() {
  if (!appState.currentUser) return [];
  switch (appState.currentTab) {
    case 'hr-all':
      return appData.vacation_periods;
    case 'manager-team':
      const subordinateIds = getAllSubordinates(appState.currentUser.id);
      return appData.vacation_periods.filter(req => subordinateIds.includes(req.employee_id));
    case 'my-view':
      return appData.vacation_periods.filter(req => req.employee_id === appState.currentUser.id);
    default:
      return [];
  }
}

function getAllSubordinates(managerId) {
  let subordinates = [];
  const directSubordinates = appData.employees.filter(emp => emp.manager_id === managerId);
  directSubordinates.forEach(subordinate => {
    subordinates.push(subordinate.id);
    subordinates = subordinates.concat(getAllSubordinates(subordinate.id));
  });
  return subordinates;
}

function getEmployeeStatus(employeeId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const vacations = appData.vacation_periods.filter(v => v.employee_id === employeeId);
  
  for (const vac of vacations) {
    const startDate = new Date(vac.start_date);
    const endDate = new Date(vac.end_date);
    startDate.setHours(0,0,0,0);
    endDate.setHours(0,0,0,0);
    if (today >= startDate && today <= endDate) {
      return { text: 'У відпустці', class: 'on-leave' };
    }
  }

  if (vacations.some(v => new Date(v.start_date) > today)) {
    return { text: 'Заплановано', class: 'planned' };
  }

  return { text: 'На роботі', class: 'at-work' };
}

function calculateUsedVacationDays(employeeId) {
    return appData.vacation_periods
        .filter(v => v.employee_id === employeeId)
        .reduce((acc, v) => acc + (v.days || 0), 0);
}

function changeMonth(direction) {
  appState.currentDate.setMonth(appState.currentDate.getMonth() + direction);
  applyFilters();
}

function formatDate(dateString) {
    return dateString ? new Date(dateString).toLocaleDateString('uk-UA') : 'N/A';
}

function getRoleDisplayName(role) {
  const roles = { 'hr': 'HR', 'manager': 'Менеджер', 'employee': 'Співробітник' };
  return roles[role] || role;
}

function closeModal(modal) {
  modal.classList.add('hidden');
}

// --- Form & Data-Mutation Functions ---

window.openVacationForm = (vacationId = null) => {
  if (appState.currentRole !== 'hr') {
    alert('Тільки HR може додавати або редагувати відпустки.');
    return;
  }

  elements.vacationForm.reset();
  elements.vacationIdInput.value = '';
  
  if (vacationId) {
    const vacation = appData.vacation_periods.find(v => v.id === vacationId);
    if (vacation) {
      elements.vacationFormTitle.textContent = 'Редагувати період відпустки';
      elements.vacationIdInput.value = vacation.id;
      elements.employeeSelect.value = vacation.employee_id;
      elements.startDateInput.value = vacation.start_date;
      elements.endDateInput.value = vacation.end_date;
      calculateVacationDays();
    }
  } else {
    elements.vacationFormTitle.textContent = 'Запланувати період відпустки';
  }
  elements.vacationFormModal.classList.remove('hidden');
}

function calculateVacationDays() {
  const start = elements.startDateInput.value;
  const end = elements.endDateInput.value;
  if (start && end) {
    const diff = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24);
    elements.vacationDaysInput.value = diff >= 0 ? diff + 1 : 'Невірний діапазон';
  }
}

async function handleVacationFormSubmit(event) {
    event.preventDefault();
    const employeeId = elements.employeeSelect.value;
    const days = parseInt(elements.vacationDaysInput.value, 10);

    if (!employeeId || isNaN(days) || days <= 0) {
        alert('Будь ласка, заповніть форму коректно.');
        return;
    }
    
    const vacationData = {
        start_date: elements.startDateInput.value,
        end_date: elements.endDateInput.value,
        days: days,
        employee_id: employeeId,
        manager_id: appData.employees.find(e => e.id === employeeId)?.manager_id || null
    };

    const vacationId = elements.vacationIdInput.value;
    try {
        if (vacationId) {
            await db.collection('vacation_periods').doc(vacationId).update(vacationData);
        } else {
            await db.collection('vacation_periods').add(vacationData);
        }
        closeModal(elements.vacationFormModal);
    } catch (error) {
        console.error("Помилка збереження відпустки:", error);
        alert('Не вдалося зберегти дані.');
    }
}

window.deleteVacation = async (vacationId) => {
    if (appState.currentRole !== 'hr') {
        alert('Тільки HR може видаляти відпустки.');
        return;
    }
    if (confirm('Ви впевнені, що хочете видалити цей запис?')) {
        try {
            await db.collection('vacation_periods').doc(vacationId).delete();
        } catch (error) {
            console.error("Помилка видалення відпустки:", error);
            alert('Не вдалося видалити дані.');
        }
    }
}
