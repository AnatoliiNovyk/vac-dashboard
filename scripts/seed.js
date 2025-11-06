const admin = require('firebase-admin');

// Point to the Firestore emulator
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';

// Initialize the app with a consistent project ID
admin.initializeApp({ projectId: 'vacation-dashboard-06562-e46b1' });

const db = admin.firestore();

// Тестові департаменти
const departments = [
  { name: 'HR' },
  { name: 'IT' },
  { name: 'Sales' },
  { name: 'Finance' },
  { name: 'Marketing' }
];

// Demo data: 25 employees
   const employees = [];
   // Додаємо спеціального співробітника для тесту логіну
   employees.push({
     tax_id: '1111111111',
     name: 'Тестовий Користувач',
     surname: 'Тест',
     department: departments[0].name,
     roleFlags: { employee: true },
   });
   for (let i = 0; i < 10; i++) {
     const department = departments[Math.floor(Math.random() * departments.length)].name;
     employees.push({
       tax_id: String(1000000000 + i),
       name: `Employee ${i + 1}`,
       surname: 'Employee',
       department,
       roleFlags: i === 0 ? { hr: true } : i === 1 ? { manager: true } : { employee: true },
     });
   }


async function seedDatabase() {
  try {
    console.log('Starting to seed data into Firestore...');

    // Додаємо департаменти
    const depBatch = db.batch();
    departments.forEach((dep) => {
      const docRef = db.collection('departments').doc(dep.name);
      depBatch.set(docRef, dep);
    });
    await depBatch.commit();
    console.log('✅ Successfully seeded departments into the \'departments\' collection.');

    // Додаємо співробітників з випадковим департаментом
    const batch = db.batch();
    let count = 0;
    employees.forEach((employee) => {
      const docId = `uid_${employee.tax_id}`;
      const docRef = db.collection('employees').doc(docId);
      // roleFlags: беремо як є з employee
      const employeeData = {
        name: employee.name,
        surname: employee.surname,
        tax_id: employee.tax_id,
        roleFlags: employee.roleFlags || {},
        department: employee.department
      };
      batch.set(docRef, employeeData);
      count++;
    });
    await batch.commit();
    console.log(`✅ Successfully seeded ${count} employee records into the 'employees' collection.`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
