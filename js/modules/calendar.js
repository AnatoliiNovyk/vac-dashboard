/**
 * Calendar Module
 * Renders vacation calendar for teams
 */

import { appState } from '../core/state.js';
import { formatDate, formatMonthLabel, createUtcDate, addMonthsUtc, addDaysUtc, startOfMonthUtc, startOfWeekMondayUtc } from '../utils/formatters.js';
import { createElement, clearNode } from '../utils/dom.js';

let elements = {};

/**
 * Initialize calendar module
 * @param {Object} deps - Dependencies (elements)
 */
export function initCalendar(deps) {
    elements = deps.elements;
    console.log('[calendar] Calendar module initialized');
}

/**
 * Render team calendar
 * @param {Array} employees - Employees to show
 * @param {Object} options - Rendering options
 */
export function renderCalendar(employees, options = {}) {
    if (!elements.calendar || !elements.calendarControls) {
        return;
    }

    clearNode(elements.calendar);
    clearNode(elements.calendarControls);

    if (!employees || employees.length === 0) {
        elements.calendar.innerHTML = "<em>Немає даних для відображення.</em>";
        return;
    }

    const todayIso = formatDate(new Date());
    const baseDate = appState.calendarBaseDateIso
        ? new Date(appState.calendarBaseDateIso + "T00:00:00Z")
        : new Date();

    const monthStart = startOfMonthUtc(addMonthsUtc(baseDate, appState.calendarMonthOffset || 0));

    // Render controls
    renderCalendarControls(monthStart);

    // Render grid
    renderCalendarGrid(monthStart, employees, todayIso);
}

/**
 * Render calendar controls (prev/next month)
 * @param {Date} monthStart - Start of current month
 */
function renderCalendarControls(monthStart) {
    const prevBtn = createElement("button", "calendar-nav-btn", "← Попередній місяць");
    prevBtn.addEventListener("click", () => navigateCalendar(-1));

    const monthLabel = createElement("div", "calendar-month-label", formatMonthLabel(monthStart));

    const nextBtn = createElement("button", "calendar-nav-btn", "Наступний місяць →");
    nextBtn.addEventListener("click", () => navigateCalendar(1));

    elements.calendarControls.appendChild(prevBtn);
    elements.calendarControls.appendChild(monthLabel);
    elements.calendarControls.appendChild(nextBtn);
}

/**
 * Render calendar grid
 * @param {Date} monthStart - Start of month
 * @param {Array} employees - Employees
 * @param {string} todayIso - Today's date (ISO)
 */
function renderCalendarGrid(monthStart, employees, todayIso) {
    const grid = createElement("div", "calendar-grid");

    // Header row (days of week)
    const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
    weekDays.forEach(day => {
        const header = createElement("div", "calendar-header", day);
        grid.appendChild(header);
    });

    // Get all vacation periods
    const allPeriods = [];
    employees.forEach(emp => {
        if (emp.vacationPeriods) {
            emp.vacationPeriods.forEach(period => {
                allPeriods.push({ ...period, employee: emp });
            });
        }
    });

    // Render days
    const weekStart = startOfWeekMondayUtc(monthStart);
    let cursor = new Date(weekStart);

    for (let i = 0; i < 42; i++) { // 6 weeks max
        const dayIso = formatDate(cursor);
        const inCurrentMonth = cursor.getUTCMonth() === monthStart.getUTCMonth();

        const day = createElement("div", "calendar-day");
        if (!inCurrentMonth) {
            day.classList.add("calendar-day--other-month");
        }
        if (dayIso === todayIso) {
            day.classList.add("calendar-day--today");
        }

        const dateLabel = createElement("div", "calendar-day-date", String(cursor.getUTCDate()));
        day.appendChild(dateLabel);

        // Find vacations for this day
        const dayVacations = allPeriods.filter(p =>
            dayIso >= p.start_date && dayIso <= p.end_date
        );

        if (dayVacations.length > 0) {
            const badge = createElement("div", "calendar-day-badge", String(dayVacations.length));
            day.appendChild(badge);
        }

        grid.appendChild(day);
        cursor = addDaysUtc(cursor, 1);
    }

    elements.calendar.appendChild(grid);
}

/**
 * Navigate calendar (change month)
 * @param {number} direction - -1 for previous, +1 for next
 */
export function navigateCalendar(direction) {
    appState.calendarMonthOffset = (appState.calendarMonthOffset || 0) + direction;
    if (window.onCalendarNavigate) {
        window.onCalendarNavigate();
    }
}
