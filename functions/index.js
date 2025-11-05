const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Ініціалізуємо Admin SDK. 
// В реальному середовищі Firebase права доступу налаштовуються автоматично.
admin.initializeApp();

/**
 * Cloud Function, що викликається через HTTPS.
 * Призначена для автентифікації користувача за його ІПН (tax_id).
 * 
 * @param {functions.https.Request} request - Об'єкт запиту. Очікується, що в тілі
 *   запиту буде поле `tax_id`.
 * @param {functions.https.Response} response - Об'єкт відповіді.
 */
exports.signInWithTaxId = functions.https.onCall(async (data, context) => {

  const taxId = data.tax_id;

  // --- Валідація вхідних даних ---
  if (!taxId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Запит повинен містити поле `tax_id`.'
    );
  }

  try {
    // --- Пошук співробітника в Firestore ---
    console.log(`Шукаю співробітника з ІПН: ${taxId}`);
    const employeesRef = admin.firestore().collection('employees');
    const snapshot = await employeesRef.where('tax_id', '==', taxId).limit(1).get();

    if (snapshot.empty) {
      console.log(`Співробітника з ІПН ${taxId} не знайдено.`);
      throw new functions.https.HttpsError(
        'not-found',
        'Користувача з таким ІПН не знайдено.'
      );
    }

    // --- Генерація кастомного токена --- 
    // Ми використовуємо ID документа (який ми раніше зробили `uid_` + tax_id) як UID користувача.
    const userDoc = snapshot.docs[0];
    const uid = userDoc.id;
    const customToken = await admin.auth().createCustomToken(uid);

    console.log(`Успішно створено кастомний токен для UID: ${uid}`);

    // --- Відправка токена клієнту ---
    return { token: customToken };

  } catch (error) {
    console.error("Помилка під час автентифікації:", error);
    // Викидаємо помилку, щоб клієнт міг її обробити
    if (error instanceof functions.https.HttpsError) {
      throw error; // Перекидаємо вже сформовану помилку
    }
    throw new functions.https.HttpsError(
      'internal',
      'Внутрішня помилка сервера. Спробуйте пізніше.'
    );
  }
});
