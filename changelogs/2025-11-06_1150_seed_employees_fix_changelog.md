# Changelog: 2025-11-06 11:50 — Seed employees: поля, структура

## Summary

- Виправлено seed-скрипт: всі співробітники мають обов'язкове поле `surname`.
- Поле `department` тепер завжди визначене і відповідає об'єкту співробітника.
- `roleFlags` передається у Firestore як є (hr/manager/employee), без додаткових is_hr/is_manager.
- Виправлено структуру даних для відповідності системному промпту.

## Files changed

- `scripts/seed.js`: додано surname для всіх співробітників, виправлено передачу department та roleFlags.

## Data/Rules/Functions

- Дані: колекція `employees` у Firestore Emulator містить лише валідні документи.
- Структура: всі поля визначені, немає undefined.

## Tests/Validation

- seed-скрипт виконується без помилок.
- Всі співробітники створюються у Firestore Emulator.
- Логін з tax_id `1111111111` працює.

## Risks & Rollback

- Якщо потрібно повернути стару логіку — повернути попередню версію seed.js.
- Ризик втрати тестових даних при повторному seed — рекомендується перевірити дані перед перезапуском.

## Next step

- Перевірити коректність claims/ролей у Auth.
- Перевірити рендер вкладок та доступи згідно claims.
- Перевірити backend flags (FEATURES.REQUESTS_ENABLED, BAS, статуси).

## Screens

- До: seed-скрипт падає з помилкою undefined.
- Після: seed-скрипт виконується, всі співробітники валідні, логін працює.
