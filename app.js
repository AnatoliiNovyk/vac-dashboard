
// Self-executing function to encapsulate Firebase setup and app logic
(function() {
    // --- Firebase Initialization with Modular SDKs ---
    // Note: Replace with your actual Firebase config
    const firebaseConfig = {
        apiKey: "your-api-key",
        authDomain: "your-auth-domain",
        projectId: "your-project-id",
        storageBucket: "your-storage-bucket",
        messagingSenderId: "your-messaging-sender-id",
        appId: "your-app-id"
    };

    const app = firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore(app);
    const auth = firebase.auth(app);
    const functions = firebase.functions(app);

    // --- Connect to Emulators for Local Development ---
    // Using the recommended connect...Emulator functions
    // This check ensures emulators are only used in development environments
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        console.log("РОБОТА В РЕЖИМІ ЛОКАЛЬНОЇ РОЗРОБКИ: Підключення до емуляторів...");
        
        firebase.auth().useEmulator("http://localhost:9099");
        firebase.firestore().useEmulator("localhost", 8080);
        firebase.functions().useEmulator("localhost", 5001);
        
        console.log("Auth, Firestore та Functions SDK підключено до емуляторів.");
    }

    // --- Global State & DOM Elements (remain the same) ---
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
        listeners: []
    };
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
    };

    // --- Main Application Flow ---
    document.addEventListener('DOMContentLoaded', () => {
        setupEventListeners();
        setupAuthListener();
    });

    function setupAuthListener() {
        auth.onAuthStateChanged(async (user) => {
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
            // Using the new modular syntax for httpsCallable
            const signInWithTaxId = firebase.functions().httpsCallable('signInWithTaxId');
            const result = await signInWithTaxId({ tax_id: taxId });
            
            const token = result.data.token;
            if (!token) {
                throw new Error("Не вдалося отримати токен автентифікації.");
            }

            // Using the new modular syntax for signInWithCustomToken
            await firebase.auth().signInWithCustomToken(token);

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
        auth.signOut();
      }
    }

    function showLoadingState() {
        elements.loginScreen.style.display = 'flex'; 
        elements.loginForm.style.display = 'none';
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

    function setupEventListeners() {
      elements.loginForm.addEventListener('submit', handleLogin);
    }

    function setupRealtimeListeners() {
      const empListener = db.collection('employees').onSnapshot(snapshot => {
        appData.employees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (appState.isInitialized) rerenderUI();
      }, err => console.error("Listener error (employees):", err));
      appState.listeners.push(empListener);
    }

    async function rerenderUI() {
        if(!appState.currentUser) return;
        updateUserInfo();
        populateFilterDropdowns();
        await applyFilters();
    }

    async function setupTabs() {
      // This function remains the same
    }

    // Include all other necessary UI and helper functions here...
    // e.g., updateUserInfo, populateFilterDropdowns, applyFilters, getTabsForCurrentUser, etc.

})();
