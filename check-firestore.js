const admin = require('firebase-admin');

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';

admin.initializeApp({ projectId: 'vacation-dashboard-06562-e46b1' });
const db = admin.firestore();

async function checkFirestore() {
    try {
        const doc = await db.collection('employees').doc('user_5').get();
        if (doc.exists) {
            console.log('User Data:', doc.data());
        } else {
            console.log('User not found in Firestore');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

checkFirestore();
