# 1C External Data Processor for Vacation Dashboard
## "Экспорт данных для Vacation Dashboard"

This external data processor (.epf) allows you to export employee data from BAS / 1C:Enterprise (ZUP 3.0 configuration) into a CSV format compatible with the Vacation Dashboard.

### Features
*   **Exports Employee Data**: Tax ID, Name, Department, Position.
*   **Manager Hierarchy**: Automatically links employees to their managers based on "Прием на работу" and "Кадровый перевод" documents.
*   **Vacation Balances**: Calculates remaining vacation days:
    *   *Entitlement*: Defaults to 24 days (standard).
    *   *Usage*: Queries `AccumulationRegister.ФактическиеОтпуска` to deduct used days.
    *   *Balance*: 24 - Used Days.
    *   *Fallback*: If the register is missing, defaults to 24 days.
*   **Role assignment**: Automatically flags HRs and Managers based on department/position names.

### Installation & Usage

1.  **Open 1C:Enterprise** in user mode.
2.  Go to **File** -> **Open** (Файл -> Открыть).
3.  Select the `ЕкспортДляVacationDashboard.epf` file (compiled from the source) or the source folder if you are using the raw files loader.
    *   *Note: Since you have the source code (`.bsl`/`.xml`), you typically need to open this in the **Configurator** first to save it as an `.epf` file: File -> New -> External Data Processor -> Paste logic -> Save as .epf*.
    *   *Alternatively, if you have the `.epf` provided directly, just open it.*
4.  **Processor Interface**:
    *   **Организация (Organization)**: Select the organization to export.
    *   **Дата выгрузки (Export Date)**: Select the date (usually current date).
5.  Click **"Выполнить экспорт" (Execute Export)**.
6.  Choose a destination to save the `.csv` file (e.g., `employees_export_2024-05-20.csv`).
7.  **Upload** the resulting CSV file to the Vacation Dashboard interface.

### Troubleshooting
*   **"Поле объекта не обнаружено (КодПоДРФО)"**: Ensure you are running on a configuration that supports Ukrainian Tax IDs (BAS ZUP). The code checks `ФизическоеЛицо.КодПоДРФО`.
*   **Vacation Balance showing 24**: If checking `ФактическиеОтпуска` fails or is empty, the system defaults to 24. Check the "User Log" (Лог) on the form for specific warnings.

### Developer Notes
*   Source logic location: `ЭкспортДляVacationDashboard_МодульОбъекта.bsl`
*   Main Logic: `ПолучитьДанныеСотрудников` iterates employees, calls `ПолучитьОстаткиОтпусков` for balances and `ПолучитьРуководителейСотрудников` for hierarchy.
