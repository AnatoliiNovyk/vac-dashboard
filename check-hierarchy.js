const admin = require('firebase-admin');

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';

admin.initializeApp({ projectId: 'vacation-dashboard-06562-e46b1' });
const db = admin.firestore();

async function checkHierarchy() {
    try {
        const snapshot = await db.collection('employees').get();
        const employees = {};

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            employees[doc.id] = {
                id: doc.id,
                name: data.full_name,
                position: data.position,
                department: data.department,
                manager_id: data.manager_id
            };
        });

        console.log('\n=== Organizational Hierarchy ===\n');

        // Find CEO (no manager)
        const ceo = Object.values(employees).find(emp => !emp.manager_id);
        if (ceo) {
            printEmployee(ceo, employees, 0);
        }

        console.log('\n=== Verification ===');
        console.log(`Total employees: ${Object.keys(employees).length}`);

        // Check specific people
        const dmitro = Object.values(employees).find(e => e.name.includes('Дмитро'));
        if (dmitro) {
            const manager = employees[dmitro.manager_id];
            console.log(`\nДмитро Іваненко (IT Manager):`);
            console.log(`  Manager: ${manager ? manager.name + ' (' + manager.position + ')' : 'None'}`);
        }

        const volodymyr = Object.values(employees).find(e => e.name.includes('Володимир'));
        if (volodymyr) {
            const manager = employees[volodymyr.manager_id];
            console.log(`\nВолодимир Шевченко (HR Director):`);
            console.log(`  Manager: ${manager ? manager.name + ' (' + manager.position + ')' : 'None'}`);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

function printEmployee(emp, allEmployees, level) {
    const indent = '  '.repeat(level);
    console.log(`${indent}${emp.name} (${emp.position}, ${emp.department})`);

    // Find subordinates
    const subordinates = Object.values(allEmployees).filter(e => e.manager_id === emp.id);
    subordinates.forEach(sub => printEmployee(sub, allEmployees, level + 1));
}

checkHierarchy();
