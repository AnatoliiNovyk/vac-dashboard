(function () {
	"use strict";

	const ALLOWED_VACATION_STATUS_MAP = new Map([
		["у відпустці", "У відпустці"],
		["заплановано", "Заплановано"],
		["на роботі", "На роботі"],
	]);

	const FIELD_ALIASES = Object.freeze({
		taxId: ["ІПН", "ipn", "TaxId", "tax_id"],
		lastName: ["Прізвище", "Прізвище_укр", "Прізвище_ua", "lastname"],
		firstName: ["Ім'я", "Имя", "first_name", "firstname"],
		middleName: ["По_батькові", "ПоБатькові", "По_отчеству", "middle_name"],
		department: ["Підрозділ", "Відділ", "Department", "department_name"],
		position: ["Посада", "Position", "title"],
		managerTaxId: ["Менеджер_ІПН", "ManagerIPN", "ManagerTaxId"],
		allocatedDays: ["Нараховано_днів", "AllocatedDays", "TotalAllocatedDays"],
		balanceDays: ["Залишок_днів", "BalanceDays", "days_left"],
		vacationStart: ["Початок_відпустки", "Дата_початку", "StartDate"],
		vacationEnd: ["Кінець_відпустки", "Дата_кінця", "EndDate"],
		vacationType: ["Тип_відпустки", "VacationType", "LeaveType"],
		vacationStatus: ["Статус", "VacationStatus", "Status"],
		vacationDays: ["Днів", "Days", "Duration"],
		employeeExternalId: ["ExternalId", "EmployeeExternalId"],
	});

	const SUPPORTED_INPUT_FORMATS = Object.freeze([
		"text/csv",
		"application/csv",
		"application/json",
		"text/json",
		"application/xml",
		"text/xml",
		"application/vnd.ms-excel",
		"text/plain",
	]);

	const SUPPORTED_EXTENSIONS = Object.freeze([".csv", ".json", ".xml"]);

	const state = {
		lastImportSummary: null,
		lastImportPayload: null,
		lastExportSummary: null,
	};

	function normalizeWhitespace(value) {
		if (value === undefined || value === null) {
			return "";
		}
		return String(value).replace(/\s+/g, " ").trim();
	}

	function parseNumber(value) {
		const normalized = normalizeWhitespace(value);
		if (!normalized) {
			return null;
		}
		const sanitized = normalized.replace(",", ".");
		const numeric = Number(sanitized);
		return Number.isFinite(numeric) ? numeric : null;
	}

	function parseInteger(value) {
		const numberValue = parseNumber(value);
		if (numberValue === null) {
			return null;
		}
		return Number.isFinite(numberValue) ? Math.round(numberValue) : null;
	}

	function toIsoDate(value) {
		const normalized = normalizeWhitespace(value);
		if (!normalized) {
			return null;
		}
		if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
			return normalized;
		}
		if (/^\d{2}\.\d{2}\.\d{4}$/.test(normalized)) {
			const [day, month, year] = normalized.split(".");
			return `${year}-${month}-${day}`;
		}
		const parsed = new Date(normalized);
		if (Number.isNaN(parsed.getTime())) {
			return null;
		}
		return parsed.toISOString().split("T")[0];
	}

	function pickField(raw, keys) {
		if (!raw || !keys) {
			return "";
		}
		for (const key of keys) {
			if (Object.prototype.hasOwnProperty.call(raw, key)) {
				const value = normalizeWhitespace(raw[key]);
				if (value) {
					return value;
				}
			}
			const lowerKey = typeof key === "string" ? key.toLowerCase() : key;
			if (Object.prototype.hasOwnProperty.call(raw, lowerKey)) {
				const value = normalizeWhitespace(raw[lowerKey]);
				if (value) {
					return value;
				}
			}
		}
		return "";
	}

	function buildCanonicalRow(raw) {
		const canonical = {};
		for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
			canonical[key] = pickField(raw, aliases);
		}
		return canonical;
	}

	function readFileAsText(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onerror = () => reject(new Error("Не вдалося прочитати файл."));
			reader.onabort = () => reject(new Error("Читання файлу перервано."));
			reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
			reader.readAsText(file, "utf-8");
		});
	}

	function detectFormat(file, text) {
		const mime = normalizeWhitespace(file?.type).toLowerCase();
		const name = normalizeWhitespace(file?.name).toLowerCase();
		const extension = SUPPORTED_EXTENSIONS.find((ext) => name.endsWith(ext)) || "";

		if (mime.includes("json") || extension === ".json") {
			return "json";
		}
		if (mime.includes("xml") || extension === ".xml") {
			return "xml";
		}
		if (mime.includes("csv") || extension === ".csv") {
			return "csv";
		}

		const trimmed = text.trim();
		if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
			return "json";
		}
		if (trimmed.startsWith("<")) {
			return "xml";
		}
		return "csv";
	}

	function parseCsv(text) {
		const papa = window?.Papa;
		if (papa && typeof papa.parse === "function") {
			const result = papa.parse(text, {
				header: true,
				skipEmptyLines: true,
				dynamicTyping: false,
				trimHeaders: true,
			});
			if (result.errors && result.errors.length > 0) {
				const firstError = result.errors[0];
				throw new Error(`Помилка CSV (рядок ${firstError.row + 1 || 0}): ${firstError.message}`);
			}
			return Array.isArray(result.data) ? result.data : [];
		}

		const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
		if (lines.length === 0) {
			return [];
		}
		const headerLine = lines.shift();
		const headers = headerLine.split(",").map((header) => header.trim());
		const records = [];
		for (const line of lines) {
			const cells = line.split(",");
			const record = {};
			headers.forEach((header, index) => {
				record[header] = cells[index] !== undefined ? cells[index].trim() : "";
			});
			records.push(record);
		}
		return records;
	}

	function parseJson(text) {
		const parsed = JSON.parse(text);
		if (Array.isArray(parsed)) {
			return parsed;
		}
		if (parsed && typeof parsed === "object") {
			if (Array.isArray(parsed.records)) {
				return parsed.records;
			}
			if (Array.isArray(parsed.data)) {
				return parsed.data;
			}
		}
		throw new Error("JSON-файл повинен містити масив записів або поле records/data.");
	}

	function parseXml(text) {
		const parser = new DOMParser();
		const document = parser.parseFromString(text, "application/xml");
		const errorNode = document.querySelector("parsererror");
		if (errorNode) {
			throw new Error("Не вдалося розібрати XML-файл.");
		}
		const candidateNodes = Array.from(document.querySelectorAll("Record, Row, Entry, Item"));
		const records = candidateNodes.length > 0 ? candidateNodes : Array.from(document.documentElement.children);
		return records.map((node) => {
			const record = {};
			Array.from(node.children).forEach((child) => {
				record[child.nodeName] = child.textContent;
			});
			return record;
		});
	}

	function normalizeStatus(status) {
		const normalized = normalizeWhitespace(status).toLowerCase();
		if (!normalized) {
			return "";
		}
		return ALLOWED_VACATION_STATUS_MAP.get(normalized) || "";
	}

	function normalizeEmployee(canonical, rowIndex, accumulator) {
		const errors = [];
		const warnings = [];
		const taxId = canonical.taxId;
		if (!taxId) {
			errors.push({ row: rowIndex, message: "Відсутній ІПН співробітника." });
			return { errors, warnings };
		}

		const lastName = canonical.lastName;
		const firstName = canonical.firstName;
		const middleName = canonical.middleName;

		if (!lastName || !firstName) {
			errors.push({ row: rowIndex, message: "Відсутні ПІБ співробітника." });
			return { errors, warnings };
		}

		const fullName = [lastName, firstName, middleName].filter(Boolean).join(" ");
		const department = canonical.department;
		const position = canonical.position;

		if (!department) {
			errors.push({ row: rowIndex, message: "Не вказано підрозділ співробітника." });
		}
		if (!position) {
			errors.push({ row: rowIndex, message: "Не вказано посаду співробітника." });
		}

		const totalAllocatedDays = parseNumber(canonical.allocatedDays);
		const balanceDays = parseNumber(canonical.balanceDays);
		const managerTaxId = canonical.managerTaxId || "";
		const externalId = canonical.employeeExternalId || taxId;

		if (errors.length > 0) {
			return { errors, warnings };
		}

		const existing = accumulator.employeeMap.get(taxId);
		if (existing) {
			accumulator.employeeDuplicates.push({ row: rowIndex, taxId });
			return { errors, warnings };
		}

		const employee = {
			externalId,
			taxId,
			lastName,
			firstName,
			middleName: middleName || "",
			fullName,
			department,
			position,
			managerTaxId: managerTaxId || "",
			allocation: {
				totalAllocatedDays: totalAllocatedDays !== null ? totalAllocatedDays : null,
				balanceDays: balanceDays !== null ? balanceDays : null,
			},
		};

		accumulator.employeeMap.set(taxId, employee);
		accumulator.employees.push(employee);
		return { errors, warnings };
	}

	function normalizeVacation(canonical, rowIndex, accumulator) {
		const errors = [];
		const warnings = [];
		const taxId = canonical.taxId;
		const hasVacationData = Boolean(
			canonical.vacationStart ||
			canonical.vacationEnd ||
			canonical.vacationType ||
			canonical.vacationStatus ||
			canonical.vacationDays
		);
		if (!hasVacationData) {
			return { errors, warnings };
		}

		if (!taxId) {
			errors.push({ row: rowIndex, message: "Не вказано ІПН для запису відпустки." });
			return { errors, warnings };
		}

		const startDate = toIsoDate(canonical.vacationStart);
		const endDate = toIsoDate(canonical.vacationEnd);

		if (!startDate || !endDate) {
			errors.push({ row: rowIndex, message: "Початок або кінець відпустки некоректний." });
			return { errors, warnings };
		}

		if (startDate > endDate) {
			errors.push({ row: rowIndex, message: "Дата початку відпустки пізніше дати завершення." });
			return { errors, warnings };
		}

		const normalizedStatus = normalizeStatus(canonical.vacationStatus);
		if (!normalizedStatus) {
			errors.push({ row: rowIndex, message: "Статус відпустки відсутній або не підтримується." });
			return { errors, warnings };
		}

		const vacationType = canonical.vacationType || "";
		const durationDays = parseInteger(canonical.vacationDays);

		const dedupeKey = `${taxId}|${startDate}|${endDate}|${vacationType.toLowerCase()}`;
		if (accumulator.vacationKeys.has(dedupeKey)) {
			accumulator.vacationDuplicates.push({ row: rowIndex, taxId, startDate, endDate, vacationType });
			return { errors, warnings };
		}

		accumulator.vacationKeys.add(dedupeKey);
		const vacation = {
			employeeTaxId: taxId,
			startDate,
			endDate,
			type: vacationType,
			status: normalizedStatus,
			durationDays: durationDays !== null ? durationDays : null,
		};
		accumulator.vacations.push(vacation);
		return { errors, warnings };
	}

	function normalizeRecords(rawRecords) {
		const accumulator = {
			employees: [],
			vacations: [],
			employeeMap: new Map(),
			vacationKeys: new Set(),
			employeeDuplicates: [],
			vacationDuplicates: [],
			errors: [],
			warnings: [],
		};

		rawRecords.forEach((raw, index) => {
			const rowIndex = index + 1;
			const canonical = buildCanonicalRow(raw);
			const employeeOutcome = normalizeEmployee(canonical, rowIndex, accumulator);
			const vacationOutcome = normalizeVacation(canonical, rowIndex, accumulator);

			accumulator.errors.push(...employeeOutcome.errors, ...vacationOutcome.errors);
			accumulator.warnings.push(...employeeOutcome.warnings, ...vacationOutcome.warnings);
		});

		const errorRows = new Set(accumulator.errors.map((entry) => entry.row));
		return {
			employees: accumulator.employees,
			vacations: accumulator.vacations,
			employeeDuplicates: accumulator.employeeDuplicates,
			vacationDuplicates: accumulator.vacationDuplicates,
			errors: accumulator.errors,
			warnings: accumulator.warnings,
			totalRows: rawRecords.length,
			invalidRowCount: errorRows.size,
		};
	}

	function truncateList(list, limit = 20) {
		if (!Array.isArray(list)) {
			return [];
		}
		return list.slice(0, limit);
	}

	function safeClone(value) {
		try {
			return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
		} catch (error) {
			console.warn("basIntegration: не вдалося клонувати об'єкт", error);
			return value;
		}
	}

	async function importFromBAS(file, context = {}) {
		if (!file) {
			throw new Error("BAS import requires a file input");
		}

		const summary = {
			fileName: file.name,
			fileSize: file.size || null,
			status: "pending",
			startedAt: Date.now(),
			format: null,
			metrics: {
				totalRows: 0,
				processedRows: 0,
				employeeCount: 0,
				employeeDuplicates: 0,
				vacationCount: 0,
				vacationDuplicates: 0,
				invalidRowCount: 0,
				warningCount: 0,
			},
			context: {
				userId: context?.currentUser?.id || null,
			},
			errorsSample: [],
			warningsSample: [],
			duplicatesSample: [],
		};

		try {
			const fileContent = await readFileAsText(file);
			const format = detectFormat(file, fileContent);
			summary.format = format;
			let rawRecords;
			switch (format) {
				case "json":
					rawRecords = parseJson(fileContent);
					break;
				case "xml":
					rawRecords = parseXml(fileContent);
					break;
				case "csv":
				default:
					rawRecords = parseCsv(fileContent);
					break;
			}

			if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
				throw new Error("Файл не містить записів для імпорту.");
			}

			const normalized = normalizeRecords(rawRecords);
			const hasErrors = normalized.errors.length > 0;
			const hasWarnings =
				normalized.warnings.length > 0 ||
				normalized.employeeDuplicates.length > 0 ||
				normalized.vacationDuplicates.length > 0;

			summary.metrics.totalRows = normalized.totalRows;
			summary.metrics.processedRows = normalized.totalRows - normalized.invalidRowCount;
			summary.metrics.employeeCount = normalized.employees.length;
			summary.metrics.employeeDuplicates = normalized.employeeDuplicates.length;
			summary.metrics.vacationCount = normalized.vacations.length;
			summary.metrics.vacationDuplicates = normalized.vacationDuplicates.length;
			summary.metrics.invalidRowCount = normalized.invalidRowCount;
			summary.metrics.warningCount = normalized.warnings.length;

			summary.errorsSample = truncateList(normalized.errors, 10);
			summary.warningsSample = truncateList(normalized.warnings, 10);
			summary.duplicatesSample = truncateList(
				[...normalized.employeeDuplicates, ...normalized.vacationDuplicates],
				10
			);

			summary.status = hasErrors ? "parsed_with_errors" : hasWarnings ? "parsed_with_warnings" : "parsed";
			summary.completedAt = Date.now();

			state.lastImportPayload = {
				format,
				employees: normalized.employees,
				vacations: normalized.vacations,
				errors: normalized.errors,
				warnings: normalized.warnings,
				duplicates: {
					employees: normalized.employeeDuplicates,
					vacations: normalized.vacationDuplicates,
				},
			};
			state.lastImportSummary = safeClone(summary);

			return safeClone(summary);
		} catch (error) {
			const message = typeof error?.message === "string" ? error.message : "Невідома помилка імпорту.";
			summary.status = "failed";
			summary.error = message;
			summary.completedAt = Date.now();
			state.lastImportPayload = null;
			state.lastImportSummary = safeClone(summary);
			throw new Error(message);
		}
	}

	async function exportToBAS(dateRange, filters = {}, options = {}) {
		void filters;
		void options;
		if (!dateRange || !dateRange.start || !dateRange.end) {
			throw new Error("BAS export requires a start and end date");
		}

		state.lastExportSummary = {
			dateRange,
			status: "pending",
			timestamp: Date.now(),
		};

		throw new Error("exportToBAS is not yet implemented");
	}

	function getStateSnapshot() {
		return {
			lastImportSummary: safeClone(state.lastImportSummary),
			lastImportPayload: safeClone(state.lastImportPayload),
			lastExportSummary: safeClone(state.lastExportSummary),
		};
	}

	window.basIntegration = Object.freeze({
		SUPPORTED_INPUT_FORMATS,
		importFromBAS,
		exportToBAS,
		getStateSnapshot,
	});
})();
