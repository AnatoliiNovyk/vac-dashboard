// Application Data
const appData = {
  employees: [
    {"id": 1, "name": "Олексій Коваленко", "role": "employee", "department": "IT", "position": "Senior Developer", "manager_id": 3, "total_vacation": 24, "used_vacation": 8},
    {"id": 2, "name": "Марина Петренко", "role": "employee", "department": "Marketing", "position": "Marketing Specialist", "manager_id": 4, "total_vacation": 22, "used_vacation": 5},
    {"id": 3, "name": "Дмитро Іваненко", "role": "manager", "department": "IT", "position": "IT Manager", "manager_id": 5, "total_vacation": 26, "used_vacation": 12},
    {"id": 4, "name": "Анна Сидоренко", "role": "manager", "department": "Marketing", "position": "Marketing Manager", "manager_id": 5, "total_vacation": 25, "used_vacation": 10},
    {"id": 5, "name": "Володимир Шевченко", "role": "hr", "department": "HR", "position": "HR Director", "manager_id": null, "is_hr_manager": true, "total_vacation": 28, "used_vacation": 14},
    {"id": 6, "name": "Світлана Мельник", "role": "employee", "department": "Finance", "position": "Accountant", "manager_id": 7, "total_vacation": 20, "used_vacation": 6},
    {"id": 7, "name": "Ігор Лисенко", "role": "manager", "department": "Finance", "position": "Finance Manager", "manager_id": 5, "total_vacation": 24, "used_vacation": 9},
    {"id": 8, "name": "Тетяна Бондаренко", "role": "employee", "department": "IT", "position": "Junior Developer", "manager_id": 3, "total_vacation": 20, "used_vacation": 4}
  ],
  vacation_requests: [
    {"id": 1, "employee_id": 1, "start_date": "2025-10-15", "end_date": "2025-10-19", "days": 5, "type": "Щорічна відпустка", "status": "Затверджено", "manager_id": 3},
    {"id": 2, "employee_id": 2, "start_date": "2025-11-10", "end_date": "2025-11-12", "days": 3, "type": "Особиста відпустка", "status": "В очікуванні", "manager_id": 4},
    {"id": 3, "employee_id": 3, "start_date": "2025-12-20", "end_date": "2025-12-30", "days": 9, "type": "Щорічна відпустка", "status": "Затверджено", "manager_id": 5},
    {"id": 4, "employee_id": 6, "start_date": "2025-10-25", "end_date": "2025-10-27", "days": 3, "type": "Лікарняний", "status": "Затверджено", "manager_id": 7},
    {"id": 5, "employee_id": 8, "start_date": "2025-11-15", "end_date": "2025-11-22", "days": 6, "type": "Щорічна відпустка", "status": "В очікуванні", "manager_id": 3},
    {"id": 6, "employee_id": 4, "start_date": "2025-11-05", "end_date": "2025-11-08", "days": 4, "type": "Особиста відпустка", "status": "Відхилено", "manager_id": 5}
  ],
  vacation_types: [
    {"id": 1, "name": "Щорічна відпустка", "color": "#4CAF50"},
    {"id": 2, "name": "Лікарняний", "color": "#FF9800"},
    {"id": 3, "name": "Особиста відпустка", "color": "#2196F3"},
    {"id": 4, "name": "Декретна відпустка", "color": "#9C27B0"}
  ],
  departments: ["IT", "Marketing", "Finance", "HR", "Sales"]
};

// Application State
let currentUser = null;
let currentRole = '';
let currentTab = '';
let currentDate = new Date();
let filteredVacations = [];

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
  statsGrid: document.getElementById('stats-grid'),
  filtersSection: document.getElementById('filters-section'),
  departmentFilter: document.getElementById('department-filter'),
  statusFilter: document.getElementById('status-filter'),
  typeFilter: document.getElementById('type-filter'),
  clearFilters: document.getElementById('clear-filters'),
  calendarGrid: document.getElementById('calendar-grid'),
  currentMonthYear: document.getElementById('current-month-year'),
  prevMonth: document.getElementById('prev-month'),
  nextMonth: document.getElementById('next-month'),
  vacationsTable: document.getElementById('vacations-table'),
  vacationsTableBody: document.getElementById('vacations-table-body'),
  vacationModal: document.getElementById('vacation-modal'),
  modalClose: document.getElementById('modal-close'),
  modalBody: document.getElementById('modal-body'),
  modalFooter: document.getElementById('modal-footer')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

function initializeApp() {
  // Populate filter dropdowns
  populateFilterDropdowns();
  
  // Event listeners
  elements.userRoleSelect.addEventListener('change', handleRoleChange);
  elements.clearFilters.addEventListener('click', clearFilters);
  elements.prevMonth.addEventListener('click', () => changeMonth(-1));
  elements.nextMonth.addEventListener('click', () => changeMonth(1));
  elements.modalClose.addEventListener('click', closeModal);
  elements.vacationModal.addEventListener('click', (e) => {
    if (e.target === elements.vacationModal) closeModal();
  });
  
  // Filter event listeners
  elements.departmentFilter.addEventListener('change', applyFilters);
  elements.statusFilter.addEventListener('change', applyFilters);
  elements.typeFilter.addEventListener('change', applyFilters);
  
  updateCalendar();
}

function populateFilterDropdowns() {
  // Populate departments
  appData.departments.forEach(dept => {
    const option = document.createElement('option');
    option.value = dept;
    option.textContent = dept;
    elements.departmentFilter.appendChild(option);
  });
  
  // Populate vacation types
  appData.vacation_types.forEach(type => {
    const option = document.createElement('option');
    option.value = type.name;
    option.textContent = type.name;
    elements.typeFilter.appendChild(option);
  });
}

function handleRoleChange() {
  const selectedRole = elements.userRoleSelect.value;
  if (selectedRole) {
    currentRole = selectedRole;
    
    // Set current user based on role
    if (selectedRole === 'hr') {
      currentUser = appData.employees.find(emp => emp.role === 'hr');
    } else if (selectedRole === 'manager') {
      currentUser = appData.employees.find(emp => emp.role === 'manager');
    } else {
      currentUser = appData.employees.find(emp => emp.role === 'employee');
    }
    
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
  updateStatistics();
  applyFilters();
  updateCalendar();
}

function updateUserInfo() {
  if (!currentUser) return;
  
  elements.currentUserName.textContent = currentUser.name;
  elements.currentUserRole.textContent = getRoleDisplayName(currentUser.role);
  elements.totalDays.textContent = currentUser.total_vacation;
  elements.usedDays.textContent = currentUser.used_vacation;
  elements.remainingDays.textContent = currentUser.total_vacation - currentUser.used_vacation;
}

function getRoleDisplayName(role) {
  const roles = {
    'hr': 'HR',
    'manager': 'Менеджер',
    'employee': 'Співробітник'
  };
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
  
  // Set initial tab
  if (tabs.length > 0) {
    currentTab = tabs[0].key;
    updateTabContent();
  }
}

function getTabsForRole(role) {
  switch (role) {
    case 'hr':
      const tabs = [
        { key: 'hr-all', label: 'HR', icon: 'fas fa-users' }
      ];
      
      // Add Manager tab if HR is also a manager
      if (currentUser && currentUser.is_hr_manager) {
        tabs.push({ key: 'hr-manager', label: 'Manager', icon: 'fas fa-user-tie' });
      }
      
      tabs.push({ key: 'hr-my', label: 'My View', icon: 'fas fa-user' });
      return tabs;
      
    case 'manager':
      return [
        { key: 'manager-team', label: 'Manager', icon: 'fas fa-users' },
        { key: 'manager-my', label: 'My View', icon: 'fas fa-user' }
      ];
      
    case 'employee':
      return [
        { key: 'employee-my', label: 'My View', icon: 'fas fa-user' }
      ];
      
    default:
      return [];
  }
}

function switchTab(tabKey, tabButton) {
  // Update active tab button
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  tabButton.classList.add('active');
  
  currentTab = tabKey;
  updateTabContent();
}

function updateTabContent() {
  // Show/hide filters based on tab
  const showFilters = ['hr-all', 'hr-manager', 'manager-team'].includes(currentTab);
  elements.filtersSection.style.display = showFilters ? 'block' : 'none';
  
  updateStatistics();
  applyFilters();
}

function getVacationsForCurrentTab() {
  switch (currentTab) {
    case 'hr-all':
      // All employees' vacations
      return appData.vacation_requests;
      
    case 'hr-manager':
      // Subordinates' vacations (HR as manager)
      const subordinateIds = appData.employees
        .filter(emp => emp.manager_id === currentUser.id)
        .map(emp => emp.id);
      return appData.vacation_requests.filter(req => subordinateIds.includes(req.employee_id));
      
    case 'hr-my':
    case 'manager-my':
    case 'employee-my':
      // Current user's own vacations
      return appData.vacation_requests.filter(req => req.employee_id === currentUser.id);
      
    case 'manager-team':
      // Manager's subordinates' vacations
      const teamIds = appData.employees
        .filter(emp => emp.manager_id === currentUser.id)
        .map(emp => emp.id);
      return appData.vacation_requests.filter(req => teamIds.includes(req.employee_id));
      
    default:
      return [];
  }
}

function updateStatistics() {
  const vacations = getVacationsForCurrentTab();
  
  const stats = {
    total: vacations.length,
    pending: vacations.filter(v => v.status === 'В очікуванні').length,
    approved: vacations.filter(v => v.status === 'Затверджено').length,
    rejected: vacations.filter(v => v.status === 'Відхилено').length
  };
  
  elements.statsGrid.innerHTML = `
    <div class="stat-card stat-card--total">
      <div class="stat-card-icon">
        <i class="fas fa-calendar-alt"></i>
      </div>
      <div class="stat-card-value">${stats.total}</div>
      <div class="stat-card-label">Всього заявок</div>
    </div>
    <div class="stat-card stat-card--pending">
      <div class="stat-card-icon">
        <i class="fas fa-clock"></i>
      </div>
      <div class="stat-card-value">${stats.pending}</div>
      <div class="stat-card-label">В очікуванні</div>
    </div>
    <div class="stat-card stat-card--approved">
      <div class="stat-card-icon">
        <i class="fas fa-check"></i>
      </div>
      <div class="stat-card-value">${stats.approved}</div>
      <div class="stat-card-label">Затверджено</div>
    </div>
    <div class="stat-card stat-card--rejected">
      <div class="stat-card-icon">
        <i class="fas fa-times"></i>
      </div>
      <div class="stat-card-value">${stats.rejected}</div>
      <div class="stat-card-label">Відхилено</div>
    </div>
  `;
}

function applyFilters() {
  let vacations = getVacationsForCurrentTab();
  
  // Apply filters
  const deptFilter = elements.departmentFilter.value;
  const statusFilter = elements.statusFilter.value;
  const typeFilter = elements.typeFilter.value;
  
  if (deptFilter) {
    vacations = vacations.filter(v => {
      const employee = appData.employees.find(emp => emp.id === v.employee_id);
      return employee && employee.department === deptFilter;
    });
  }
  
  if (statusFilter) {
    vacations = vacations.filter(v => v.status === statusFilter);
  }
  
  if (typeFilter) {
    vacations = vacations.filter(v => v.type === typeFilter);
  }
  
  filteredVacations = vacations;
  updateTable();
  updateCalendar();
}

function clearFilters() {
  elements.departmentFilter.value = '';
  elements.statusFilter.value = '';
  elements.typeFilter.value = '';
  applyFilters();
}

function updateTable() {
  elements.vacationsTableBody.innerHTML = '';
  
  if (filteredVacations.length === 0) {
    elements.vacationsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <i class="fas fa-calendar-times"></i>
          <p>Немає відпусток для відображення</p>
        </td>
      </tr>
    `;
    return;
  }
  
  filteredVacations.forEach(vacation => {
    const employee = appData.employees.find(emp => emp.id === vacation.employee_id);
    const row = document.createElement('tr');
    
    const canApprove = ['hr-all', 'hr-manager', 'manager-team'].includes(currentTab) && 
                      vacation.status === 'В очікуванні';
    
    row.innerHTML = `
      <td>${employee ? employee.name : 'Невідомо'}</td>
      <td>${employee ? employee.department : 'Невідомо'}</td>
      <td>${formatDate(vacation.start_date)}</td>
      <td>${formatDate(vacation.end_date)}</td>
      <td>${vacation.days}</td>
      <td>
        <span class="vacation-type vacation-type--${getVacationTypeClass(vacation.type)}">
          ${vacation.type}
        </span>
      </td>
      <td>
        <span class="status status--${getStatusClass(vacation.status)}">
          ${vacation.status}
        </span>
      </td>
      <td class="actions-column">
        <div class="action-buttons">
          ${canApprove ? `
            <button class="btn btn--approve btn-icon" onclick="approveVacation(${vacation.id})" title="Затвердити">
              <i class="fas fa-check"></i>
            </button>
            <button class="btn btn--reject btn-icon" onclick="rejectVacation(${vacation.id})" title="Відхилити">
              <i class="fas fa-times"></i>
            </button>
          ` : `
            <button class="btn btn--outline btn-icon" onclick="viewVacationDetails(${vacation.id})" title="Переглянути">
              <i class="fas fa-eye"></i>
            </button>
          `}
        </div>
      </td>
    `;
    
    elements.vacationsTableBody.appendChild(row);
  });
}

function getVacationTypeClass(type) {
  const typeMap = {
    'Щорічна відпустка': 'annual',
    'Лікарняний': 'sick',
    'Особиста відпустка': 'personal',
    'Декретна відпустка': 'maternity'
  };
  return typeMap[type] || 'annual';
}

function getStatusClass(status) {
  const statusMap = {
    'В очікуванні': 'pending',
    'Затверджено': 'approved',
    'Відхилено': 'rejected'
  };
  return statusMap[status] || 'pending';
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('uk-UA');
}

function updateCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Update month/year display
  const monthNames = [
    'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
    'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
  ];
  elements.currentMonthYear.textContent = `${monthNames[month]} ${year}`;
  
  // Clear calendar
  elements.calendarGrid.innerHTML = '';
  
  // Add day headers
  const dayHeaders = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
  dayHeaders.forEach(day => {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day calendar-day--header';
    dayElement.textContent = day;
    elements.calendarGrid.appendChild(dayElement);
  });
  
  // Calculate calendar days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1));
  
  const today = new Date();
  
  // Generate calendar days
  for (let i = 0; i < 42; i++) {
    const currentDay = new Date(startDate);
    currentDay.setDate(startDate.getDate() + i);
    
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    dayElement.textContent = currentDay.getDate();
    
    // Add classes
    if (currentDay.getMonth() !== month) {
      dayElement.classList.add('calendar-day--other-month');
    }
    
    if (currentDay.toDateString() === today.toDateString()) {
      dayElement.classList.add('calendar-day--today');
    }
    
    // Check for vacations on this day
    const dayString = currentDay.toISOString().split('T')[0];
    const dayVacations = filteredVacations.filter(v => {
      const startDate = new Date(v.start_date);
      const endDate = new Date(v.end_date);
      return currentDay >= startDate && currentDay <= endDate;
    });
    
    if (dayVacations.length > 0) {
      dayElement.classList.add('calendar-day--vacation');
      const vacationType = appData.vacation_types.find(type => type.name === dayVacations[0].type);
      if (vacationType) {
        dayElement.style.setProperty('--vacation-color', vacationType.color);
      }
      
      dayElement.title = dayVacations.map(v => {
        const employee = appData.employees.find(emp => emp.id === v.employee_id);
        return `${employee ? employee.name : 'Невідомо'}: ${v.type}`;
      }).join('\n');
    }
    
    elements.calendarGrid.appendChild(dayElement);
  }
}

function changeMonth(direction) {
  currentDate.setMonth(currentDate.getMonth() + direction);
  updateCalendar();
}

// Action functions
function approveVacation(vacationId) {
  const vacation = appData.vacation_requests.find(v => v.id === vacationId);
  if (vacation) {
    vacation.status = 'Затверджено';
    updateStatistics();
    applyFilters();
  }
}

function rejectVacation(vacationId) {
  const vacation = appData.vacation_requests.find(v => v.id === vacationId);
  if (vacation) {
    vacation.status = 'Відхилено';
    updateStatistics();
    applyFilters();
  }
}

function viewVacationDetails(vacationId) {
  const vacation = appData.vacation_requests.find(v => v.id === vacationId);
  if (!vacation) return;
  
  const employee = appData.employees.find(emp => emp.id === vacation.employee_id);
  const vacationType = appData.vacation_types.find(type => type.name === vacation.type);
  
  elements.modalBody.innerHTML = `
    <div class="modal-field">
      <strong>Співробітник:</strong>
      ${employee ? employee.name : 'Невідомо'}
    </div>
    <div class="modal-field">
      <strong>Департамент:</strong>
      ${employee ? employee.department : 'Невідомо'}
    </div>
    <div class="modal-field">
      <strong>Посада:</strong>
      ${employee ? employee.position : 'Невідомо'}
    </div>
    <div class="modal-field">
      <strong>Тип відпустки:</strong>
      <span class="vacation-type vacation-type--${getVacationTypeClass(vacation.type)}">
        ${vacation.type}
      </span>
    </div>
    <div class="modal-field">
      <strong>Дата початку:</strong>
      ${formatDate(vacation.start_date)}
    </div>
    <div class="modal-field">
      <strong>Дата закінчення:</strong>
      ${formatDate(vacation.end_date)}
    </div>
    <div class="modal-field">
      <strong>Кількість днів:</strong>
      ${vacation.days}
    </div>
    <div class="modal-field">
      <strong>Статус:</strong>
      <span class="status status--${getStatusClass(vacation.status)}">
        ${vacation.status}
      </span>
    </div>
  `;
  
  elements.modalFooter.innerHTML = `
    <button class="btn btn--outline" onclick="closeModal()">Закрити</button>
  `;
  
  elements.vacationModal.classList.remove('hidden');
}

function closeModal() {
  elements.vacationModal.classList.add('hidden');
}