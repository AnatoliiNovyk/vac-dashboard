# Changelog: Optimize Chart Rendering Lifecycle

**Issue**: The root cause of the UI flickering and performance lag in the HR view was traced to the chart rendering lifecycle. On every filter change, the Chart.js instances were being destroyed and completely recreated. This is a computationally expensive process that was blocking the main thread and causing a poor user experience.

**Solution**: The chart rendering logic was refactored to follow a more efficient `initialize-once-update-many` pattern. This avoids the costly destroy/recreate cycle and instead leverages Chart.js's built-in `update()` method for fast and smooth data updates.

## 1. Architectural Changes

- **Memoized Chart Options**: Static chart configuration objects (`options`) were extracted into global constants to prevent their recreation on every render cycle.
- **Lazy Initialization**: A new function, `initCharts()`, was introduced. This function is called only once when the HR tab is first activated. It checks if the chart instances exist in the global `charts` object and creates them only if they don't.
- **Data-Only Updates**: The chart update functions (`updateEmployeeStatusChart`, `updateDepartmentLeaveChart`) were fundamentally changed. Instead of destroying the chart, they now perform two simple steps:
  1.  Update the `data` array within the existing chart instance's `data.datasets`.
  2.  Call `chart.update()` to trigger a fast, efficient re-render of the chart with the new data.

## 2. Files and Lines Changed

- **`app.js`**:
  - **Lines 8-22**: Added constant objects for chart configurations (`commonChartOptions`, `employeeStatusChartOptions`, `departmentLeaveChartOptions`) to prevent re-creation.
  - **`updateTabContent()` (Line 210)**: Added a call to the new `initCharts()` function to ensure charts are ready when the HR view is displayed.
  - **`initCharts()` (Lines 371-393)**: New function responsible for the one-time initialization of both charts.
  - **`updateEmployeeStatusChart()` (Lines 429-433)**: Re-implemented to check if the chart instance exists, then directly update its dataset and call `.update()`. The `destroy()` call was removed.
  - **`updateDepartmentLeaveChart()` (Lines 435-447)**: Re-implemented with the same optimization, updating the datasets for "Used" and "Total" days and calling `.update()`. The `destroy()` call was removed.

## 3. Manual Test Results

- **Performance**:
  - **Result**: PASSED. The performance of the HR view is now excellent. Applying and clearing filters is instantaneous. The charts update smoothly with no flickering or lag, confirming that the destroy/recreate cycle has been eliminated.
- **Initial Load**:
  - **Result**: PASSED. Charts are correctly initialized the first time the HR tab is viewed and persist through subsequent tab switches.
- **Data Accuracy**:
  - **Result**: PASSED. The chart data remains accurate and perfectly synchronized with the filtered data in the table.
- **Resource Management**:
  - **Result**: PASSED. Profiling in the browser's developer tools shows a significant reduction in memory churn and CPU usage during filter operations, indicating a more stable and efficient application.

## 4. Risks and Rollback Plan

- **Risks**:
  - **Low**. This change isolates the chart logic and improves it according to the library's best practices. The risk of unintended side effects is minimal.
- **Rollback Plan**:
  - The previous implementation can be restored by checking out the prior commit from the git history.
