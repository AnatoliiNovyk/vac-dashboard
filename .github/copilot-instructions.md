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

Системний промпт: Vacation Dashboard — Firebase Studio, ІПН-логін, Restore UI

Місія і рамки

- Розробляй і виправляй Vacation Dashboard виключно у Firebase‑стеку: Auth, Firestore/RTDB, Cloud Functions, Storage, Hosting/App Hosting, Emulator Suite.
- Заборонено будь‑які локальні/сторонні БД, самописні бекенди, хардкод користувачів, UI‑евристики ролей, логіка заявок/затверджень.
- Усі зміни — малі, відкотні, з обов’язковим changelog у changelogs/.

Крок 0: Restore UI (обов’язковий перед будь‑якими правками)

- Поверни дизайн до останньої стабільної версії: public/index.html, style.css, app.js (частина верстки) мають збігатися з еталоном/стабільним комітом.
- Заборонено змінювати HTML/CSS/класи/сітки/відступи на цьому кроці; дозволено лише підключити/ініціалізувати скрипти без зміни DOM.
- Надати DIFF по кожному файлу та скріни “до/після”; будь‑яка візуальна розбіжність — дефект.

Аутентифікація: одне поле “ІПН” через custom token

- Екран входу містить лише поле “ІПН” (10 цифр). Ніяких e‑mail/паролів у UI.
- callable Cloud Function signInWithTIN({ tin }): валідація /^\d{10}\$/, пошук employees.tax_id == tin, uid = doc.id, optional setCustomUserClaims(uid, roleFlags), createCustomToken(uid) → return { token }.
- Клієнт: виклик функції → signInWithCustomToken → зчитування профілю/claims → рендер вкладок/прав.
- Додай базовий захист від перебору (rate‑limit/логування спроб).

Ролі, вкладки, права

- Ролі: HR, Manager, Employee; прапори: isHR, isManager, isHRHead.
- Вкладки:
    - HR‑керівник: HR View, Manager View, My View
    - HR: HR View, My View
    - Manager: Manager View, My View
    - Employee: My View
- Видимість вкладок і кнопок базується лише на claims/або профілі користувача з бекенду; будь‑які UI‑перемикачі ролей — заборонені.
- HR має право редагувати всі дані співробітника; бекенд і правила безпеки це забезпечують.

Статуси відпусток

- Єдині статуси: “У відпустці”, “Заплановано”, “На роботі”.
- Єдина функція обчислення статусу (TZ‑safe, date‑only, включно); пріоритет: У відпустці > Заплановано > На роботі.
- Функціонал заявок/затверджень відсутній і не додається.

Manager View: тільки вертикаль підлеглих

- Джерело даних Manager View — callable getManagerTeam або кеш teamTrees/{managerId}; жодних глобальних HR‑зрізів у цій вкладці.
- Правила безпеки дозволяють менеджеру читати лише self + descendants; HR — глобально; Employee — лише self.

Імпорт/Експорт BAS

- Доступні тільки у HR View, лише для HR; керуються прапором FEATURES.BAS_SYNC_ENABLED.
- Пайплайн у Functions з валідацією, ідемпотентністю, аудитом, оновленням teamTrees.

Підключення до емулювань (DEV)

- Перед першими викликами SDK на клієнті:
    - connectAuthEmulator(auth, 'http://localhost:9099')
    - connectFirestoreEmulator(db, 'localhost', 8080)
    - connectFunctionsEmulator(functions, 'localhost', 5001)
- Вимоги до середовища: Node 18+, JDK 21+. Продукційний деплой дозволений лише після локальних тестів.

Обов’язковий формат кожного кроку агента

- Check \& Plan: що і навіщо змінюється, ризики, як тестувати.
- Proposed Changes: файли/рядки, код/псевдокод, вплив на Rules/Functions/клієнт.
- Validation: точні команди для емулювань і локального запуску, очікуваний результат, що перевірити у UI.
- Changelog: готовий текст у changelogs/YYYY‑MM‑DD_HH‑mm‑ss_changelog.md з DIFF, скрінами, rollback.

Контрольні сценарії (must pass)

- “UI Restore”: візуал і розмітка ідентичні еталону (скріни збігаються).
- Вхід ІПН одним полем → успішний token → вкладки за ролями з бекенду.
- HR бачить та може планувати/редагувати; інші — ні (і бекенд блокує спроби).
- Manager View показує лише підлеглих; глобальні колекції не читаються в цій вкладці.
- Тільки 3 статуси; немає елементів заявок/затверджень.
- Усі зміни зафіксовані окремим changelog; є інструкція для локального тесту і rollback.

Політика змін

- Не змінюй дизайн/стилі під час фіксів логіки, окрім кроку “UI Restore”. Будь-які UI‑покращення — окремими погодженими кроками.
- Якщо щось неможливо виконати — вкажи точну причину, обмеження, альтернативний план і наслідки.