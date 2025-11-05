// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const functions = firebase.functions();

// --- Connect to Emulators for Local Development ---
if (window.location.hostname === "localhost") {
  console.log("РОБОТА В РЕЖИМІ ЛОКАЛЬНОЇ РОЗРОБКИ: Підключення до емуляторів...");
  auth.useEmulator("http://localhost:9099");
  db.useEmulator("localhost", 8080);
  functions.useEmulator("localhost", 5001);
  console.log("Auth, Firestore та Functions SDK підключено до емуляторів.");
}

// --- Global State ---
let appData = {
  employees: [],
  vacation_periods: [],
  departments: []
};
let appState = {
  currentUser: null, 
  currentTab: '',
  currentDate: new Date(),
  isInitialized: false,
  listeners: [] // To store unsubscribe functions for cleanup
};

// --- DOM Elements ---
const elements = {
  loginScreen: document.getElementById('login-screen'),
  loginForm: document.getElementById('login-form'),
  taxIdInput: document.getElementById('tax-id-input'),
  loginBtn: document.getElementById('login-btn'),
  loginError: document.getElementById('login-error'),

  dashboardContainer: document.getElementById('dashboard-container'),
  tabsNav: document.getElementById('tabs-nav'),
  currentUserName: document.getElementById('current-user-name'),
  currentUserRole: document.getElementById('current-user-role'),
  // ... (rest of the dashboard elements are the same)
};

// --- Main Application Flow ---
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupAuthListener();
});

function setupAuthListener() {
    auth.onAuthStateChanged(async (user) => {
        // Cleanup old listeners before initializing a new state
        appState.listeners.forEach(unsubscribe => unsubscribe());
        appState.listeners = [];

        if (user) {
            await initializeApp(user);
        } else {
            appState.currentUser = null;
            appState.isInitialized = false;
            showLoginState();
        }
    });
}

async function handleLogin(event) {
    event.preventDefault();
    const taxId = elements.taxIdInput.value.trim();
    if (!taxId) return;

    elements.loginBtn.disabled = true;
    elements.loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вхід...';
    elements.loginError.classList.add('hidden');

    try {
        const signInWithTaxId = functions.httpsCallable('signInWithTaxId');
        const result = await signInWithTaxId({ tax_id: taxId });
        
        const token = result.data.token;
        if (!token) {
            throw new Error("Не вдалося отримати токен автентифікації.");
        }

        await auth.signInWithCustomToken(token);
        // onAuthStateChanged will handle the rest

    } catch (error) {
        console.error("Помилка входу:", error);
        const errorMessage = error.message || "Сталася невідома помилка.";
        elements.loginError.textContent = `Помилка: ${errorMessage}`;
        elements.loginError.classList.remove('hidden');
        elements.loginBtn.disabled = false;
        elements.loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Увійти';
    }
}

async function initializeApp(authUser) {
  try {
    showLoadingState();
    
    const userDoc = await db.collection('employees').doc(authUser.uid).get();
    if (!userDoc.exists) {
        throw new Error("Ваш профіль співробітника не знайдено в базі даних.");
    }
    appState.currentUser = { id: userDoc.id, ...userDoc.data() };

    // Fetch initial data
    // This part can be optimized further, but for now, it's clear.
    const [departmentsSnap, allEmployeesSnap] = await Promise.all([
      db.collection('departments').get(),
      db.collection('employees').get()
    ]);

    appData.departments = departmentsSnap.docs.map(doc => doc.data().name);
    appData.employees = allEmployeesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log(`Завантажено: ${appData.employees.length} співробітників, ${appData.departments.length} департаментів.`);

    showDashboardState();
    await setupTabs(); 

    appState.isInitialized = true;
    console.log("Ініціалізація успішно завершена.");
    
    setupRealtimeListeners();

  } catch (error) {
    console.error("Критична помилка під час ініціалізації додатку:", error);
    auth.signOut(); // Log out on critical error
  }
}

// --- Display State Functions ---

function showLoadingState() {
    elements.loginScreen.style.display = 'flex'; 
    elements.loginForm.style.display = 'none';
    // You might want a dedicated loading indicator inside the login screen
    document.querySelector('#login-screen h2').textContent = "Завантаження даних...";
    document.querySelector('#login-screen p').textContent = "Будь ласка, зачекайте.";
    elements.dashboardContainer.style.display = 'none';
}

function showLoginState() {
    elements.loginScreen.style.display = 'flex';
    elements.loginForm.style.display = 'block';
    document.querySelector('#login-screen h2').textContent = "Вхід до системи";
    document.querySelector('#login-screen p').textContent = "Будь ласка, введіть ваш ідентифікаційний номер (ІПН), щоб увійти.";
    elements.dashboardContainer.style.display = 'none';
    elements.loginBtn.disabled = false;
    elements.loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Увійти';
    elements.taxIdInput.value = '';
    elements.loginError.classList.add('hidden');
}

function showDashboardState() {
    elements.loginScreen.style.display = 'none';
    elements.dashboardContainer.style.display = 'block';
}

// --- Event Listeners Setup ---

function setupEventListeners() {
  elements.loginForm.addEventListener('submit', handleLogin);
  // Other listeners like filters, month changes, etc., are setup in initializeApp
  // to ensure they are only active when the dashboard is visible.
}

function setupRealtimeListeners() {
  // Store unsubscribe functions to be called on logout
  const empListener = db.collection('employees').onSnapshot(snapshot => {
    appData.employees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (appState.isInitialized) rerenderUI();
  }, err => console.error("Listener error (employees):", err));
  appState.listeners.push(empListener);

  // ... other listeners will be added here and pushed to appState.listeners
}


// --- UI & State Management (largely the same as before) ---

async function rerenderUI() {
    if(!appState.currentUser) return;
    updateUserInfo();
    populateFilterDropdowns();
    await applyFilters();
}

async function setupTabs() {
  // This function remains the same
  // ... 
}

// And so on... all the other functions for calendar, table, filters, etc. remain the same.
// I'm omitting them for brevity, but they should be included in the final file.

// Make sure all the previous helper functions like getTabsForCurrentUser, updateUserInfo,
// applyFilters, renderTable, renderCalendar etc. are present here.

