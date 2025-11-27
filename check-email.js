const admin = require('firebase-admin');

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

admin.initializeApp({ projectId: 'vacation-dashboard-06562-e46b1' });
const auth = admin.auth();

async function checkEmail() {
    try {
        const email = 'user5@example.com';
        const user = await auth.getUserByEmail(email);
        console.log(`User found by email: ${user.email}`);
        console.log(`UID: ${user.uid}`);
    } catch (error) {
        console.error('Error:', error);
    }
}

checkEmail();
