const admin = require('firebase-admin');

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

admin.initializeApp({ projectId: 'vacation-dashboard-06562-e46b1' });
const db = admin.firestore();
const auth = admin.auth();

async function checkHRTeam() {
    try {
        console.log('\n=== HR Department Structure ===\n');

        const snapshot = await db.collection('employees')
            .where('department', '==', 'HR')
            .get();

        const hrEmployees = [];
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            hrEmployees.push({
                id: doc.id,
                name: data.full_name,
                position: data.position,
                manager_id: data.manager_id,
                isHR: data.isHR,
                isHRHead: data.isHRHead
            });
        });

        // Sort by hierarchy
        const manager = hrEmployees.find(e => !e.manager_id || e.manager_id === 'user_3');
        const specialists = hrEmployees.filter(e => e.manager_id && e.manager_id !== 'user_3');

        if (manager) {
            console.log(`${manager.name} (${manager.position})`);
            console.log(`  Firestore: isHR=${manager.isHR}, isHRHead=${manager.isHRHead}`);

            // Check Auth claims
            const userRecord = await auth.getUser(manager.id);
            console.log(`  Auth Claims:`, userRecord.customClaims);

            specialists.filter(s => s.manager_id === manager.id).forEach(spec => {
                console.log(`  └── ${spec.name} (${spec.position})`);
                console.log(`      Firestore: isHR=${spec.isHR}, isHRHead=${spec.isHRHead}`);
            });
        }

        console.log('\n=== Summary ===');
        console.log(`Total HR employees: ${hrEmployees.length}`);
        console.log(`HR with isHR=true: ${hrEmployees.filter(e => e.isHR).length}`);
        console.log(`HR with isHRHead=true: ${hrEmployees.filter(e => e.isHRHead).length}`);

    } catch (error) {
        console.error('Error:', error);
    }
}

checkHRTeam();
