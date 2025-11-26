/**
 * BAS Integration Module
 * Handles BAS import/export functionality
 */

import { basSyncState, FEATURE_FLAGS } from '../core/config.js';
import { toggleHidden, createElement, clearNode } from '../utils/dom.js';

let elements = {};
let functions = null;

/**
 * Initialize BAS module
 * @param {Object} deps - Dependencies (functions, elements)
 */
export function initBAS(deps) {
    functions = deps.functions;
    elements = deps.elements;

    // Set up event listeners
    if (elements.basImportBtn) {
        elements.basImportBtn.addEventListener('click', handleBasImportClick);
    }

    if (elements.basExportBtn) {
        elements.basExportBtn.addEventListener('click', handleBasExportClick);
    }

    if (elements.basImportFileInput) {
        elements.basImportFileInput.addEventListener('change', handleBasImportFileSelected);
    }

    console.log('[bas] BAS module initialized');
}

/**
 * Handle BAS import button click
 */
function handleBasImportClick(event) {
    if (event) {
        event.preventDefault();
    }

    const input = elements.basImportFileInput;
    if (!input) {
        appendBasLog("error", "Не вдалося ініціалізувати вибір файлу для імпорту BAS.");
        return;
    }

    input.value = "";
    input.click();
}

/**
 * Handle BAS import file selected
 * @param {Event} event - File input change event
 */
async function handleBasImportFileSelected(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;

    const fileName = file.name;
    appendBasLog("info", `Розпочато імпорт файлу "${fileName}".`);
    showBasImportProgress(5, `Обробка файлу "${fileName}"…`);

    try {
        // Call BAS integration module (external)
        const integration = window.basIntegration;
        if (!integration) {
            throw new Error("BAS integration module not loaded");
        }

        const summary = await integration.importFromBAS(file, {
            db: window.db,
            auth: window.auth
        });

        logBasImportSummary(summary, fileName);

        if (summary?.blocked) {
            return;
        }

        showBasImportProgress(50, "Передача даних до Firebase…");
        const backendResult = await integration.commitLastImportToFirebase({ summary });
        showBasImportProgress(100, "Синхронізацію Firebase завершено.");
        logBasCommitResult(backendResult);
    } catch (error) {
        console.error("BAS import error:", error);
        appendBasLog("error", error.message || "Помилка імпорту");
        hideBasImportProgress();
    }
}

/**
 * Handle BAS export button click
 */
function handleBasExportClick(event) {
    if (event) {
        event.preventDefault();
    }

    // Open export modal (would be implemented)
    console.log('[bas] Export clicked');
    if (window.openBasExportModal) {
        window.openBasExportModal();
    }
}

/**
 * Show import progress
 * @param {number} percent - Progress percentage
 * @param {string} message - Progress message
 */
export function showBasImportProgress(percent, message) {
    if (!elements.basImportProgress) return;

    toggleHidden(elements.basImportProgress, false);

    if (elements.basImportProgressBar) {
        elements.basImportProgressBar.style.width = `${percent}%`;
        elements.basImportProgressBar.setAttribute("aria-valuenow", String(percent));
    }

    if (elements.basImportProgressLabel) {
        elements.basImportProgressLabel.textContent = message;
    }
}

/**
 * Hide import progress
 */
export function hideBasImportProgress() {
    if (!elements.basImportProgress) return;

    toggleHidden(elements.basImportProgress, true);

    if (elements.basImportProgressBar) {
        elements.basImportProgressBar.style.width = "0%";
    }

    if (elements.basImportProgressLabel) {
        elements.basImportProgressLabel.textContent = "Готово до імпорту";
    }
}

/**
 * Append log message
 * @param {string} type - Log type (info, success, error, warning)
 * @param {string} message - Log message
 */
export function appendBasLog(type, message) {
    if (!elements.basSyncLog || !message) {
        return;
    }

    const entry = {
        type: typeof type === "string" ? type : "info",
        message: message.trim(),
        timestamp: new Date()
    };

    basSyncState.messages.push(entry);
    if (basSyncState.messages.length > 100) {
        basSyncState.messages.shift();
    }

    const iconMap = {
        info: "fas fa-info-circle",
        success: "fas fa-check-circle",
        error: "fas fa-times-circle",
        warning: "fas fa-exclamation-triangle"
    };

    const row = createElement("div", `bas-actions__log-row bas-actions__log-row--${entry.type}`);
    const iconWrapper = createElement("div", "bas-actions__log-icon");
    iconWrapper.innerHTML = `<i class="${iconMap[entry.type] || iconMap.info}"></i>`;

    const messageWrapper = createElement("div", "bas-actions__log-message");
    messageWrapper.textContent = entry.message;

    const timestamp = formatBasLogTimestamp(entry.timestamp);
    const timestampNode = createElement("span", "bas-actions__log-timestamp", timestamp);
    messageWrapper.appendChild(timestampNode);

    row.appendChild(iconWrapper);
    row.appendChild(messageWrapper);
    elements.basSyncLog.appendChild(row);
    elements.basSyncLog.scrollTop = elements.basSyncLog.scrollHeight;
    toggleHidden(elements.basSyncLog, false);
}

/**
 * Clear BAS log
 */
export function clearBasLog() {
    basSyncState.messages = [];
    if (!elements.basSyncLog) {
        return;
    }
    clearNode(elements.basSyncLog);
    toggleHidden(elements.basSyncLog, true);
}

/**
 * Format log timestamp
 * @param {Date} date - Date to format
 * @returns {string}
 */
function formatBasLogTimestamp(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return "";
    }
    return date.toLocaleString("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

/**
 * Log import summary
 * @param {Object} summary - Import summary
 * @param {string} fileName - File name
 */
function logBasImportSummary(summary, fileName) {
    if (!summary) return;

    const metrics = summary.metrics || {};
    const employeeCount = metrics.employeeCount || 0;
    const vacationCount = metrics.vacationCount || 0;

    appendBasLog("info", `Файл: ${fileName}`);
    appendBasLog("success", `Знайдено: ${employeeCount} співробітників, ${vacationCount} відпусток`);
}

/**
 * Log commit result
 * @param {Object} result - Commit result
 */
function logBasCommitResult(result) {
    if (!result) return;

    const employeesWritten = result.employeesWritten || 0;
    const vacationsWritten = result.vacationsWritten || 0;

    if (employeesWritten > 0) {
        appendBasLog("success", `Оновлено ${employeesWritten} записів співробітників.`);
    }
    if (vacationsWritten > 0) {
        appendBasLog("success", `Оновлено ${vacationsWritten} записів відпусток.`);
    }
}
