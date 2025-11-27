const admin = require('firebase-admin');

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

admin.initializeApp({ projectId: 'vacation-dashboard-06562-e46b1' });
const auth = admin.auth();

async function checkClaims() {
  try {
    const uid = 'user_5'; // Vladimir Shevchenko
    const user = await auth.getUser(uid);
    console.log(`User: ${user.displayName} (${user.uid})`);
    console.log('Custom Claims:', user.customClaims);
  } catch (error) {
    console.error('Error:', error);
  }
}

checkClaims();
