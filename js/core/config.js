/**
 * Firebase Configuration and Feature Flags
 * Extracted from app.js for better modularity
 */

// Firebase configuration (loaded from window.firebaseConfig or defaults)
export const firebaseConfig = window.firebaseConfig || {
    apiKey: "your-api-key",
    authDomain: "your-auth-domain",
    projectId: "your-project-id",
    storageBucket: "your-storage-bucket",
    messagingSenderId: "your-messaging-sender-id",
    appId: "your-app-id"
};

// Feature flags
export const FEATURE_FLAGS = {
    BAS_SYNC_ENABLED: typeof window?.FEATURES?.BAS_SYNC_ENABLED === "boolean"
        ? Boolean(window.FEATURES.BAS_SYNC_ENABLED)
        : true
};

// Constants
export const PAST_STATUS_LABEL = "Минулі відпустки";
export const MY_VIEW_STATUS_OPTIONS = ["Заплановано", PAST_STATUS_LABEL];
export const BAS_IMPORT_ACCEPT_EXTENSIONS = ".csv,.json,.xml";
export const BAS_EXPORT_STATUS_OPTIONS = ["У відпустці", "Заплановано", "На роботі"];

/**
 * Connect to Firebase emulators if running in development
 */
export function connectEmulatorsIfNeeded() {
    if (typeof window === "undefined" || !window.location) {
        return;
    }

    const hostname = window.location.hostname;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

    if (!isLocal) {
        return;
    }

    // Check if already connected
    if (window._emulatorsConnected) {
        return;
    }

    try {
        const db = firebase.firestore();
        const auth = firebase.auth();
        const functions = firebase.functions();

        db.useEmulator("127.0.0.1", 8085);
        auth.useEmulator("http://127.0.0.1:9099");
        functions.useEmulator("127.0.0.1", 5001);

        window._emulatorsConnected = true;
        console.log("[config] Connected to Firebase emulators");
    } catch (error) {
        console.warn("[config] Could not connect to emulators:", error);
    }
}
