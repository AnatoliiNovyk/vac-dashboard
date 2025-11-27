const admin = require('firebase-admin');

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';

admin.initializeApp({ projectId: 'vacation-dashboard-06562-e46b1' });
const db = admin.firestore();

async function checkManager() {
    try {
        // Oleksiy Kovalenko is user_1
        const doc = await db.collection('employees').doc('user_1').get();
        if (doc.exists) {
            const data = doc.data();
            console.log(`User: ${data.full_name} (${doc.id})`);
            console.log(`Manager ID: ${data.manager_id}`);

            if (data.manager_id) {
                const managerDoc = await db.collection('employees').doc(data.manager_id).get();
                if (managerDoc.exists) {
                    console.log(`Manager Found: ${managerDoc.data().full_name}`);
                } else {
                    console.log('Manager document NOT found!');
                }
            }
        } else {
            console.log('User user_1 not found');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

checkManager();
