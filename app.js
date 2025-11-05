
// Global appData object
let appData = {};

// Application State
let currentUser = null;
let currentRole = '';
let currentTab = '';
let currentDate = new Date();
let filteredVacationPeriods = [];

// DOM Elements
const elements = {
  userRoleSelect: document.getElementById('userRole'),
  welcomeScreen: document.getElementById('welcome-screen'),
  dashboardContainer: document.getElementById('dashboard-container'),
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
  addVacationPeriodBtn: document.getElementById('add-vacation-btn'),
  vacationPeriodFormModal: document.getElementById('vacation-form-modal'),
  vacationPeriodFormModalClose: document.getElementById('vacation-form-modal-close'),
  vacationPeriodForm: document.getElementById('vacation-form'),
  vacationPeriodFormTitle: document.getElementById('vacation-form-title'),
  vacationPeriodIdInput: document.getElementById('vacation-id-input'),
  startDateInput: document.getElementById('start-date-input'),
  endDateInput: document.getElementById('end-date-input'),
  vacationPeriodDaysInput: document.getElementById('vacation-days-input'),
  cancelVacationPeriodFormBtn: document.getElementById('cancel-vacation-form-btn'),
  employeeSelectGroup: document.getElementById('employee-select-group'),
  employeeSelect: document.getElementById('employee-select')
};

// --- Data Persistence ---
async function loadData() {
  try {
    const response = await fetch('vacation_dashboard_data.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    appData = await response.json();
    appData.vacation_periods.forEach(req => delete req.status);
  } catch (error) {
    console.error("Could not load data:", error);
    // Handle error appropriately, maybe show a message to the user
  }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', async function() {
  await loadData();
  initializeApp();
});

function initializeApp() {
  populateFilterDropdowns();
  
  // Directly set a default user and role for now
  handleRoleChange('hr'); 

  elements.clearFilters.addEventListener('click', clearFilters);
  elements.prevMonth.addEventListener('click', () => changeMonth(-1));
  elements.nextMonth.addEventListener('click', () => changeMonth(1));
  
  elements.departmentFilter.addEventListener('change', applyFilters);
  elements.statusFilter.addEventListener('change', applyFilters);
  
  elements.addVacationPeriodBtn.addEventListener('click', () => openVacationPeriodForm());
  elements.vacationPeriodFormModalClose.addEventListener('click', () => closeModal(elements.vacationPeriodFormModal));
  elements.cancelVacationPeriodFormBtn.addEventListener('click', () => closeModal(elements.vacationPeriodFormModal));
  elements.vacationPeriodForm.addEventListener('submit', handleVacationPeriodFormSubmit);
  
  elements.startDateInput.addEventListener('change', calculateVacationPeriodDays);
  elements.endDateInput.addEventListener('change', calculateVacationPeriodDays);

  updateCalendar();
}

function populateFilterDropdowns() {
  elements.departmentFilter.innerHTML = '<option value="">Всі департаменти</option>';
  elements.employeeSelect.innerHTML = '';

  appData.departments.forEach(dept => {
    elements.departmentFilter.appendChild(new Option(dept, dept));
  });
  
  appData.employees.forEach(emp => {
      elements.employeeSelect.appendChild(new Option(emp.name, emp.id));
  });
}

function handleRoleChange(selectedRole) {
  if (selectedRole) {
    currentRole = selectedRole;
    
    // Temporarily find the HR manager to act as the default user
    currentUser = appData.employees.find(emp => emp.is_hr_manager) || appData.employees.find(emp => emp.role === 'hr') || appData.employees[0];
    
    showDashboard();
  } else {
    showWelcomeScreen();
  }
}

function showWelcomeScreen() {
  elements.welcomeScreen.classList.remove('hidden');
  elements.dashboardContainer.classList.add('hidden');
}

function showDashboard() {
  elements.welcomeScreen.classList.add('hidden');
  elements.dashboardContainer.classList.remove('hidden');
  
  updateUserInfo();
  setupTabs();
  applyFilters();
}

function updateUserInfo() {
  if (!currentUser) return;
  
  elements.currentUserName.textContent = currentUser.name;
  elements.currentUserRole.textContent = getRoleDisplayName(currentUser.role);
  elements.totalDays.textContent = currentUser.total_vacation_days;
  elements.usedDays.textContent = currentUser.used_vacation_days;
  elements.remainingDays.textContent = currentUser.total_vacation_days - currentUser.used_vacation_days;
}

function getRoleDisplayName(role) {
  const roles = { 'hr': 'HR', 'manager': 'Менеджер', 'employee': 'Співробітник' };
  return roles[role] || role;
}

function setupTabs() {
  elements.tabsNav.innerHTML = '';
  const tabs = getTabsForRole(currentRole);
  
  tabs.forEach((tab, index) => {
    const tabButton = document.createElement('button');
    tabButton.className = `tab-button ${index === 0 ? 'active' : ''}`;
    tabButton.innerHTML = `<i class="${tab.icon}"></i>${tab.label}`;
    tabButton.addEventListener('click', () => switchTab(tab.key, tabButton));
    elements.tabsNav.appendChild(tabButton);
  });
  
  if (tabs.length > 0) {
    currentTab = tabs[0].key;
    updateTabContent();
  }
}

function getTabsForRole(role) {
    let tabs = [];
    if (role === 'hr') {
        tabs.push({ key: 'hr-all', label: 'HR View', icon: 'fas fa-users' });
        if (currentUser.is_hr_manager) {
            tabs.push({ key: 'hr-manager', label: 'Manager View', icon: 'fas fa-user-tie' });
        }
    } else if (role === 'manager') {
        tabs.push({ key: 'manager-team', label: 'Manager View', icon: 'fas fa-users' });
    }
    tabs.push({ key: 'my-view', label: 'My View', icon: 'fas fa-user' });
    return tabs;
}


function switchTab(tabKey, tabButton) {
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  tabButton.classList.add('active');
  currentTab = tabKey;
  updateTabContent();
}

function updateTabContent() {
    const isHRView = currentTab === 'hr-all';
    const isManagerView = currentTab === 'hr-manager' || currentTab === 'manager-team';

    elements.filtersSection.style.display = isHRView || isManagerView ? 'block' : 'none';
    elements.addVacationPeriodBtn.classList.toggle('hidden', currentRole !== 'hr' || !isHRView);

    elements.departmentFilterGroup.style.display = isHRView ? 'block' : 'none';
    elements.statusFilterGroup.style.display = isHRView || isManagerView ? 'block' : 'none';

    if (isManagerView) {
        elements.departmentFilterGroup.style.display = 'none';
    }
    
    applyFilters();
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

function getVacationPeriodsForCurrentTab() {
  switch (currentTab) {
    case 'hr-all':
      return appData.vacation_periods;
    case 'hr-manager':
      const hrEmployeeIds = appData.employees.filter(emp => emp.department === 'HR').map(emp => emp.id);
      return appData.vacation_periods.filter(req => hrEmployeeIds.includes(req.employee_id));
    case 'manager-team':
      const subordinateIds = getAllSubordinates(currentUser.id);
      return appData.vacation_periods.filter(req => subordinateIds.includes(req.employee_id));
    case 'my-view':
      return appData.vacation_periods.filter(req => req.employee_id === currentUser.id);
    default:
      return [];
  }
}

function applyFilters() {
    let vacationPeriods = getVacationPeriodsForCurrentTab();
    const isHRView = currentTab === 'hr-all';
    const isManagerView = currentTab === 'hr-manager' || currentTab === 'manager-team';

    const deptFilter = elements.departmentFilter.value;
    const statusFilter = elements.statusFilter.value;

    if (isHRView) {
        if (deptFilter) {
            vacationPeriods = vacationPeriods.filter(v => {
                const employee = appData.employees.find(emp => emp.id === v.employee_id);
                return employee && employee.department === deptFilter;
            });
        }
        if (statusFilter) {
            vacationPeriods = vacationPeriods.filter(v => {
                const status = getEmployeeStatus(v.employee_id);
                return status.class === statusFilter;
            });
        }
    } else if (isManagerView) {
        if (statusFilter) {
            vacationPeriods = vacationPeriods.filter(v => {
                const status = getEmployeeStatus(v.employee_id);
                return status.class === statusFilter;
            });
        }
    }

    filteredVacationPeriods = vacationPeriods;
    updateTable();
    updateCalendar();
}


function clearFilters() {
  elements.departmentFilter.value = '';
  elements.statusFilter.value = '';
  applyFilters();
}

function getEmployeeStatus(employeeId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const vacationPeriods = appData.vacation_periods.filter(req => req.employee_id === employeeId);

  for (const vacationPeriod of vacationPeriods) {
    const startDate = new Date(vacationPeriod.start_date);
    const endDate = new Date(vacationPeriod.end_date);
    if (today >= startDate && today <= endDate) {
      return { text: 'У відпустці', class: 'on-leave' };
    }
  }

  if (vacationPeriods.some(v => new Date(v.start_date) > today)) {
    return { text: 'Заплановано', class: 'planned' };
  }

  return { text: 'На роботі', class: 'at-work' };
}

function updateTable() {
  const isMyView = currentTab === 'my-view';
  const isManagerView = currentTab === 'hr-manager' || currentTab === 'manager-team';
  const isHRView = currentTab === 'hr-all';
  
  // Update table headers
  let headerHtml = '<tr>';
  if (isMyView) {
    headerHtml += '<th>#</th><th>Статус співробітника</th><th>Початок</th><th>Кінець</th><th>Днів</th><th>Залишилось днів</th>';
  } else if (isManagerView) {
    headerHtml += '<th>#</th><th>Співробітник</th><th>Статус співробітника</th><th>Початок</th><th>Кінець</th><th>Днів</th><th>Залишилось днів</th>';
  } else if (isHRView) {
    headerHtml += '<th>#</th><th>Співробітник</th><th>ІПН</th><th>Департамент</th><th>Статус співробітника</th><th>Початок</th><th>Кінець</th><th>Днів</th><th>Залишилось днів</th><th class="actions-column">Дії</th>';
  }
  headerHtml += '</tr>';
  elements.vacationsTableHeader.innerHTML = headerHtml;
  
  // Update table body
  elements.vacationsTableBody.innerHTML = '';
  
  if (filteredVacationPeriods.length === 0) {
    const colspan = isMyView ? 6 : isManagerView ? 7 : isHRView ? 10 : 9;
    elements.vacationsTableBody.innerHTML = `<tr><td colspan="${colspan}" class="empty-state"><i class="fas fa-calendar-times"></i><p>Немає періодів відпусток для відображення</p></td></tr>`;
    return;
  }
  
  filteredVacationPeriods.forEach((vacationPeriod, index) => {
    const employee = appData.employees.find(emp => emp.id === vacationPeriod.employee_id);
    const employeeStatus = getEmployeeStatus(vacationPeriod.employee_id);
    const row = document.createElement('tr');
    const daysLeft = employee.total_vacation_days - employee.used_vacation_days;
    
    let rowHtml = `<td>${index + 1}</td>`;
    if (isMyView) {
      rowHtml += `
        <td><span class="employee-status employee-status--${employeeStatus.class}">${employeeStatus.text}</span></td>
        <td>${formatDate(vacationPeriod.start_date)}</td>
        <td>${formatDate(vacationPeriod.end_date)}</td>
        <td>${vacationPeriod.days}</td>
        <td>${daysLeft}</td>
      `;
    } else if (isManagerView) {
      rowHtml += `
        <td>${employee ? employee.name : 'Невідомо'}</td>
        <td><span class="employee-status employee-status--${employeeStatus.class}">${employeeStatus.text}</span></td>
        <td>${formatDate(vacationPeriod.start_date)}</td>
        <td>${formatDate(vacationPeriod.end_date)}</td>
        <td>${vacationPeriod.days}</td>
        <td>${daysLeft}</td>
      `;
    } else if (isHRView) {
        const canManage = currentRole === 'hr';
        rowHtml += `
            <td>${employee ? employee.name : 'Невідомо'}</td>
            <td>${employee.tin}</td>
            <td>${employee ? employee.department : 'Невідомо'}</td>
            <td><span class="employee-status employee-status--${employeeStatus.class}">${employeeStatus.text}</span></td>
            <td>${formatDate(vacationPeriod.start_date)}</td>
            <td>${formatDate(vacationPeriod.end_date)}</td>
            <td>${vacationPeriod.days}</td>
            <td>${daysLeft}</td>
            <td class="actions-column">
              <div class="action-buttons">
                ${canManage ? `
                  <button class="btn btn--outline btn-icon" onclick="openVacationPeriodForm(${vacationPeriod.id})" title="Редагувати"><i class="fas fa-pen"></i></button>
                  <button class="btn btn--reject btn-icon" onclick="deleteVacationPeriod(${vacationPeriod.id})" title="Видалити"><i class="fas fa-trash"></i></button>
                ` : ''}
              </div>
            </td>
        `;
    }
    row.innerHTML = rowHtml;
    elements.vacationsTableBody.appendChild(row);
  });
}


function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('uk-UA');
}

function updateCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];
    elements.currentMonthYear.textContent = `${monthNames[month]} ${year}`;
    
    elements.calendarGrid.innerHTML = '';
    
    const dayHeaders = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
    dayHeaders.forEach(day => {
        elements.calendarGrid.appendChild(Object.assign(document.createElement('div'), {className: 'calendar-day calendar-day--header', textContent: day}));
    });
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1));
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 42; i++) {
        const currentDay = new Date(startDate);
        currentDay.setDate(startDate.getDate() + i);
        
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = currentDay.getDate();
        
        if (currentDay.getMonth() !== month) dayElement.classList.add('calendar-day--other-month');
        if (currentDay.getTime() === today.getTime()) dayElement.classList.add('calendar-day--today');
        
        const dayVacationPeriods = filteredVacationPeriods.filter(v => {
            const vacStart = new Date(v.start_date);
            const vacEnd = new Date(v.end_date);
            vacStart.setHours(0,0,0,0);
            vacEnd.setHours(0,0,0,0);
            return currentDay >= vacStart && currentDay <= vacEnd;
        });
        
        if (dayVacationPeriods.length > 0) {
            dayElement.classList.add('calendar-day--vacation');
            dayElement.style.setProperty('--vacation-color', '#4CAF50'); // Default color
            dayElement.title = dayVacationPeriods.map(v => `${appData.employees.find(e => e.id === v.employee_id)?.name || 'Unknown'}`).join('\n');
        }
        
        elements.calendarGrid.appendChild(dayElement);
    }
}


function changeMonth(direction) {
  currentDate.setMonth(currentDate.getMonth() + direction);
  updateCalendar();
}

function openVacationPeriodForm(vacationPeriodId = null) {
  elements.vacationPeriodForm.reset();
  elements.vacationPeriodIdInput.value = '';

  elements.employeeSelectGroup.style.display = currentRole === 'hr' ? 'block' : 'none';

  if (vacationPeriodId) {
    const vacationPeriod = appData.vacation_periods.find(v => v.id === vacationPeriodId);
    if (vacationPeriod) {
      elements.vacationPeriodFormTitle.textContent = 'Редагувати період відпустки';
      elements.vacationPeriodIdInput.value = vacationPeriod.id;
      elements.employeeSelect.value = vacationPeriod.employee_id;
      elements.startDateInput.value = vacationPeriod.start_date;
      elements.endDateInput.value = vacationPeriod.end_date;
      calculateVacationPeriodDays();
    }
  } else {
    elements.vacationPeriodFormTitle.textContent = 'Запланувати період відпустки';
    elements.employeeSelect.value = currentUser.id;
  }
  
  elements.vacationPeriodFormModal.classList.remove('hidden');
}

function calculateVacationPeriodDays() {
  const startDate = elements.startDateInput.value;
  const endDate = document.getElementById('end-date-input').value;

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      elements.vacationPeriodDaysInput.value = 'Невірний діапазон';
      return;
    }
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    elements.vacationPeriodDaysInput.value = diffDays;
  }
}

function handleVacationPeriodFormSubmit(event) {
    event.preventDefault();
    if (currentRole !== 'hr') {
        alert('У вас немає прав для виконання цієї дії.');
        return;
    }
    const vacationPeriodId = parseInt(elements.vacationPeriodIdInput.value, 10);
    const days = parseInt(elements.vacationPeriodDaysInput.value, 10);
    const employeeId = parseInt(elements.employeeSelect.value, 10);

    if (isNaN(days)) {
        alert('Будь ласка, введіть коректні дати.');
        return;
    }

    const employee = appData.employees.find(emp => emp.id === employeeId);
    if (!employee) {
        alert('Обраний співробітник не знайдений.');
        return;
    }

    const vacationPeriodData = {
        start_date: elements.startDateInput.value,
        end_date: elements.endDateInput.value,
        days: days,
        employee_id: employeeId,
        manager_id: employee.manager_id
    };

    if (vacationPeriodId) {
        const index = appData.vacation_periods.findIndex(v => v.id === vacationPeriodId);
        if (index !== -1) {
            appData.vacation_periods[index] = { ...appData.vacation_periods[index], ...vacationPeriodData };
        }
    } else {
        appData.vacation_periods.push({ ...vacationPeriodData, id: Date.now() });
    }
    
    // saveData(); // This will be replaced with a call to Firebase
    closeModal(elements.vacationPeriodFormModal);
    applyFilters();
}


function deleteVacationPeriod(vacationPeriodId) {
  if (currentRole !== 'hr') {
        alert('У вас немає прав для виконання цієї дії.');
        return;
    }
  if (confirm('Ви впевнені, що хочете видалити цей запис про період відпустки?')) {
    appData.vacation_periods = appData.vacation_periods.filter(v => v.id !== vacationPeriodId);
    // saveData(); // This will be replaced with a call to Firebase
    applyFilters();
  }
}

function closeModal(modal) {
  if (modal) {
    modal.classList.add('hidden');
  }
}
