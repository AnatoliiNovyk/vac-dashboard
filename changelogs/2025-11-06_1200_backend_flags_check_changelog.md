# Changelog: 2025-11-06 12:00 — Backend flags, заявки, BAS

## Summary

- Перевірено backend-логіку (functions/index.js): заявочна логіка (request/approve/pending/reject) відсутня, BAS-логіка неактивна.
- Всі рольові claims встановлюються через roleFlags з Firestore.
- Вкладки рендеряться строго за claims (setupTabs у app.js).
- BAS/імпорт/експорт не згадується у UI та функціях.
- Статуси та залишок — тільки через Firestore, без сторонніх джерел.

## Files checked

- `functions/index.js`: claims, заявки, BAS, статуси.
- `app.js`, `index.html`: вкладки, заявки, BAS, статуси.

## Data/Rules/Functions

- Дані: claims, статуси, залишок — тільки через Firestore.
- Заявочна логіка вимкнена.
- BAS-логіка неактивна.

## Tests/Validation

- Вкладки рендеряться згідно claims.
- В UI та backend немає заявочних кнопок/логіки.
- BAS-логіка неактивна.

## Risks & Rollback

- Якщо потрібно активувати заявки/BAS — додати відповідні прапори та логіку окремим changelog-кроком.

## Next step

- Перевірити статуси, залишок, формули у Firestore та UI.
- Додати тестові сценарії для всіх ролей.

## Screens

- До: можливі залишки заявочних кнопок/логіки.
- Після: заявочна логіка та BAS відсутні, вкладки рендеряться за claims.
