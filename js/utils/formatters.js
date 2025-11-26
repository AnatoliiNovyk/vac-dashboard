/**
 * Date and String Formatting Utilities
 */

/**
 * Format a Date object as YYYY-MM-DD
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return "";
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Format a date range as "DD.MM.YYYY - DD.MM.YYYY"
 * @param {string} start - Start date (YYYY-MM-DD)
 * @param {string} end - End date (YYYY-MM-DD)
 * @returns {string} Formatted range
 */
export function formatRange(start, end) {
    const formatDMY = (iso) => {
        if (!iso) return "";
        const [y, m, d] = iso.split("-");
        return `${d}.${m}.${y}`;
    };
    return `${formatDMY(start)} - ${formatDMY(end)}`;
}

/**
 * Format a date in human-readable format (DD.MM.YYYY)
 * @param {Date} date - The date to format
 * @returns {string}
 */
export function formatDateHuman(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return "";
    }
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}.${month}.${year}`;
}

/**
 * Format month label (e.g., "Січень 2025")
 * @param {Date} date - The date
 * @returns {string}
 */
export function formatMonthLabel(date) {
    const monthNames = [
        "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
        "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"
    ];
    return `${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/**
 * Compute number of days between two dates
 * @param {string} start - Start date (YYYY-MM-DD)
 * @param {string} end - End date (YYYY-MM-DD)
 * @returns {number} Number of days
 */
export function computeDays(start, end) {
    if (!start || !end) {
        return 0;
    }
    const startDate = new Date(start + "T00:00:00Z");
    const endDate = new Date(end + "T00:00:00Z");
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return 0;
    }
    const diffMs = endDate - startDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(0, diffDays);
}

/**
 * Parse ISO date string to UTC Date
 * @param {string} iso - ISO date string (YYYY-MM-DD)
 * @returns {Date|null}
 */
export function parseIsoDateToUtc(iso) {
    if (!iso || typeof iso !== "string") {
        return null;
    }
    const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) {
        return null;
    }
    const [, year, month, day] = match;
    const date = new Date(Date.UTC(+year, +month - 1, +day));
    return isNaN(date.getTime()) ? null : date;
}

/**
 * Parse Firestore timestamp to Date
 * @param {*} value - Firestore timestamp, ISO string, or epoch number
 * @returns {Date|null}
 */
export function parseTimestampToDate(value) {
    if (!value) {
        return null;
    }

    // Firestore Timestamp
    if (value.toDate && typeof value.toDate === "function") {
        return value.toDate();
    }

    // ISO string
    if (typeof value === "string") {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
    }

    // Epoch milliseconds
    if (typeof value === "number") {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
    }

    return null;
}

/**
 * Create UTC date
 * @param {number} year
 * @param {number} monthIndex - 0-based month index
 * @param {number} day
 * @returns {Date}
 */
export function createUtcDate(year, monthIndex, day) {
    return new Date(Date.UTC(year, monthIndex, day));
}

/**
 * Add months to a UTC date
 * @param {Date} date
 * @param {number} months
 * @returns {Date}
 */
export function addMonthsUtc(date, months) {
    const newDate = new Date(date);
    newDate.setUTCMonth(newDate.getUTCMonth() + months);
    return newDate;
}

/**
 * Add days to a UTC date
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
export function addDaysUtc(date, days) {
    const newDate = new Date(date);
    newDate.setUTCDate(newDate.getUTCDate() + days);
    return newDate;
}

/**
 * Get start of month (UTC)
 * @param {Date} date
 * @returns {Date}
 */
export function startOfMonthUtc(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/**
 * Get start of week (Monday, UTC)
 * @param {Date} date
 * @returns {Date}
 */
export function startOfWeekMondayUtc(date) {
    const day = date.getUTCDay();
    const diff = (day === 0 ? -6 : 1) - day;
    return addDaysUtc(date, diff);
}
