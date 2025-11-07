# HR View: add filters reset button

## Summary

- Added a reset control to the filters bar so HR can quickly return to the default "Всі" view.
- Synced UI state with `appState.filters` and ensured table/calendar rerender when clearing selections.

## Changes

- `app.js` – generated the reset button alongside existing selects and wired it to clear filters and rerender the dashboard.
- `style.css` – aligned the new control with the filter grid and tuned the button footprint for consistency.

## Testing

1. `firebase emulators:start --only auth,firestore,functions,hosting`
2. Увійти під HR-користувачем, обрати значення в обох фільтрах.
3. Натиснути "Скинути фільтри" та перевірити, що селекти повертаються на "Всі", а таблиця та календар оновлюються.
4. Повторити для Manager View (лише фільтр підрозділу) й пересвідчитись, що кнопка також відновлює значення.

## Rollback

- Відкотити зміни у `app.js` та `style.css`.
- Видалити цей changelog-файл.
