const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin with emulator
admin.initializeApp({
    projectId: 'vacation-dashboard-06562-e46b1',
});

// Connect to Firestore emulator
const db = admin.firestore();
db.settings({
    host: '127.0.0.1:8085',
    ssl: false
});

async function importData() {
    try {
        // Read test data
        const data = JSON.parse(fs.readFileSync('./vacation_dashboard_data.json', 'utf8'));

        console.log('Importing employees...');
        const batch = db.batch();

        // Import employees
        for (const employee of data.employees) {
            const docRef = db.collection('employees').doc(`user_${employee.id}`);
            batch.set(docRef, {
                name: employee.name,
                fullName: employee.name,
                tax_id: employee.tin,
                department: employee.department,
                position: employee.position,
                manager_id: employee.manager_id ? `user_${employee.manager_id}` : null,
                total_vacation_days: employee.total_vacation_days,
                used_vacation_days: employee.used_vacation_days,
                isHR: employee.role === 'hr',
                isHRHead: employee.is_hr_manager || false,
                isManager: employee.role === 'manager'
            });
        }

        await batch.commit();
        console.log(`Imported ${data.employees.length} employees`);

        // Import vacation periods
        console.log('Importing vacation periods...');
        const vacBatch = db.batch();

        for (const period of data.vacation_periods) {
            const docRef = db.collection('vacation_periods').doc(`period_${period.id}`);
            vacBatch.set(docRef, {
                employee_id: `user_${period.employee_id}`,
                start_date: admin.firestore.Timestamp.fromDate(new Date(period.start_date)),
                end_date: admin.firestore.Timestamp.fromDate(new Date(period.end_date)),
                total_days: period.days,
                manager_id: period.manager_id ? `user_${period.manager_id}` : null,
                status: 'approved',
                created_at: admin.firestore.Timestamp.now()
            });
        }

        await vacBatch.commit();
        console.log(`Imported ${data.vacation_periods.length} vacation periods`);

        console.log('✅ Data import completed!');
        process.exit(0);
    } catch (error) {
        console.error('Error importing data:', error);
        process.exit(1);
    }
}

importData();
