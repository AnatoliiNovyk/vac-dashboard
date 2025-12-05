/**
 * Script to import Firestore data from emulator export to production
 * Run with: node import-to-production.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
const serviceAccount = require('./vacation-dashboard-1ab0b-firebase-adminsdk-fbsvc-1244c07c14.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'vacation-dashboard-1ab0b'
});

const db = admin.firestore();

const employees = [
    {
        id: "user_1",
        ipn: "1234567890",
        tax_id: "1234567890",
        full_name: "Олексій Коваленко",
        department_id: "it",
        position: "Senior Developer",
        is_hr: false,
        is_hr_head: false,
        is_manager: false,
        isHR: false,
        isHRHead: false,
        isManager: false,
        manager_id: "user_4",
        total_vacation_days: 24,
        used_vacation_days: 8
    },
    {
        id: "user_2",
        ipn: "0987654321",
        tax_id: "0987654321",
        full_name: "Марина Петренко",
        department_id: "marketing",
        position: "Marketing Specialist",
        is_hr: false,
        is_hr_head: false,
        is_manager: false,
        isHR: false,
        isHRHead: false,
        isManager: false,
        manager_id: "user_3",
        total_vacation_days: 22,
        used_vacation_days: 5
    },
    {
        id: "user_3",
        ipn: "9999999999",
        tax_id: "9999999999",
        full_name: "Петро Коваль",
        department_id: "executive",
        position: "Генеральний директор",
        is_hr: false,
        is_hr_head: false,
        is_manager: true,
        isHR: false,
        isHRHead: false,
        isManager: true,
        manager_id: null,
        total_vacation_days: 30,
        used_vacation_days: 10
    },
    {
        id: "user_4",
        ipn: "1122334455",
        tax_id: "1122334455",
        full_name: "Дмитро Білий",
        department_id: "it",
        position: "IT Manager",
        is_hr: false,
        is_hr_head: false,
        is_manager: true,
        isHR: false,
        isHRHead: false,
        isManager: true,
        manager_id: "user_3",
        total_vacation_days: 24,
        used_vacation_days: 10
    },
    {
        id: "user_5",
        ipn: "5566778899",
        tax_id: "5566778899",
        full_name: "Анна Сидоренко",
        department_id: "finance",
        position: "Finance Manager",
        is_hr: false,
        is_hr_head: false,
        is_manager: true,
        isHR: false,
        isHRHead: false,
        isManager: true,
        manager_id: "user_3",
        total_vacation_days: 24,
        used_vacation_days: 4
    },
    {
        id: "user_6",
        ipn: "1231231234",
        tax_id: "1231231234",
        full_name: "Володимир Шевченко",
        department_id: "hr",
        position: "HR Manager",
        is_hr: true,
        is_hr_head: true,
        is_manager: false,
        isHR: true,
        isHRHead: true,
        isManager: false,
        manager_id: "user_3",
        total_vacation_days: 28,
        used_vacation_days: 14
    },
    {
        id: "user_7",
        ipn: "4564564567",
        tax_id: "4564564567",
        full_name: "Світлана Мельник",
        department_id: "finance",
        position: "Accountant",
        is_hr: false,
        is_hr_head: false,
        is_manager: false,
        isHR: false,
        isHRHead: false,
        isManager: false,
        manager_id: "user_5",
        total_vacation_days: 24,
        used_vacation_days: 6
    },
    {
        id: "user_8",
        ipn: "7897897890",
        tax_id: "7897897890",
        full_name: "Ігор Бондаренко",
        department_id: "sales",
        position: "Sales Manager",
        is_hr: false,
        is_hr_head: false,
        is_manager: true,
        isHR: false,
        isHRHead: false,
        isManager: true,
        manager_id: "user_3",
        total_vacation_days: 24,
        used_vacation_days: 8
    },
    {
        id: "user_9",
        ipn: "0011223344",
        tax_id: "0011223344",
        full_name: "Тетяна Козлова",
        department_id: "sales",
        position: "Sales Representative",
        is_hr: false,
        is_hr_head: false,
        is_manager: false,
        isHR: false,
        isHRHead: false,
        isManager: false,
        manager_id: "user_8",
        total_vacation_days: 22,
        used_vacation_days: 3
    },
    {
        id: "user_10",
        ipn: "3333333333",
        tax_id: "3333333333",
        full_name: "Оксана Ткаченко",
        department_id: "hr",
        position: "Senior HR Specialist",
        is_hr: true,
        is_hr_head: false,
        is_manager: false,
        isHR: true,
        isHRHead: false,
        isManager: false,
        manager_id: "user_6",
        total_vacation_days: 24,
        used_vacation_days: 7
    },
    {
        id: "user_11",
        ipn: "4444444444",
        tax_id: "4444444444",
        full_name: "Ірина Коваленко",
        department_id: "hr",
        position: "HR Specialist",
        is_hr: true,
        is_hr_head: false,
        is_manager: false,
        isHR: true,
        isHRHead: false,
        isManager: false,
        manager_id: "user_6",
        total_vacation_days: 22,
        used_vacation_days: 5
    }
];

const departments = [
    { id: "it", name: "IT" },
    { id: "hr", name: "HR" },
    { id: "marketing", name: "Marketing" },
    { id: "finance", name: "Finance" },
    { id: "sales", name: "Sales" },
    { id: "executive", name: "Executive" }
];

const vacationPeriods = [
    { id: "vp_1", employee_id: "user_6", start_date: "2025-12-01", end_date: "2025-12-07", status: "active" },
    { id: "vp_2", employee_id: "user_10", start_date: "2025-12-05", end_date: "2025-12-11", status: "planned" },
    { id: "vp_3", employee_id: "user_11", start_date: "2025-12-04", end_date: "2025-12-10", status: "planned" },
    { id: "vp_4", employee_id: "user_1", start_date: "2025-12-05", end_date: "2025-12-10", status: "planned" },
    { id: "vp_5", employee_id: "user_4", start_date: "2025-12-20", end_date: "2025-12-30", status: "planned" }
];

async function importData() {
    console.log('Starting import to production Firestore...');

    // Import departments
    console.log('Importing departments...');
    for (const dept of departments) {
        await db.collection('departments').doc(dept.id).set(dept);
        console.log(`  Added department: ${dept.name}`);
    }

    // Import employees
    console.log('Importing employees...');
    for (const emp of employees) {
        const { id, ...data } = emp;
        await db.collection('employees').doc(id).set(data, { merge: true });
        console.log(`  Updated employee: ${data.full_name}`);
    }

    // Import vacation periods
    console.log('Importing vacation periods...');
    for (const vp of vacationPeriods) {
        const { id, ...data } = vp;
        await db.collection('vacation_periods').doc(id).set(data);
        console.log(`  Added vacation period: ${id}`);
    }

    console.log('Import complete!');
    process.exit(0);
}

importData().catch(err => {
    console.error('Import failed:', err);
    process.exit(1);
});
