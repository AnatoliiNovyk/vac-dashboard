Title: Дозволити HR редагувати ліміт днів у модалці

Summary:
- Додано поле введення ліміту у вікні керування відпустками з контекстними підказками й помилками.
- Стилізовано нові стани (успіх, помилка, перевищення) для блоку ліміту, повторно використано утиліти форм.
- Розширено логіку модалки для валідації та збереження ручних лімітів до Firestore з миттєвим оновленням UI.

Files changed (paths/lines):
- index.html (блок `vacation-periods-summary`, додано `vacation-limit-field` та success message контейнер).
- style.css (класи `vacation-limit-*`, `form-control--error`, `vacation-manager__message--success`).
- app.js (стан модалки, `handleLimitInput`, запис оновленого ліміту в `commitModalChanges`).

Data/Rules/Functions:
- Записуємо `employees/{id}.allocation.totalAllocatedDays`, `manualOverride`, `updatedAt`, `updatedBy` через клієнтську логіку; сервіси Firebase не змінювались.

Tests/Validation:
- Не виконувались (план: перевірка у Firebase Emulator Suite та ручна перевірка UI під HR профілем).

Risks & Rollback:
- Ризик: некоректні значення ліміту можуть зберегтись без додаткових бекенд-валідацій; рекомендується watchdog у функції/Rules.
- Відкат: повернути модальні зміни до попередньої ревізії `index.html`, `style.css`, `app.js` та прибрати оновлення allocation при збереженні.

Next step:
- 1) Запустити емулатори, оновити ліміт HR-користувачем та перевірити recalculation у таблиці/календарі.
- 2) Переконатися, що у не-HR користувачів поле залишається лише для читання.

Screens (до/після):
- Не знімалось.
