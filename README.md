# Vacation Dashboard

## Firebase Емулятори

- Auth: `127.0.0.1:9099`
- Firestore: `127.0.0.1:8085`
- Functions: `127.0.0.1:5001`
- Hosting (локально): `127.0.0.1:5000`

## Скрипти

### Синхронізація Auth

```bash
node scripts/sync-auth.js
```

### Засів Бази Даних

```bash
node seed.js
```

> **Примітка:** Файл `seed.js` вимагає наявності `serviceAccountKey.json`.
