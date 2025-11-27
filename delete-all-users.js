const admin = require('firebase-admin');

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

admin.initializeApp({ projectId: 'vacation-dashboard-06562-e46b1' });
const auth = admin.auth();

async function deleteAllUsers() {
    try {
        const listUsersResult = await auth.listUsers(100);
        const uids = listUsersResult.users.map((user) => user.uid);
        if (uids.length > 0) {
            await auth.deleteUsers(uids);
            console.log(`Successfully deleted ${uids.length} users.`);
        } else {
            console.log('No users to delete.');
        }
    } catch (error) {
        console.log('Error deleting users:', error);
    }
}

deleteAllUsers();
