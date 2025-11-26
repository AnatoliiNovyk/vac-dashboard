/**
 * Authentication Module
 * Handles user login, logout, and authentication state changes
 */

import { appState, setCurrentUser, clearListeners, resetAppState } from '../core/state.js';
import { toggleHidden } from '../utils/dom.js';

// Login guard to prevent brute force attempts
const loginGuard = {
    attempts: [],
    registerAttempt() {
        const now = Date.now();
        this.attempts.push(now);
        this.attempts = this.attempts.filter(ts => now - ts < 60000);
        return this.attempts.length;
    }
};

// DOM elements (will be passed from main.js)
let elements = {};
let auth = null;
let functions = null;

/**
 * Initialize authentication module
 * @param {Object} deps - Dependencies (auth, functions, elements)
 */
export function initAuth(deps) {
    auth = deps.auth;
    functions = deps.functions;
    elements = deps.elements;

    // Set up auth state listener
    auth.onAuthStateChanged(handleAuthChange);

    // Set up login form listener
    if (elements.loginForm) {
        elements.loginForm.addEventListener('submit', handleLogin);
    }

    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', handleLogoutClick);
    }

    console.log('[auth] Authentication module initialized');
}

/**
 * Handle login form submission
 * @param {Event} event - Form submit event
 */
async function handleLogin(event) {
    event.preventDefault();

    const taxIdRaw = elements.taxIdInput ? elements.taxIdInput.value : "";
    const taxId = taxIdRaw.trim().toLowerCase();

    // Validate Tax ID format
    if (!/^\d{10}$/.test(taxId)) {
        showLoginError("ІПН має містити рівно 10 цифр.");
        return;
    }

    // Check login attempts
    const attemptCount = loginGuard.registerAttempt();
    if (attemptCount > 5) {
        showLoginError("Забагато спроб входу. Спробуйте знову через хвилину.");
        return;
    }

    // Disable login button
    if (elements.loginBtn) {
        elements.loginBtn.disabled = true;
        elements.loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вхід...';
    }

    toggleHidden(elements.loginError, true);

    try {
        // Call Cloud Function to get custom token
        const callable = functions.httpsCallable("signInWithTaxId");
        const result = await callable({ tax_id: taxId });
        const token = result?.data?.token;

        if (!token) {
            throw new Error("Не вдалося отримати токен авторизації.");
        }

        // Sign in with custom token
        await auth.signInWithCustomToken(token);
    } catch (error) {
        console.error("Помилка входу:", error);
        showLoginError(error.message || "Сталася помилка входу. Спробуйте пізніше.");
        resetLoginButton();
    }
}

/**
 * Handle authentication state changes
 * @param {Object} user - Firebase user object
 */
async function handleAuthChange(user) {
    if (!user) {
        // User logged out
        clearListeners();
        resetAppState();

        if (elements.taxIdInput) {
            elements.taxIdInput.value = "";
        }

        setLogoutVisibility(false);
        showLoginScreen();
        resetLoginButton();
        return;
    }

    try {
        // User logged in - load user data
        // This will be handled by data module
        // For now, just show dashboard
        console.log('[auth] User authenticated:', user.uid);

        // Trigger user data loading (will be done by data module)
        if (window.onUserAuthenticated) {
            console.log('[auth] Calling window.onUserAuthenticated');
            await window.onUserAuthenticated(user);
        } else {
            console.warn('[auth] window.onUserAuthenticated is NOT defined!');
        }
    } catch (error) {
        console.error("Не вдалося завантажити дані користувача:", error);
        await signOutWithCleanup("Не вдалося завантажити профіль користувача.");
    } finally {
        resetLoginButton();
    }
}

/**
 * Handle logout button click
 */
async function handleLogoutClick() {
    if (!elements.logoutBtn) {
        return;
    }

    if (!auth.currentUser) {
        showLoginScreen();
        return;
    }

    elements.logoutBtn.disabled = true;

    try {
        await signOutWithCleanup();
    } catch (error) {
        console.error("Помилка виходу користувача:", error);
    } finally {
        elements.logoutBtn.disabled = false;
    }
}

/**
 * Sign out and cleanup
 * @param {string} [message] - Optional error message to show
 */
async function signOutWithCleanup(message) {
    clearListeners();

    // Close modals (will be handled by respective modules)
    if (window.closeAllModals) {
        window.closeAllModals();
    }

    setLogoutVisibility(false);

    try {
        await auth.signOut();
    } catch (error) {
        console.error("Помилка виходу:", error);
    }

    if (message) {
        showLoginError(message);
    }

    showLoginScreen();
}

/**
 * Show login error message
 * @param {string} message - Error message
 */
function showLoginError(message) {
    if (!elements.loginError) {
        return;
    }
    elements.loginError.textContent = message;
    toggleHidden(elements.loginError, false);
}

/**
 * Reset login button to default state
 */
function resetLoginButton() {
    if (!elements.loginBtn) {
        return;
    }
    elements.loginBtn.disabled = false;
    elements.loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Увійти';
}

/**
 * Show dashboard screen
 */
function showDashboard() {
    console.log('[auth] showDashboard called');
    console.log('[auth] elements.loginScreen:', elements.loginScreen);
    console.log('[auth] elements.dashboard:', elements.dashboard);

    toggleHidden(elements.loginScreen, true);
    if (elements.loginScreen) {
        elements.loginScreen.style.display = "none";
        console.log('[auth] Hiding login screen. New display:', elements.loginScreen.style.display);
    } else {
        console.warn('[auth] loginScreen element is missing!');
    }

    toggleHidden(elements.dashboard, false);
    if (elements.dashboard) {
        elements.dashboard.style.display = "";
        console.log('[auth] Showing dashboard. New display:', elements.dashboard.style.display);
    } else {
        console.warn('[auth] dashboard element is missing!');
    }

    setLogoutVisibility(true);
}

/**
 * Show login screen
 */
function showLoginScreen() {
    toggleHidden(elements.dashboard, true);
    if (elements.dashboard) {
        elements.dashboard.style.display = "none";
    }
    toggleHidden(elements.loginScreen, false);
    if (elements.loginScreen) {
        elements.loginScreen.style.display = "";
    }
    setLogoutVisibility(false);
}

/**
 * Set logout button visibility
 * @param {boolean} visible - Whether to show logout button
 */
function setLogoutVisibility(visible) {
    if (!elements.logoutBtn) {
        return;
    }
    toggleHidden(elements.logoutBtn, !visible);
}

/**
 * Refresh auth claims
 * @param {Object} user - Firebase user
 * @param {boolean} forceRefresh - Force token refresh
 * @returns {Promise<Object|null>} Claims object
 */
export async function refreshAuthClaims(user, forceRefresh = false) {
    if (!user) {
        appState.authClaims = null;
        appState.hasHrCustomClaim = false;
        return null;
    }

    try {
        const tokenResult = await user.getIdTokenResult(forceRefresh);
        const claims = tokenResult?.claims || {};
        appState.authClaims = claims;
        appState.hasHrCustomClaim = Boolean(claims.isHR);
        return claims;
    } catch (error) {
        console.error("Не вдалося оновити кастомні claims користувача:", error);
        appState.authClaims = null;
        appState.hasHrCustomClaim = false;
        return null;
    }
}

// Export functions for use by other modules
export {
    showDashboard,
    showLoginScreen,
    signOutWithCleanup
};
