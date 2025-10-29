
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('#login-form form');
    const ipnInput = document.getElementById('ipn');
    const errorContainer = document.getElementById('error-container');
    const mainContent = document.getElementById('main-content');
    const loginFormDiv = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const employeeDashboard = document.getElementById('employee-dashboard');
    const managerDashboard = document.getElementById('manager-dashboard');
    const hrDashboard = document.getElementById('hr-dashboard');
    const hrEmployeeList = document.getElementById('hr-employee-list');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const ipn = ipnInput.value;
        errorContainer.style.display = 'none';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ipn }),
            });

            if (response.ok) {
                const { role } = await response.json();
                loginFormDiv.style.display = 'none';
                mainContent.style.display = 'block';

                if (role === 'hr') {
                    hrDashboard.style.display = 'block';
                    await fetchAndDisplayHrData();
                } else if (role === 'manager') {
                    managerDashboard.style.display = 'block';
                } else {
                    employeeDashboard.style.display = 'block';
                }
            } else {
                const errorMessage = await response.text();
                errorContainer.textContent = errorMessage;
                errorContainer.style.display = 'block';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorContainer.textContent = 'An unexpected error occurred. Please try again.';
            errorContainer.style.display = 'block';
        }
    });

    async function fetchAndDisplayHrData() {
        try {
            const response = await fetch('/api/employees');
            if (response.ok) {
                const employees = await response.json();
                hrEmployeeList.innerHTML = '';
                employees.forEach(employee => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `Name: ${employee.name}, Department: ${employee.department}, Status: ${employee.status}`;
                    hrEmployeeList.appendChild(listItem);
                });
            } else {
                console.error('Failed to fetch HR data');
            }
        } catch (error) {
            console.error('Error fetching HR data:', error);
        }
    }

    logoutBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
            });

            if (response.ok) {
                loginFormDiv.style.display = 'block';
                mainContent.style.display = 'none';
                hrDashboard.style.display = 'none';
                managerDashboard.style.display = 'none';
                employeeDashboard.style.display = 'none';
                ipnInput.value = '';
            } else {
                const errorMessage = await response.text();
                errorContainer.textContent = errorMessage;
                errorContainer.style.display = 'block';
            }
        } catch (error) {
            console.error('Logout error:', error);
            errorContainer.textContent = 'An unexpected error occurred during logout. Please try again.';
            errorContainer.style.display = 'block';
        }
    });
});
