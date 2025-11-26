/**
 * Validation and Normalization Utilities
 */

/**
 * Normalize text by removing diacritics and converting to lowercase
 * @param {string} value - Text to normalize
 * @returns {string} Normalized text
 */
export function normalizeText(value) {
    return String(value || "").toLowerCase().trim();
}

/**
 * Normalize status key for comparison
 * @param {string} value - Status value
 * @returns {string} Normalized status
 */
export function normalizeStatusKey(value) {
    return normalizeText(value);
}

/**
 * Validate vacation period dates
 * @param {string} start - Start date (YYYY-MM-DD)
 * @param {string} end - End date (YYYY-MM-DD)
 * @returns {{valid: boolean, error?: string}}
 */
export function validatePeriodDates(start, end) {
    if (!start || !end) {
        return { valid: false, error: "Дати не вказані" };
    }

    const startDate = new Date(start + "T00:00:00Z");
    const endDate = new Date(end + "T00:00:00Z");

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return { valid: false, error: "Невалідні дати" };
    }

    if (startDate > endDate) {
        return { valid: false, error: "Дата початку не може бути пізніше дати закінчення" };
    }

    return { valid: true };
}

/**
 * Check if two date ranges overlap
 * @param {string} start1 - Start of first range
 * @param {string} end1 - End of first range
 * @param {string} start2 - Start of second range
 * @param {string} end2 - End of second range
 * @returns {boolean}
 */
export function periodsOverlap(start1, end1, start2, end2) {
    const s1 = new Date(start1 + "T00:00:00Z");
    const e1 = new Date(end1 + "T00:00:00Z");
    const s2 = new Date(start2 + "T00:00:00Z");
    const e2 = new Date(end2 + "T00:00:00Z");

    if (isNaN(s1.getTime()) || isNaN(e1.getTime()) || isNaN(s2.getTime()) || isNaN(e2.getTime())) {
        return false;
    }

    return s1 <= e2 && s2 <= e1;
}

/**
 * Validate employee data
 * @param {Object} employee - Employee object
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateEmployee(employee) {
    const errors = [];

    if (!employee) {
        return { valid: false, errors: ["Дані співробітника відсутні"] };
    }

    if (!employee.tax_id && !employee.id) {
        errors.push("ІПН відсутній");
    }

    if (!employee.name && !employee.full_name) {
        errors.push("Ім'я відсутнє");
    }

    if (!employee.department && !employee.department_id) {
        errors.push("Департамент відсутній");
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Sanitize string input
 * @param {*} value - Value to sanitize
 * @returns {string}
 */
export function sanitizeString(value) {
    if (value === null || value === undefined) {
        return "";
    }
    return String(value).trim();
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
export function isValidEmail(email) {
    if (!email || typeof email !== "string") {
        return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate Tax ID format (Ukrainian IPN)
 * @param {string} taxId - Tax ID to validate
 * @returns {boolean}
 */
export function isValidTaxId(taxId) {
    if (!taxId || typeof taxId !== "string") {
        return false;
    }
    // Ukrainian IPN is 10 digits
    return /^\d{10}$/.test(taxId.trim());
}
