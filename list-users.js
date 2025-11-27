const admin = require('firebase-admin');

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

admin.initializeApp({ projectId: 'vacation-dashboard-06562-e46b1' });
const auth = admin.auth();

async function listUsers() {
    try {
        const listUsersResult = await auth.listUsers(100);
        console.log('Total users:', listUsersResult.users.length);
        listUsersResult.users.forEach((userRecord) => {
            console.log(`- ${userRecord.uid} (${userRecord.email})`);
        });
    } catch (error) {
        console.log('Error listing users:', error);
    }
}

listUsers();
