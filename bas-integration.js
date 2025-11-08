(function () {
	"use strict";

	/**
	 * basIntegration exposes import/export helpers for BAS Accounting/Payroll.
	 * Functions are stubs for now and will be expanded in follow-up steps.
	 */
	const state = {
		lastImportSummary: null,
		lastExportSummary: null,
	};

	const SUPPORTED_INPUT_FORMATS = Object.freeze([
		"text/csv",
		"application/json",
		"application/xml",
		"text/xml",
	]);

	async function importFromBAS(file, options = {}) {
		void options;
		if (!file) {
			throw new Error("BAS import requires a file input");
		}

		state.lastImportSummary = {
			fileName: file.name,
			status: "pending",
			timestamp: Date.now(),
		};

		throw new Error("importFromBAS is not yet implemented");
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
			lastImportSummary: state.lastImportSummary,
			lastExportSummary: state.lastExportSummary,
		};
	}

	window.basIntegration = Object.freeze({
		SUPPORTED_INPUT_FORMATS,
		importFromBAS,
		exportToBAS,
		getStateSnapshot,
	});
})();
