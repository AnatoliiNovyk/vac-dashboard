# HR View: add “Нарах.” (BAS totalAllocatedDays) column

## Summary

- Added BAS allocation totals to the HR View table so teammates can see accrued vacation days alongside remaining balances.
- Surface allocation metadata from Firestore, including tooltip with the last import timestamp and stale-data hint.

## Changes

- `index.html` – inserted the new “Нарах.” header placeholder and moved the legacy tab container styling into CSS to satisfy linting.
- `app.js` – normalized `allocation` data for employees, rendered the new column with tooltip support, and adjusted balance handling/colSpans.
- `style.css` – styled the compact right-aligned column, added `tab-content` visibility rule, and kept the existing table layout intact.

## Testing

1. `firebase emulators:start --only auth,firestore,functions,hosting`
2. У Firestore Emulator створити ≥3 `employees` документів із полями `allocation.totalAllocatedDays` (наприклад 24, 18, 30) та `allocation.updatedAt` (ISO або Timestamp).
3. Перезавантажити HR View у браузері: перевірити значення колонки “Нарах.”, tooltip “оновлено: DD.MM.YYYY” та позначку про застарілі дані (>30 днів).
4. Переконатися, що співробітники без `allocation` бачать “—”, а значення “Залишок днів” візуально не перевищує “Нарах.”.

## Rollback

- Відкотити файли `index.html`, `app.js`, `style.css` до попереднього стану.
- Видалити цей changelog-файл.
