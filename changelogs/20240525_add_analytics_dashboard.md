# Changelog: Add Analytics Dashboard for HR View

This update introduces a new analytics and reporting section, exclusively available to users with the HR role. The dashboard provides key performance indicators (KPIs), visual charts, and employee rankings to help HR managers monitor and analyze vacation usage across the organization.

## 1. Files and Lines Changed

- **`index.html`**:
  - Line 6: Added a script tag to include the `Chart.js` library from a CDN, which is essential for rendering the new charts.
  - Lines 142-159: Introduced a new `<div id="analytics-section">`, which serves as the main container for the entire analytics dashboard. This section is hidden by default and is only displayed for the HR role.
  - The new section includes:
    - **KPI Grid**: Five `kpi-card` divs for displaying key metrics.
    - **Charts Grid**: Two `chart-container` divs to hold the canvases for the employee status and department leave charts.
    - **Employee Rankings**: Two `ranking-table` divs for the "Top 5" employee lists.

- **`app.js`**:
  - Line 4: Initialized a global `charts` object to manage the lifecycle of `Chart.js` instances, preventing memory leaks and rendering issues on updates.
  - Lines 60-72: Added new DOM element references for all the analytics components, including KPIs, charts, and tables.
  - Line 202: In `updateTabContent`, added logic to unhide the `analytics-section` and call `updateAnalytics()` only when the `currentTab` is `hr-all`.
  - Lines 488-563: Added a new `// --- Analytics ---` section containing five new functions:
    - `updateAnalytics()`: The main function that orchestrates the data calculation and rendering for all analytics components.
    - `updateEmployeeStatusChart()`: Calculates the distribution of employees by status (on leave, planned, at work) and renders a doughnut chart.
    - `updateDepartmentLeaveChart()`: Aggregates used and total vacation days by department and renders a stacked bar chart.
    - `updateEmployeeRankings()`: Sorts employees by their remaining vacation days to find the top 5 with the most and fewest days.
    - `populateRankingTable()`: A helper function to dynamically generate the HTML for the employee ranking tables.

## 2. Data Sources, Formulas, and Calculation Examples

- **KPI Formulas**:
  - **Total Employees**: `appData.employees.length`
  - **Currently on leave**: `employeeStatuses.filter(s => s === 'on-leave').length`
  - **Planned leaves**: `employeeStatuses.filter(s => s === 'planned').length`
  - **Average days left**: `(totalDays - totalUsed) / appData.employees.length`
  - **Burn Rate**: `(totalUsed / totalDays) * 100`

- **Chart Data Aggregation**:
  - **Employee Status (Doughnut Chart)**:
    - **Source**: `appData.employees` is iterated, and `getEmployeeStatus(e.id)` is called for each.
    - **Logic**: Counts occurrences of "on-leave", "planned", and "at-work" statuses.
  - **Department Leave (Bar Chart)**:
    - **Source**: `appData.employees` and `appData.departments`.
    - **Logic**: For each department, it filters employees belonging to it and then uses `reduce` to sum their `used_vacation_days` and `total_vacation_days`.

- **Employee Rankings**:
  - **Source**: `appData.employees`.
  - **Logic**: A new property `daysLeft` is calculated for each employee. The array is then sorted in ascending and descending order based on this property, and the top 5 results are taken using `slice(0, 5)`.

## 3. Manual Test Results

- **HR View**:
  - **Result**: PASSED. The analytics section is visible and correctly populated. KPIs show the right numbers, charts render with accurate data, and the employee ranking tables are correct.
- **Manager View**:
  - **Result**: PASSED. The analytics section is not visible, which is the expected behavior.
- **Employee View**:
  - **Result**: PASSED. The analytics section is not visible, which is the expected behavior.
- **Data Filtering**:
  - **Result**: PASSED. The analytics section is independent of the main table filters, which is correct. The KPIs and charts reflect the overall data, not the filtered results.

## 4. Risks and Rollback Plan

- **Risks**:
  - **Low**. The primary risk is performance degradation on very large datasets (e.g., thousands of employees), as calculations are performed client-side. For the current application scale, this is not a concern. There is also a minor risk of chart rendering issues if the `Chart.js` library fails to load.

- **Rollback Plan**:
  - To roll back, revert the changes in `index.html` and `app.js` by checking out the previous commit from git. No data changes were made, so no data rollback is necessary.
