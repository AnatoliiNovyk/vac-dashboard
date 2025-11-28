/**
 * Calendar Module
 * Renders vacation calendar for teams (original implementation from app.js)
 */

import { appState } from '../core/state.js';
import { formatDate, formatMonthLabel, formatRange, createUtcDate, addMonthsUtc, addDaysUtc, startOfMonthUtc, startOfWeekMondayUtc, parseIsoDateToUtc } from '../utils/formatters.js';
import { createElement, clearNode } from '../utils/dom.js';

let elements = {};

const PAST_STATUS_LABEL = "Минулі відпустки";

/**
 * Initialize calendar module
 * @param {Object} deps - Dependencies (elements)
 */
export function initCalendar(deps) {
    elements = deps.elements;
    console.log('[calendar] Calendar module initialized');
}

/**
 * Check if period intersects with year
 * @param {Object} period - Vacation period
 * @param {number} year - Year to check
 * @returns {boolean}
 */
function periodIntersectsYear(period, year) {
    if (!period || !period.start_date || !period.end_date) {
        return false;
    }
    const yearStart = createUtcDate(year, 0, 1);
    const yearEnd = createUtcDate(year, 11, 31);
    const periodStart = parseIsoDateToUtc(period.start_date);
    const periodEnd = parseIsoDateToUtc(period.end_date);
    if (!periodStart || !periodEnd) {
        return false;
    }
    return periodStart <= yearEnd && periodEnd >= yearStart;
}

/**
 * Sanitize My View status filter
 * @param {string} value - Status value
 * @returns {string}
 */
function sanitizeMyViewStatus(value) {
    const allowed = ["", "Заплановано", PAST_STATUS_LABEL];
    return allowed.includes(value) ? value : "";
}

/**
 * Render team calendar (original from app.js)
 * @param {Array} employees - Employees to show
 * @param {Object} options - Rendering options
 */
export function renderCalendar(employees, options = {}) {
    if (!elements.calendar || !elements.calendarControls || !elements.calendarLegend) {
        return;
    }
    clearNode(elements.calendar);
    clearNode(elements.calendarControls);
    clearNode(elements.calendarLegend);

    const todayIso = formatDate(new Date());
    const fallbackIso = todayIso;

    const statusFilter = Object.prototype.hasOwnProperty.call(options, "statusFilterOverride")
        ? sanitizeMyViewStatus(options.statusFilterOverride || "")
        : options.ignoreFilters
            ? ""
            : appState.filters?.status || "";
    const includePast = Boolean(options.includePast);
    const yearFilter = Number.isFinite(options.yearFilter) ? options.yearFilter : null;
    const yearStartDate = yearFilter !== null ? createUtcDate(yearFilter, 0, 1) : null;
    const yearEndDate = yearFilter !== null ? createUtcDate(yearFilter, 11, 31) : null;
    const yearStartIso = yearStartDate ? formatDate(yearStartDate) : null;
    const yearEndIso = yearEndDate ? formatDate(yearEndDate) : null;

    // Calculate relevant periods
    const relevantPeriods = [];
    employees.forEach(employee => {
        if (!employee.vacationPeriods) return;
        const employeeName = employee.fullName || employee.name || "Unknown";
        employee.vacationPeriods.forEach(period => {
            if (yearFilter !== null && !periodIntersectsYear(period, yearFilter)) {
                return;
            }
            const startIso = period.start_date;
            const endIso = period.end_date;
            // Clip to year if filtering by year
            let displayStartIso = startIso;
            let displayEndIso = endIso;
            if (yearFilter !== null) {
                if (displayStartIso < yearStartIso) displayStartIso = yearStartIso;
                if (displayEndIso > yearEndIso) displayEndIso = yearEndIso;
            }

            let periodStatus = "Заплановано";
            if (endIso < todayIso) {
                if (!includePast) {
                    return;
                }
                periodStatus = PAST_STATUS_LABEL;
            } else if (startIso <= todayIso && endIso >= todayIso) {
                periodStatus = "У відпустці";
            }
            if (statusFilter && periodStatus !== statusFilter) {
                return;
            }
            relevantPeriods.push({
                employeeId: employee.id,
                employeeName,
                start_date: displayStartIso,
                end_date: displayEndIso,
                status: periodStatus,
                tooltipRange: formatRange(startIso, endIso)
            });
        });
    });

    // VISUAL DEBUG
    const debugInfo = document.createElement('div');
    debugInfo.style.background = '#ffebee';
    debugInfo.style.color = '#c62828';
    debugInfo.style.padding = '10px';
    debugInfo.style.marginBottom = '10px';
    debugInfo.style.border = '1px solid #ef9a9a';
    debugInfo.innerHTML = `
        <strong>DEBUG INFO:</strong><br>
        Employees: ${employees ? employees.length : 0}<br>
        First Employee: ${employees && employees[0] ? employees[0].fullName : 'N/A'}<br>
        Vacations (1st Emp): ${employees && employees[0] && employees[0].vacationPeriods ? employees[0].vacationPeriods.length : 'undefined'}<br>
        Relevant Periods (calc): ${typeof relevantPeriods !== 'undefined' ? relevantPeriods.length : 'N/A'}
    `;
    elements.calendar.appendChild(debugInfo);

    const candidateIso = relevantPeriods
        .map(period => (period.status === "У відпустці" && period.start_date <= todayIso ? todayIso : period.start_date))
        .sort()[0];
    const defaultYearBase = yearStartIso || fallbackIso;
    const baseDateIso = yearFilter !== null ? defaultYearBase : candidateIso || fallbackIso;
    if (appState.calendarBaseDateIso !== baseDateIso) {
        appState.calendarBaseDateIso = baseDateIso;
        appState.calendarMonthOffset = 0;
    }

    const defaultNavigationSpan = 12;
    const minOffset = yearFilter !== null ? 0 : -defaultNavigationSpan;
    const maxOffset = yearFilter !== null ? 11 : defaultNavigationSpan;
    let offset = appState.calendarMonthOffset || 0;
    if (offset < minOffset || offset > maxOffset) {
        offset = Math.min(Math.max(offset, minOffset), maxOffset);
        appState.calendarMonthOffset = offset;
    }

    const anchorDate = parseIsoDateToUtc(appState.calendarBaseDateIso) || parseIsoDateToUtc(todayIso) || new Date();
    const targetMonthDate = addMonthsUtc(anchorDate, offset);
    const monthStart = startOfMonthUtc(targetMonthDate);
    const gridStart = startOfWeekMondayUtc(monthStart);

    const calendarGrid = createElement("div", "calendar-grid");
    const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
    weekDays.forEach(label => {
        const headerCell = createElement("div", "calendar-day calendar-day--header", label);
        calendarGrid.appendChild(headerCell);
    });

    const cellCount = 42;
    let cursor = gridStart;
    const summary = {
        current: new Set(),
        planned: new Set(),
        past: new Set()
    };

    for (let i = 0; i < cellCount; i += 1) {
        const dayIso = formatDate(cursor);
        const inCurrentMonth = cursor.getUTCMonth() === monthStart.getUTCMonth();
        const day = createElement("div", "calendar-day");
        if (!inCurrentMonth) {
            day.classList.add("calendar-day--other-month");
            const currentEntries = [];
            const plannedEntries = [];
            const pastEntries = [];
            dayStatuses.forEach(period => {
                if (period.status === "У відпустці") {
                    currentEntries.push(period);
                    summary.current.add(period.employeeId);
                } else if (period.status === "Заплановано") {
                    plannedEntries.push(period);
                    summary.planned.add(period.employeeId);
                } else if (period.status === PAST_STATUS_LABEL) {
                    pastEntries.push(period);
                    summary.past.add(period.employeeId);
                }
            });

            if (currentEntries.length > 0) {
                const badge = createElement(
                    "div",
                    "calendar-day-badge calendar-day-badge--current",
                    String(currentEntries.length)
                );
                badge.title = currentEntries
                    .map(entry => `${entry.employeeName} — ${entry.tooltipRange}`)
                    .join("\n");
                badgeContainer.appendChild(badge);
            }
            if (plannedEntries.length > 0) {
                const badge = createElement(
                    "div",
                    "calendar-day-badge calendar-day-badge--planned",
                    String(plannedEntries.length)
                );
                badge.title = plannedEntries
                    .map(entry => `${entry.employeeName} — ${entry.tooltipRange}`)
                    .join("\n");
                badgeContainer.appendChild(badge);
            }
            if (pastEntries.length > 0) {
                const badge = createElement(
                    "div",
                    "calendar-day-badge calendar-day-badge--past",
                    String(pastEntries.length)
                );
                badge.title = pastEntries
                    .map(entry => `${entry.employeeName} — ${entry.tooltipRange}`)
                    .join("\n");
                badgeContainer.appendChild(badge);
            }
            day.appendChild(badgeContainer);
        }

        calendarGrid.appendChild(day);
        cursor = addDaysUtc(cursor, 1);
    }

    const prevBtn = createElement("button", "btn btn--secondary btn--icon calendar-nav-btn");
    prevBtn.type = "button";
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = offset <= minOffset;
    const scheduleRerender = () => renderCalendar(employees, options);
    prevBtn.addEventListener("click", () => {
        appState.calendarMonthOffset = Math.max(offset - 1, minOffset);
        scheduleRerender();
    });

    const nextBtn = createElement("button", "btn btn--secondary btn--icon calendar-nav-btn");
    nextBtn.type = "button";
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = offset >= maxOffset;
    nextBtn.addEventListener("click", () => {
        appState.calendarMonthOffset = Math.min(offset + 1, maxOffset);
        scheduleRerender();
    });

    const resetBtn = createElement("button", "btn btn--secondary calendar-nav-btn calendar-nav-btn--reset", "Сьогодні");
    resetBtn.type = "button";
    resetBtn.disabled = offset === 0;
    resetBtn.addEventListener("click", () => {
        appState.calendarMonthOffset = 0;
        scheduleRerender();
    });

    const monthLabel = createElement("span", "calendar-month-label", formatMonthLabel(monthStart));
    monthLabel.style.textTransform = "capitalize";

    elements.calendarControls.appendChild(prevBtn);
    elements.calendarControls.appendChild(monthLabel);
    elements.calendarControls.appendChild(nextBtn);
    elements.calendarControls.appendChild(resetBtn);

    elements.calendar.appendChild(calendarGrid);

    if (relevantPeriods.length === 0) {
        const emptyHint = yearFilter !== null
            ? "Відпустків не знайдено."
            : "За вибраними фільтрами немає запланованих або активних відпусток.";
        elements.calendar.appendChild(createElement("div", "calendar-empty-hint", emptyHint));
    }

    const legendConfig = [
        {
            status: "У відпустці",
            label: `У відпустці${summary.current.size ? ` — ${summary.current.size}` : ""}`,
            className: "legend-color legend-color--current"
        },
        {
            status: "Заплановано",
            label: `Заплановано${summary.planned.size ? ` — ${summary.planned.size}` : ""}`,
            className: "legend-color legend-color--planned"
        }
    ];
    if (includePast) {
        legendConfig.push({
            status: PAST_STATUS_LABEL,
            label: `${PAST_STATUS_LABEL}${summary.past.size ? ` — ${summary.past.size}` : ""}`,
            className: "legend-color legend-color--past"
        });
    }

    legendConfig
        .filter(item => !statusFilter || statusFilter === item.status)
        .forEach(item => {
            const legendItem = createElement("div", "legend-item");
            const colorSwatch = createElement("span", item.className);
            const label = createElement("span", "", item.label);
            legendItem.appendChild(colorSwatch);
            legendItem.appendChild(label);
            elements.calendarLegend.appendChild(legendItem);
        });

    if (elements.calendarLegend.children.length === 0) {
        const legendItem = createElement("div", "legend-item");
        legendItem.appendChild(createElement("span", "legend-color legend-color--empty"));
        legendItem.appendChild(createElement("span", "", "Немає відпусток для відображення."));
        elements.calendarLegend.appendChild(legendItem);
    }
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
