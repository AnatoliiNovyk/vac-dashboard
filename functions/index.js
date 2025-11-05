const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// Initialize the Admin SDK
admin.initializeApp();

/**
 * A callable function to sign in a user via their Tax ID (ІПН).
 * - Validates the TIN.
 * - Finds the corresponding user in the 'employees' collection.
 * - Sets custom user claims based on 'roleFlags' from the Firestore document.
 * - Creates and returns a custom authentication token.
 */
exports.signInWithTaxId = functions.https.onCall(async (data, context) => {
  const taxId = data.tax_id;

  // Validate the input
  if (!taxId || !/^\d{10}$/.test(taxId)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with a `tax_id` that is a 10-digit string.'
    );
  }

  try {
    console.log(`[Function] Searching for employee with tax_id: ${taxId}`);
    const firestore = getFirestore();
    const auth = getAuth();

    // Find the user document by their tax_id
    const snapshot = await firestore.collection('employees').where('tax_id', '==', taxId).limit(1).get();

    if (snapshot.empty) {
      console.log(`[Function] Employee with tax_id ${taxId} not found.`);
      throw new functions.https.HttpsError(
        'not-found',
        'User with this TIN not found.'
      );
    }

    const userDoc = snapshot.docs[0];
    const uid = userDoc.id;
    const flags = userDoc.get('roleFlags') || {}; // Get roles, default to empty object

    console.log(`[Function] Found user with UID: ${uid}. Setting custom claims:`, flags);
    await auth.setCustomUserClaims(uid, flags);

    console.log(`[Function] Creating custom token for UID: ${uid}.`);
    const customToken = await auth.createCustomToken(uid);

    console.log(`[Function] Successfully created custom token for UID: ${uid}`);
    return { token: customToken };

  } catch (error) {
    console.error("[Function] Error during authentication:", error);
    // Re-throw specific errors or wrap them in a generic internal error
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      'internal',
      'An internal server error occurred. Please check the function logs for details.'
    );
  }
});
