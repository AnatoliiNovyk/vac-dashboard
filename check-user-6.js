const admin = require('firebase-admin');

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';

admin.initializeApp({ projectId: 'vacation-dashboard-06562-e46b1' });

const db = admin.firestore();

async function checkUser() {
    try {
        const doc = await db.collection('employees').doc('user_6').get();
        if (!doc.exists) {
            console.log('User user_6 not found');
        } else {
            console.log('User user_6 data:', JSON.stringify(doc.data(), null, 2));
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

checkUser();
