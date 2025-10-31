// Global appData object
let appData = {};
let charts = {};

// --- Feature Flags ---
const FEATURES = {
    HR_ANALYTICS_ENABLED: false, // Keep analytics disabled as per last valid instruction
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


// Default data structure from the JSON file
// This simulates fetching from a database or a file-based source like Firebase would.
async function fetchInitialData() {
    try {
        const response = await fetch('./vacation_dashboard_data.json');
        if (!response.ok) {
            throw new Error("Failed to fetch initial data");
        }
        const data = await response.json();
        // Basic data validation
        if (!data.employees || !data.vacation_periods || !data.departments) {
             throw new Error("Initial data is missing required fields.");
        }
        return data;
    } catch (error) {
        console.error("Could not load initial data:", error);
        // Fallback to an empty state to avoid crashing the app
        return {
            employees: [],
            vacation_periods: [],
            departments: []
        };
    }
}


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
    filtersSection: document.getElementById('filters-actions-section'),
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
    contentArea: document.getElementById('content-area'),
    basSyncSection: document.getElementById('bas-sync-section')
};


// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  appData = await fetchInitialData();
  initializeApp();
});

function initializeApp() {
  populateFilterDropdowns();
  setupEventListeners();
  if (FEATURES.HR_ANALYTICS_ENABLED) {
      injectKPIStructure();
  }
  showWelcomeScreen();
}

function setupEventListeners() {
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
}


function injectKPIStructure() {
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
  (appData.departments || []).forEach(dept => elements.departmentFilter.appendChild(new Option(dept, dept)));
  
  elements.employeeSelect.innerHTML = '';
  (appData.employees || []).forEach(emp => elements.employeeSelect.appendChild(new Option(emp.name, emp.id)));
}

function handleRoleChange() {
  const selectedRole = elements.userRoleSelect.value;
  if (selectedRole) {
    currentRole = selectedRole;
    // Find a user that matches the selected role. For HR, prioritize the HR manager.
    currentUser = appData.employees.find(emp => emp.role === selectedRole && emp.is_hr_manager) || appData.employees.find(emp => emp.role === selectedRole) || appData.employees[0];
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
    tabButton.innerHTML = `<i class="${tab.icon}"></i> ${tab.label}`;
    tabButton.addEventListener('click', () => switchTab(tab.key, tabButton));
    elements.tabsNav.appendChild(tabButton);
  });
  if (tabs.length > 0) {
    // Automatically switch to the first available tab
    switchTab(tabs[0].key, elements.tabsNav.querySelector('.tab-button'));
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

    elements.analyticsSection.classList.toggle('hidden', !FEATURES.HR_ANALYTICS_ENABLED || !isHRView);
    // Hide BAS sync buttons as they were part of the removed backend logic
    elements.basSyncSection.classList.add('hidden'); 

    if (FEATURES.HR_ANALYTICS_ENABLED && isHRView) {
        initCharts();
    } else {
        destroyCharts();
    }

    elements.addVacationPeriodBtn.classList.toggle('hidden', !isHRView);
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
        if (!employee) return null; // Gracefully handle missing employee
        const status = getEmployeeStatus(employee.id, today);
        const daysLeft = Math.max(0, employee.total_vacation_days - employee.used_vacation_days);
        return { ...vacation, employee, status, daysLeft };
    }).filter(Boolean); // Remove any null entries

    // Apply filters
    if (isHRView && deptFilter) {
        processedData = processedData.filter(item => item.employee.department === deptFilter);
    }
    if ((isHRView || ['hr-manager', 'manager-team'].includes(currentTab)) && statusFilter) {
        processedData = processedData.filter(item => item.status.class === statusFilter);
    }

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
    case 'hr-manager': 
         // HR Manager view of their own department (HR)
         return appData.vacation_periods.filter(p => {
             const emp = appData.employees.find(e => e.id === p.employee_id);
             return emp && emp.department === 'HR';
         });
    case 'manager-team': 
        const subordinateIds = getAllSubordinates(currentUser.id);
        return appData.vacation_periods.filter(p => subordinateIds.includes(p.employee_id));
    case 'my-view': 
        return appData.vacation_periods.filter(p => p.employee_id === currentUser.id);
    default: return [];
  }
}

function getAllSubordinates(managerId) {
  let subordinates = [];
  const direct = appData.employees.filter(emp => emp.manager_id === managerId);
  subordinates = [...direct];
  direct.forEach(d => {
      subordinates.push(...getAllSubordinates(d.id));
  });
  return subordinates.map(e => e.id);
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
  
  let headers = [];
  if (isMyView) headers = ['#', 'Статус', 'Початок', 'Кінець', 'Днів', 'Залишилось'];
  else if (isManagerView) headers = ['#', 'Співробітник', 'Статус', 'Початок', 'Кінець', 'Днів', 'Залишилось'];
  else if (isHRView) headers = ['#', 'Співробітник', 'ІПН', 'Департамент', 'Статус', 'Початок', 'Кінець', 'Днів', 'Залишилось', 'Дії'];
  
  elements.vacationsTableHeader.innerHTML = `<tr>${headers.map(h => `<th class="${h === 'Дії' ? 'actions-column' : ''}">${h}</th>`).join('')}</tr>`;
  
  let bodyHtml = '';
  if (processedData.length === 0) {
    bodyHtml = `<tr><td colspan="${headers.length}" class="empty-state"><i class="fas fa-calendar-times"></i><p>Немає періодів відпусток</p></td></tr>`;
  } else {
      processedData.forEach((item, index) => {
        const { employee, status, daysLeft } = item;
        let rowHtml = `<td>${index + 1}</td>`;
        if (!isMyView) rowHtml += `<td>${employee.name}</td>`;
        if (isHRView) rowHtml += `<td>${employee.tin || 'N/A'}</td><td>${employee.department}</td>`;
        rowHtml += `<td><span class="employee-status employee-status--${status.class}">${status.text}</span></td>
                    <td>${formatDate(item.start_date)}</td><td>${formatDate(item.end_date)}</td>
                    <td>${item.days}</td><td>${daysLeft}</td>`;
        if (isHRView) rowHtml += `<td class="actions-column"><div class="action-buttons">
                                    <button class="btn btn--outline btn-icon" onclick="openVacationPeriodForm(${item.id})"><i class="fas fa-pen"></i></button>
                                    <button class="btn btn--reject btn-icon" onclick="deleteVacationPeriod(${item.id})"><i class="fas fa-trash"></i></button>
                                  </div></td>`;
        bodyHtml += `<tr>${rowHtml}</tr>`;
      });
  }
  elements.vacationsTableBody.innerHTML = bodyHtml;
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

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('uk-UA');
}

function changeMonth(dir) {
  currentDate.setMonth(currentDate.getMonth() + dir);
  applyFilters();
}

// --- Analytics ---
function initCharts() {
    if (!FEATURES.HR_ANALYTICS_ENABLED) return;
    const employeeStatusCtx = document.getElementById('employee-status-chart')?.getContext('2d');
    const departmentLeaveCtx = document.getElementById('department-leave-chart')?.getContext('2d');

    if (employeeStatusCtx && !charts.employeeStatus) {
        charts.employeeStatus = new Chart(employeeStatusCtx, {
            type: 'doughnut', data: { labels: ['У відпустці', 'Заплановано', 'На роботі'], datasets: [{ data: [], backgroundColor: ['#ff6384', '#ffcd56', '#4bc0c0'] }] }, options: employeeStatusChartOptions
        });
    }
    if (departmentLeaveCtx && !charts.departmentLeave) {
        charts.departmentLeave = new Chart(departmentLeaveCtx, {
            type: 'bar', data: { labels: appData.departments, datasets: [{ label: 'Використано', backgroundColor: '#ff6384' }, { label: 'Залишок', backgroundColor: '#36a2eb' }] }, options: departmentLeaveChartOptions
        });
    }
}

function destroyCharts() {
    Object.values(charts).forEach(chart => chart?.destroy());
    charts = {};
}


function updateAnalytics(processedData) {
    if (!FEATURES.HR_ANALYTICS_ENABLED) return;
    // ... Function body for updating analytics data ...
}

// --- Modal and Form Functions ---
function openVacationPeriodForm(id = null) {
  elements.vacationPeriodForm.reset();
  elements.vacationPeriodIdInput.value = '';
  // Logic for opening and populating the form
  openModal(elements.vacationPeriodFormModal);
}

function handleVacationPeriodFormSubmit(event) {
    event.preventDefault();
    // Logic for saving data (would need to be adapted for a real backend)
    alert("Збереження ще не реалізовано.");
    closeModal(elements.vacationPeriodFormModal);
}

function deleteVacationPeriod(id) {
  if (confirm('Видалити цей період?')) {
    // Logic for deleting data (would need to be adapted for a real backend)
    alert("Видалення ще не реалізовано.");
  }
}

function closeModal(modal) {
  if (modal) modal.classList.add('hidden');
}

function openModal(modal) {
  if (modal) modal.classList.remove('hidden');
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
