const admin = require('firebase-admin');

// --- Примусове підключення до емуляторів ---
// Встановлюємо змінні середовища, щоб Admin SDK гарантовано
// підключився до локальних емуляторів. Використовуємо IP-адресу напряму,
// щоб уникнути проблем з резолвінгом `localhost`.
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

console.log('Змінні середовища для емуляторів встановлено:');
console.log(`FIRESTORE_EMULATOR_HOST=${process.env.FIRESTORE_EMULATOR_HOST}`);
console.log(`FIREBASE_AUTH_EMULATOR_HOST=${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);

// --- Ініціалізація Admin SDK ---
admin.initializeApp({ projectId: 'vacation-dashboard-local' });

const db = admin.firestore();
const auth = admin.auth();

console.log('Admin SDK успішно ініціалізовано в режимі емулятора.');

/**
 * Головна функція для синхронізації користувачів.
 */
async function syncFirestoreToAuth() {
  try {
    console.log('Отримання списку співробітників з Firestore...');
    const employeesSnapshot = await db.collection('employees').get();

    if (employeesSnapshot.empty) {
      console.log('Колекція `employees` порожня. Немає даних для синхронізації.');
      return;
    }

    const creationPromises = [];
    const existingUsers = [];
    let createdCount = 0;

    console.log(`Знайдено ${employeesSnapshot.docs.length} записів співробітників. Починаємо перевірку та створення користувачів в Auth...`);

    for (const doc of employeesSnapshot.docs) {
      const employee = doc.data();
      const uid = doc.id;

      try {
        await auth.getUser(uid);
        existingUsers.push(uid);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          const userPayload = {
            uid: uid,
            email: `${employee.tax_id}@project.local`,
            password: Math.random().toString(36).slice(-8),
            displayName: employee.name,
            disabled: false
          };

          creationPromises.push(auth.createUser(userPayload));
          createdCount++;
        } else {
          console.error(`Помилка під час перевірки користувача з UID ${uid}:`, error.message);
        }
      }
    }

    if (existingUsers.length > 0) {
      console.log(`\nПропущено ${existingUsers.length} користувачів, оскільки вони вже існують в Auth.`);
    }
    
    if (creationPromises.length > 0) {
        await Promise.all(creationPromises);
        console.log(`\n✅ Успішно створено ${createdCount} нових користувачів в Firebase Authentication.`);
    } else if (existingUsers.length === employeesSnapshot.docs.length) {
        console.log('\n✨ Усі співробітники вже синхронізовані з Firebase Authentication.');
    }

  } catch (error) {
    console.error('\n❌ Критична помилка під час синхронізації:', error);
    process.exit(1);
  }
}

// Запускаємо функцію
syncFirestoreToAuth().then(() => {
  console.log('\nСинхронізацію завершено.');
  process.exit(0);
});
