# Copilot Instructions for vac-dashboard

## Project Overview
This is a Firebase-backed vacation dashboard for EGIS-UKRAINA, with a Node.js/Express backend (in `functions/`), a browser-based frontend (in `index.html`, `app.js`, `style.css`), and supporting scripts for data seeding and synchronization.

## Architecture & Data Flow
- **Frontend**: Single-page app in `index.html` using `app.js` for logic and `style.css` for styling. Communicates with Firebase Firestore and Auth.
- **Backend**: Cloud Functions in `functions/index.js` handle server-side logic, authentication, and data manipulation. Backend is deployed via Firebase.
- **Data**: Firestore is the main database. Data models and seed data are in `vacation_dashboard_data.json` and `scripts/seed.js`.
- **Scripts**: Use `scripts/seed.js` for initial data population and `scripts/sync-auth.js` for syncing authentication data.

## Developer Workflows
- **Local Development**: Use `firebase emulators:start` to run Firestore and Functions locally. Edit frontend files directly and refresh browser.
- **Deploy**: Run `firebase deploy` to push changes to Firebase hosting and functions.
- **Seeding Data**: Execute `node scripts/seed.js` to populate Firestore with initial data.
- **Sync Auth**: Run `node scripts/sync-auth.js` to update authentication users.

## Conventions & Patterns
- **Frontend**: All UI logic is in `app.js`. Avoid splitting into multiple JS files unless refactoring for scale.
- **Backend**: All server logic is in `functions/index.js`. Use Firebase Admin SDK for privileged operations.
- **Data Models**: Reference `vacation_dashboard_data.json` for schema and example data.
- **Changelogs**: All major changes are documented in `changelogs/` as dated markdown files. Always update changelogs for significant changes.
- **Auth**: User roles and permissions are managed via Firestore and custom claims in Firebase Auth.

## Integration Points
- **Firebase**: Project uses Firestore, Auth, and Functions. Configurations are in `firebase.json` and `firestore.rules`.
- **External Dependencies**: Managed via `package.json` in both root and `functions/`.

## Examples
- To add a new vacation type, update `vacation_dashboard_data.json` and seed with `scripts/seed.js`.
- To change permissions, update logic in `functions/index.js` and redeploy.
- To debug backend, use Firebase emulator logs and `firestore-debug.log`.

## Key Files & Directories
- `app.js`, `index.html`, `style.css`: Frontend
- `functions/index.js`: Backend logic
- `vacation_dashboard_data.json`: Data model
- `scripts/seed.js`, `scripts/sync-auth.js`: Utility scripts
- `changelogs/`: Change history
- `firebase.json`, `firestore.rules`: Firebase config

---
For questions or missing details, review `changelogs/` and ask for clarification.

Системний промпт: Vacation Dashboard — Firebase Studio only

Місія і заборони

- Розробка виключно у Firebase Studio, бекенд виключно на Firebase (Auth, Firestore або RTDB, Cloud Functions, Storage, Hosting/App Hosting, Emulator Suite). Жодних локальних БД (SQLite/MySQL/Postgres), жодних сторонніх серверів без погодження.
- Будь‑яка спроба винести бекенд у локальну базу, змінити джерело даних або зламати схему доступів — заборонена.
- Кожна зміна — малий атомарний крок з окремим changelog у папці changelogs/.

Ролі, вкладки, права доступу

- Ролі: HR, Manager, Employee; можливе поєднання ролей (HR може бути керівником відділу HR; HR може також мати manager‑вертикаль).
- Вкладки:
    - HR‑керівник HR‑відділу: HR, Manager, My View.
    - Інші HR: HR, My View.
    - Менеджер: Manager, My View.
    - Співробітник: My View.
- HR має право редагувати всі дані будь‑якого співробітника (UI + перевірка на бекенді/Rules/Functions + аудит).
- Відображення вкладок визначається тільки claim/ролями з бекенду (custom claims або user profile doc), без евристик у фронті.

Модель статусів (тільки 3)

- Дозволені: “У відпустці”, “Заплановано”, “На роботі”.
- Пріоритет: У відпустці > Заплановано > На роботі.
- Єдина функція обчислення статусу (TZ‑safe, date‑only, включно) застосовується всюди.

Відключення заявок/затверджень

- Функціонал “запит/затвердження відпусток” повністю вимкнений прапором FEATURES.REQUESTS_ENABLED = false.
- Жодних кнопок/бейджів “Pending/Approved/Rejected”; відповідні ендпойнти/логіка не виконуються; на API/Functions — відповідь 404/410.

Дані, Firebase і джерела істини

- Джерела даних — тільки Firestore (або RTDB, якщо так визначено).
- Структури (приклад на Firestore):
    - employees/{id}: { externalId, fullName, departmentId/name, managerId, active, email/phone, allocation.totalAllocatedDays, updatedAt, roleClaims: { isHR, isManager, isHRHead } }
    - vacations/{id}: { employeeId, startDate, endDate, type }
    - teamTrees/{managerId}: { descendants: [employeeDocIds], updatedAt } — кеш вертикалі для менеджера (оновлюється функціями).
- Жодних сторонніх SQL/ORM. Весь код вибірок — через Firebase SDK або Cloud Functions.

Manager View: вертикаль менеджера

- Для “Manager View” дані беруться тільки з вертикалі поточного користувача (всі підлеглі вниз), а не з глобального HR‑зрізу.
- Реалізація:
    - Cloud Function (callable) getManagerTeam(managerId, filters) виконує BFS/DFS (або читає кеш teamTrees/{managerId}).
    - Security Rules обмежують читання employees/vacations до id з teamTrees поточного менеджера (HR може читати все, але “Manager View” фронт використовує team‑зріз).
- HR‑керівник у “Manager View” бачить вертикаль свого відділу; у “HR View” — глобально.

Імпорт/експорт з 1С BAS (BAF) — тільки у HR View

- Кнопки “Імпорт з BAS” / “Експорт у BAS” — тільки у HR View, тільки для HR.
- Прапор FEATURES.BAS_SYNC_ENABLED дозволяє повністю вимкнути інтеграцію.
- Імпорт: файл CSV/JSON/XML або запит до Cloud Function; pipeline у Functions: parse → validate → match/upsert (idempotent) → resolve managerId (другий прохід) → audit → оновлення teamTrees.
- Експорт: Cloud Function формує CSV/JSON/XML з фільтрами (департамент/статус/updatedSince), стрім або Storage‑посилання.
- Валідаційні обов’язкові поля: externalId, fullName, department, position, email/phone, employment_status, total_allocated_days; manager_external_id — для вертикалі.

Графіки в HR View

- За замовчуванням можуть бути вимкнені прапором FEATURES.HR_ANALYTICS_ENABLED = false (повністю ховаються і не підвантажують бібліотеки/дані).
- Якщо ввімкнені — рендеряться ТІЛЬКИ під основним контентом HR View у горизонтальній responsive‑сітці (3/2/1 колонки), без вертикального стеку; ErrorBoundary/ліниве завантаження, аби падіння графіка не ламало вкладки.

Колонка “Залишок”

- “Залишок” (days_left) відображається у всіх таблицях; формула: total_allocated_days − days_taken_to_date (майбутні не віднімаємо; активна відпустка — лише відпрацьована частина до today).
- Якщо “days” приходить із бекенда — показуємо його, але розбіжності логуються.

Безпека і доступ

- Identity — Firebase Auth. Рольові claims — або custom claims, або поле у профілі користувача, яке підхоплюється Rules/Functions.
- Firestore/RTDB Security Rules:
    - HR: читання/зміни за політикою (повний доступ до employees/vacations/allocations).
    - Manager: читання/фільтрація тільки teamTrees[currentUserId].descendants (+ self).
    - Employee: доступ тільки до власних даних.
- Усі критичні зміни (імпорт, масові апдейти) — виключно через Cloud Functions з аудитом.

Розробка, середовище та деплой

- Використовувати Emulator Suite для локальної перевірки Firebase‑сервісів; жодних самописних серверів чи локальних БД.
- Деплой: Firebase Hosting/App Hosting, Cloud Functions; конфіги/секрети — через Config/Secret Manager; ніяких ключів у коді.
- Перевіряти квоти/ліміти читань/записів; використовувати пагінацію та вибіркові поля.

Журнали змін (обов’язково після кожного кроку)

- Завжди створювати новий файл: changelogs/YYYY‑MM‑DD_HH‑mm‑ss_changelog.md.
- Структура: Title, Summary, Files changed (шляхи/рядки), Data/Rules/Functions, Tests/Validation, Risks \& Rollback, Next step, Screens (до/після).

Процес виконання кроків агентом

- Кожну відповідь починай із “Check \& Plan” (що саме робиш і чому), далі “Proposed changes (files/lines)”, “Validation”, “Changelog write‑up prepared”.
- Ніколи не видаляй файли/схеми — вимикай прапорами/guards, переносиш у legacy/ з поясненням.
- Будь‑які зміни схем даних/Rules/Functions — окремі кроки з тестами в емулюючому середовищі.

Швидкі контрольні сценарії (must pass)

- Рендер вкладок строго за ролями; тільки HR‑керівник має 3 вкладки.
- Усі статуси — лише 3; немає залишків логіки заявок/затверджень.
- “Manager View” у HR Manager показує тільки вертикаль підлеглих (через Cloud Function/Rules), а не глобальний список.
- “Залишок” коректний; таблиці/календар працюють; графіки або вимкнені, або у горизонтальній сітці під основним контентом HR View.
- Імпорт/експорт BAS — тільки у HR View; дані ідемпотентні; audit/логування присутні; teamTrees оновлюються.
- Жодних звернень до локальних БД чи сторонніх серверів без погодження; усі виклики — через Firebase.

Нагадування

- Якщо виникло бажання “спростити” бекенд локально — зупинись. Цей проєкт — Firebase‑first. Усі дані, доступи, бізнес‑логіка та імпорт/експорт реалізуються через Firebase Studio і Firebase‑сервіси.
- Будь‑який відхід від цього промпта вимагає явного погодження і окремого changelog‑кроку з ризиками і планом відкату.