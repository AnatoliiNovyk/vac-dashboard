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
