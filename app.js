
// Global appData object
let appData = {};
let charts = {};

// --- Feature Flags ---
const FEATURES = {
    HR_ANALYTICS_ENABLED: false
};

// --- Chart Configuration (Memoized) ---
const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
};

const employeeStatusChartOptions = {
    ...commonChartOptions
};

const departmentLeaveChartOptions = {
    ...commonChartOptions,
    scales: {
        x: { stacked: true },
        y: { stacked: true }
    }
};


// Default data structure if localStorage is empty
const defaultAppData = {
  employees: [
    {"id": 1, "name": "Олексій Коваленко", "role": "employee", "department": "IT", "position": "Senior Developer", "manager_id": 3, "total_vacation_days": 24, "used_vacation_days": 8, "tin": "1234567890"},
    {"id": 2, "name": "Марина Петренко", "role": "employee", "department": "Marketing", "position": "Marketing Specialist", "manager_id": 4, "total_vacation_days": 22, "used_vacation_days": 5, "tin": "0987654321"},
    {"id": 3, "name": "Дмитро Іваненко", "role": "manager", "department": "IT", "position": "IT Manager", "manager_id": 5, "total_vacation_days": 26, "used_vacation_days": 12, "tin": "1122334455"},
    {"id": 4, "name": "Анна Сидоренко", "role": "manager", "department": "Marketing", "position": "Marketing Manager", "manager_id": 5, "total_vacation_days": 25, "used_vacation_days": 10, "tin": "5566778899"},
    {"id": 5, "name": "Володимир Шевченко", "role": "hr", "department": "HR", "position": "HR Director", "manager_id": null, "is_hr_manager": true, "total_vacation_days": 28, "used_vacation_days": 14, "tin": "1231231234"},
    {"id": 6, "name": "Світлана Мельник", "role": "employee", "department": "Finance", "position": "Accountant", "manager_id": 7, "total_vacation_days": 20, "used_vacation_days": 6, "tin": "4564564567"},
    {"id": 7, "name": "Ігор Лисенко", "role": "manager", "department": "Finance", "position": "Finance Manager", "manager_id": 5, "total_vacation_days": 24, "used_vacation_days": 9, "tin": "7897897890"},
    {"id": 8, "name": "Тетяна Бондаренко", "role": "employee", "department": "IT", "position": "Junior Developer", "manager_id": 3, "total_vacation_days": 20, "used_vacation_days": 4, "tin": "0011223344"}
  ],
  vacation_periods: [
    {"id": 1, "employee_id": 1, "start_date": "2025-10-15", "end_date": "2025-10-19", "days": 5, "manager_id": 3},
    {"id": 3, "employee_id": 3, "start_date": "2025-12-20", "end_date": "2025-12-30", "days": 9, "manager_id": 5},
    {"id": 4, "employee_id": 6, "start_date": "2025-10-25", "end_date": "2025-10-27", "days": 3, "manager_id": 7},
    {"id": 5, "employee_id": 8, "start_date": "2025-11-15", "end_date": "2025-11-22", "days": 6, "manager_id": 3}
  ],
  departments: ["IT", "Marketing", "Finance", "HR", "Sales"]
};

// Application State
let currentUser = null;
let currentRole = '';
let currentTab = '';
let currentDate = new Date();

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
    employeeSelect: document.getElementById('employee-select'),
    analyticsSection: document.getElementById('analytics-section'),
    kpiCardSlot: document.getElementById('kpi-card-slot'),
    employeeStatusChart: document.getElementById('employee-status-chart'),
    departmentLeaveChart: document.getElementById('department-leave-chart'),
    mostDaysTable: document.getElementById('most-days-table'),
    leastDaysTable: document.getElementById('least-days-table'),
    contentArea: document.getElementById('content-area')
};

// --- Data Persistence ---
function saveData() {
  localStorage.setItem('vacationDashboardData', JSON.stringify(appData));
}

function loadData() {
  const savedData = localStorage.getItem('vacationDashboardData');
  if (savedData) {
    appData = JSON.parse(savedData);
    if (appData.employees && !appData.employees[0].hasOwnProperty('tin')) {
      appData.employees.forEach(employee => {
        const defaultEmployee = defaultAppData.employees.find(e => e.id === employee.id);
        if (defaultEmployee) employee.tin = defaultEmployee.tin;
      });
      saveData();
    }
  } else {
    appData = defaultAppData;
  }
  appData.vacation_periods.forEach(req => delete req.status);
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initializeApp();
});

function initializeApp() {
  populateFilterDropdowns();
  
  elements.userRoleSelect.addEventListener('change', handleRoleChange);
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
  
  // Inject KPI structure
  elements.kpiCardSlot.innerHTML = `
    <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-value" id="kpi-total-employees">--</div><div class="kpi-label">Всього співробітників</div></div>
        <div class="kpi-card"><div class="kpi-value" id="kpi-on-leave">--</div><div class="kpi-label">Зараз у відпустці</div></div>
        <div class="kpi-card"><div class="kpi-value" id="kpi-planned-leaves">--</div><div class="kpi-label">Заплановано відпусток</div></div>
        <div class="kpi-card"><div class="kpi-value" id="kpi-avg-days-left">--</div><div class="kpi-label">Середній залишок днів</div></div>
        <div class="kpi-card"><div class="kpi-value" id="kpi-burn-rate">--</div><div class="kpi-label">Burn Rate</div></div>
    </div>`;
}

function populateFilterDropdowns() {
  elements.departmentFilter.innerHTML = '<option value="">Всі департаменти</option>';
  appData.departments.forEach(dept => elements.departmentFilter.appendChild(new Option(dept, dept)));
  elements.employeeSelect.innerHTML = '';
  appData.employees.forEach(emp => elements.employeeSelect.appendChild(new Option(emp.name, emp.id)));
}

function handleRoleChange() {
  const selectedRole = elements.userRoleSelect.value;
  if (selectedRole) {
    currentRole = selectedRole;
    currentUser = appData.employees.find(emp => emp.role === selectedRole) || appData.employees[0];
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
  return { 'hr': 'HR', 'manager': 'Менеджер', 'employee': 'Співробітник' }[role] || role;
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
    const isManagerView = ['hr-manager', 'manager-team'].includes(currentTab);

    if (FEATURES.HR_ANALYTICS_ENABLED) {
        elements.analyticsSection.classList.toggle('hidden', !isHRView);
        if (isHRView) {
            initCharts();
        } else {
            destroyCharts();
        }
    } else {
        elements.analyticsSection.classList.add('hidden');
        destroyCharts();
    }

    elements.filtersSection.style.display = 'block';
    
    elements.addVacationPeriodBtn.classList.toggle('hidden', currentRole !== 'hr' || !isHRView);
    elements.departmentFilterGroup.style.display = isHRView ? 'block' : 'none';
    elements.statusFilterGroup.style.display = isHRView || isManagerView ? 'block' : 'none';

    applyFilters();
}


// --- Centralized Data Processing ---
function applyFilters() {
    const isHRView = currentTab === 'hr-all';
    const deptFilter = elements.departmentFilter.value;
    const statusFilter = elements.statusFilter.value;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let vacationPeriods = getVacationPeriodsForCurrentTab();
    
    // Enrich data with employee info and calculated status
    let processedData = vacationPeriods.map(vacation => {
        const employee = appData.employees.find(e => e.id === vacation.employee_id);
        const status = getEmployeeStatus(employee.id, today);
        const daysLeft = Math.max(0, employee.total_vacation_days - employee.used_vacation_days);
        return { ...vacation, employee, status, daysLeft };
    });

    // Apply filters
    if (isHRView && deptFilter) {
        processedData = processedData.filter(item => item.employee.department === deptFilter);
    }
    if ((isHRView || ['hr-manager', 'manager-team'].includes(currentTab)) && statusFilter) {
        processedData = processedData.filter(item => item.status.class === statusFilter);
    }

    // Pass processed data to rendering functions
    updateTable(processedData);
    updateCalendar(processedData);
    if (isHRView && FEATURES.HR_ANALYTICS_ENABLED) {
        updateAnalytics(processedData);
    }
}


function getVacationPeriodsForCurrentTab() {
  switch (currentTab) {
    case 'hr-all':
         return appData.vacation_periods;
    case 'hr-manager': return appData.vacation_periods.filter(p => appData.employees.find(e => e.id === p.employee_id)?.department === 'HR');
    case 'manager-team': return appData.vacation_periods.filter(p => getAllSubordinates(currentUser.id).includes(p.employee_id));
    case 'my-view': return appData.vacation_periods.filter(p => p.employee_id === currentUser.id);
    default: return [];
  }
}

function getAllSubordinates(managerId) {
  let subordinates = appData.employees.filter(emp => emp.manager_id === managerId).map(emp => emp.id);
  subordinates.forEach(id => subordinates = subordinates.concat(getAllSubordinates(id)));
  return subordinates;
}

function clearFilters() {
  elements.departmentFilter.value = '';
  elements.statusFilter.value = '';
  applyFilters();
}

function getEmployeeStatus(employeeId, today) {
  const vacationPeriods = appData.vacation_periods.filter(req => req.employee_id === employeeId);
  for (const p of vacationPeriods) {
    if (today >= new Date(p.start_date) && today <= new Date(p.end_date)) return { text: 'У відпустці', class: 'on-leave' };
  }
  if (vacationPeriods.some(v => new Date(v.start_date) > today)) return { text: 'Заплановано', class: 'planned' };
  return { text: 'На роботі', class: 'at-work' };
}

// --- Rendering Functions ---
function updateTable(processedData) {
  const isMyView = currentTab === 'my-view';
  const isManagerView = ['hr-manager', 'manager-team'].includes(currentTab);
  const isHRView = currentTab === 'hr-all';
  
  let headerHtml = '<tr>';
  if (isMyView) headerHtml += '<th>#</th><th>Статус</th><th>Початок</th><th>Кінець</th><th>Днів</th><th>Залишилось</th>';
  else if (isManagerView) headerHtml += '<th>#</th><th>Співробітник</th><th>Статус</th><th>Початок</th><th>Кінець</th><th>Днів</th><th>Залишилось</th>';
  else if (isHRView) headerHtml += '<th>#</th><th>Співробітник</th><th>ІПН</th><th>Департамент</th><th>Статус</th><th>Початок</th><th>Кінець</th><th>Днів</th><th>Залишилось</th><th class="actions-column">Дії</th>';
  elements.vacationsTableHeader.innerHTML = headerHtml + '</tr>';
  
  elements.vacationsTableBody.innerHTML = '';
  if (processedData.length === 0) {
    const colspan = isMyView ? 6 : isManagerView ? 7 : 10;
    elements.vacationsTableBody.innerHTML = `<tr><td colspan="${colspan}" class="empty-state"><i class="fas fa-calendar-times"></i><p>Немає періодів відпусток</p></td></tr>`;
    return;
  }
  
  processedData.forEach((item, index) => {
    const { employee, status, daysLeft } = item;
    const row = document.createElement('tr');
    
    let rowHtml = `<td>${index + 1}</td>`;
    if (!isMyView) rowHtml += `<td>${employee ? employee.name : 'N/A'}</td>`;
    if (isHRView) rowHtml += `<td>${employee.tin}</td><td>${employee ? employee.department : 'N/A'}</td>`;
    rowHtml += `<td><span class="employee-status employee-status--${status.class}">${status.text}</span></td>
                <td>${formatDate(item.start_date)}</td><td>${formatDate(item.end_date)}</td>
                <td>${item.days}</td><td>${daysLeft}</td>`;
    if (isHRView) rowHtml += `<td class="actions-column"><div class="action-buttons">
                                <button class="btn btn--outline btn-icon" onclick="openVacationPeriodForm(${item.id})"><i class="fas fa-pen"></i></button>
                                <button class="btn btn--reject btn-icon" onclick="deleteVacationPeriod(${item.id})"><i class="fas fa-trash"></i></button>
                              </div></td>`;
    row.innerHTML = rowHtml;
    elements.vacationsTableBody.appendChild(row);
  });
}

function updateCalendar(processedData) {
    const monthNames = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];
    elements.currentMonthYear.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    elements.calendarGrid.innerHTML = '';
    ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].forEach(day => {
        elements.calendarGrid.appendChild(Object.assign(document.createElement('div'), {className: 'calendar-day calendar-day--header', textContent: day}));
    });
    
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    let startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1));
    const today = new Date();
    today.setHours(0,0,0,0);

    for (let i = 0; i < 42; i++) {
        const day = new Date(startDate);
        day.setDate(startDate.getDate() + i);
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = day.getDate();
        if (day.getMonth() !== currentDate.getMonth()) dayEl.classList.add('calendar-day--other-month');
        if (day.getTime() === today.getTime()) dayEl.classList.add('calendar-day--today');
        
        const dayVacations = processedData.filter(v => day >= new Date(v.start_date) && day <= new Date(v.end_date));
        if (dayVacations.length > 0) {
            dayEl.classList.add('calendar-day--vacation');
            dayEl.title = dayVacations.map(v => v.employee.name || 'Unknown').join('\n');
        }
        elements.calendarGrid.appendChild(dayEl);
    }
}

function formatDate(date) {
  return new Date(date).toLocaleString('uk-UA');
}

function changeMonth(dir) {
  currentDate.setMonth(currentDate.getMonth() + dir);
  applyFilters(); // Re-run filters to update calendar for new month
}

// --- Analytics ---
function initCharts() {
    if (!FEATURES.HR_ANALYTICS_ENABLED) return;
    if (!charts.employeeStatus) {
        const ctx = elements.employeeStatusChart.getContext('2d');
        charts.employeeStatus = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['У відпустці', 'Заплановано', 'На роботі'],
                datasets: [{ data: [], backgroundColor: ['#ff6384', '#ffcd56', '#4bc0c0'] }]
            },
            options: employeeStatusChartOptions
        });
    }
    if (!charts.departmentLeave) {
        const ctx = elements.departmentLeaveChart.getContext('2d');
        charts.departmentLeave = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: appData.departments,
                datasets: [
                    { label: 'Використано', data: [], backgroundColor: '#ff6384' },
                    { label: 'Загалом', data: [], backgroundColor: '#36a2eb' }
                ]
            },
            options: departmentLeaveChartOptions
        });
    }
}

function destroyCharts() {
    if (charts.employeeStatus) {
        charts.employeeStatus.destroy();
        charts.employeeStatus = null;
    }
    if (charts.departmentLeave) {
        charts.departmentLeave.destroy();
        charts.departmentLeave = null;
    }
}


function updateAnalytics(processedData) {
    if (!FEATURES.HR_ANALYTICS_ENABLED) return;

    const kpiTotalEmployees = document.getElementById('kpi-total-employees');
    const kpiOnLeave = document.getElementById('kpi-on-leave');
    const kpiPlannedLeaves = document.getElementById('kpi-planned-leaves');
    const kpiAvgDaysLeft = document.getElementById('kpi-avg-days-left');
    const kpiBurnRate = document.getElementById('kpi-burn-rate');

    const uniqueEmployeesInView = [...new Map(processedData.map(item => [item.employee.id, item.employee])).values()];

    if (uniqueEmployeesInView.length === 0) {
      kpiTotalEmployees.textContent = 0;
      kpiOnLeave.textContent = 0;
      kpiPlannedLeaves.textContent = 0;
      kpiAvgDaysLeft.textContent = 'N/A';
      kpiBurnRate.textContent = 'N/A';
      updateEmployeeStatusChart(0, 0, 0);
      updateDepartmentLeaveChart([]);
      updateEmployeeRankings([]);
      return;
    }

    const statuses = processedData.map(item => item.status.class);
    const onLeave = statuses.filter(s => s === 'on-leave').length;
    const planned = statuses.filter(s => s === 'planned').length;
    
    const totalUsed = uniqueEmployeesInView.reduce((sum, e) => sum + e.used_vacation_days, 0);
    const totalDays = uniqueEmployeesInView.reduce((sum, e) => sum + e.total_vacation_days, 0);

    kpiTotalEmployees.textContent = uniqueEmployeesInView.length;
    kpiOnLeave.textContent = onLeave;
    kpiPlannedLeaves.textContent = planned;
    kpiAvgDaysLeft.textContent = ((totalDays - totalUsed) / uniqueEmployeesInView.length).toFixed(1);
    kpiBurnRate.textContent = totalDays > 0 ? `${((totalUsed / totalDays) * 100).toFixed(1)}%` : 'N/A';
    
    updateEmployeeStatusChart(onLeave, planned, uniqueEmployeesInView.length - onLeave - planned);
    updateDepartmentLeaveChart(uniqueEmployeesInView);
    updateEmployeeRankings(uniqueEmployeesInView);
}

function updateEmployeeStatusChart(onLeave, planned, atWork) {
    if (!charts.employeeStatus) return;
    charts.employeeStatus.data.datasets[0].data = [onLeave, planned, atWork];
    charts.employeeStatus.update();
}

function updateDepartmentLeaveChart(employees) {
    if (!charts.departmentLeave) return;
    const departmentData = appData.departments.map(dept => {
        const employeesInDept = employees.filter(e => e.department === dept);
        return {
            used: employeesInDept.reduce((sum, e) => sum + e.used_vacation_days, 0),
            total: employeesInDept.reduce((sum, e) => sum + e.total_vacation_days, 0)
        };
    });
    charts.departmentLeave.data.datasets[0].data = departmentData.map(d => d.used);
    charts.departmentLeave.data.datasets[1].data = departmentData.map(d => d.total);
    charts.departmentLeave.update();
}

function updateEmployeeRankings(employees) {
    const employeesWithDaysLeft = employees.map(e => ({ ...e, daysLeft: e.total_vacation_days - e.used_vacation_days }));
    const mostDays = [...employeesWithDaysLeft].sort((a, b) => b.daysLeft - a.daysLeft).slice(0, 5);
    const leastDays = [...employeesWithDaysLeft].sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);
    populateRankingTable(elements.mostDaysTable, mostDays);
    populateRankingTable(elements.leastDaysTable, leastDays);
}

function populateRankingTable(table, data) {
    table.innerHTML = `<thead><tr><th>Співробітник</th><th>Залишилось днів</th></tr></thead><tbody>
        ${data.map(e => `<tr><td>${e.name}</td><td>${e.daysLeft}</td></tr>`).join('')}
    </tbody>`;
}

// --- Modal and Form Functions ---
function openVacationPeriodForm(id = null) {
  elements.vacationPeriodForm.reset();
  elements.vacationPeriodIdInput.value = '';
  elements.employeeSelectGroup.style.display = currentRole === 'hr' ? 'block' : 'none';
  if (id) {
    const vacation = appData.vacation_periods.find(v => v.id === id);
    if (vacation) {
      elements.vacationPeriodFormTitle.textContent = 'Редагувати період';
      elements.vacationPeriodIdInput.value = vacation.id;
      elements.employeeSelect.value = vacation.employee_id;
      elements.startDateInput.value = vacation.start_date;
      elements.endDateInput.value = vacation.end_date;
      calculateVacationPeriodDays();
    }
  } else {
    elements.vacationPeriodFormTitle.textContent = 'Запланувати період';
    elements.employeeSelect.value = currentUser.id;
  }
  elements.vacationPeriodFormModal.classList.remove('hidden');
}

function calculateVacationPeriodDays() {
  if (elements.startDateInput.value && elements.endDateInput.value) {
    const start = new Date(elements.startDateInput.value);
    const end = new Date(elements.endDateInput.value);
    if (end < start) {
      elements.vacationPeriodDaysInput.value = 'Невірний діапазон';
      return;
    }
    elements.vacationPeriodDaysInput.value = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
  }
}

function handleVacationPeriodFormSubmit(event) {
    event.preventDefault();
    if (currentRole !== 'hr') return alert('Немає прав.');
    const id = parseInt(elements.vacationPeriodIdInput.value, 10);
    const employeeId = parseInt(elements.employeeSelect.value, 10);
    const employee = appData.employees.find(e => e.id === employeeId);
    if (!employee) return alert('Співробітник не знайдений.');
    
    const data = {
        start_date: elements.startDateInput.value,
        end_date: elements.endDateInput.value,
        days: parseInt(elements.vacationPeriodDaysInput.value, 10),
        employee_id: employeeId,
        manager_id: employee.manager_id
    };

    if (id) {
        const index = appData.vacation_periods.findIndex(v => v.id === id);
        if (index !== -1) appData.vacation_periods[index] = { ...appData.vacation_periods[index], ...data };
    } else {
        appData.vacation_periods.push({ ...data, id: Date.now() });
    }
    saveData();
    closeModal(elements.vacationPeriodFormModal);
    applyFilters();
}

function deleteVacationPeriod(id) {
  if (currentRole !== 'hr') return alert('Немає прав.');
  if (confirm('Видалити цей період?')) {
    appData.vacation_periods = appData.vacation_periods.filter(v => v.id !== id);
    saveData();
    applyFilters();
  }
}

function closeModal(modal) {
  if (modal) modal.classList.add('hidden');
}
