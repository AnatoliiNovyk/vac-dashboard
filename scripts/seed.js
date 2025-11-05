const admin = require('firebase-admin');

// Point to the Firestore emulator
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

// Initialize the app with a consistent project ID
admin.initializeApp({ projectId: 'vacation-dashboard-local' });

const db = admin.firestore();

// Demo data: 25 employees
const employees = [
  { name: 'Олександр', surname: 'Іваненко', tax_id: '1111111111', is_hr: true, is_manager: false },
  { name: 'Марія', surname: 'Петренко', tax_id: '2222222222', is_hr: false, is_manager: true },
  { name: 'Василь', surname: 'Сидоренко', tax_id: '3333333333', is_hr: false, is_manager: false },
  { name: 'Олена', surname: 'Ковальчук', tax_id: '4444444444', is_hr: false, is_manager: false },
  { name: 'Дмитро', surname: 'Мельник', tax_id: '5555555555', is_hr: false, is_manager: false },
  { name: 'Наталія', surname: 'Шевченко', tax_id: '6666666666', is_hr: false, is_manager: false },
  { name: 'Андрій', surname: 'Бондаренко', tax_id: '7777777777', is_hr: false, is_manager: false },
  { name: 'Юлія', surname: 'Коваленко', tax_id: '8888888888', is_hr: false, is_manager: false },
  { name: 'Сергій', surname: 'Бойко', tax_id: '9999999999', is_hr: false, is_manager: false },
  { name: 'Тетяна', surname: 'Ткаченко', tax_id: '1010101010', is_hr: false, is_manager: false },
  { name: 'Олексій', surname: 'Кравченко', tax_id: '1212121212', is_hr: false, is_manager: false },
  { name: 'Ірина', surname: 'Павленко', tax_id: '1313131313', is_hr: false, is_manager: false },
  { name: 'Володимир', surname: 'Савченко', tax_id: '1414141414', is_hr: false, is_manager: false },
  { name: 'Анна', surname: 'Герасименко', tax_id: '1515151515', is_hr: false, is_manager: false },
  { name: 'Максим', surname: 'Лисенко', tax_id: '1616161616', is_hr: false, is_manager: false },
  { name: 'Катерина', surname: 'Марченко', tax_id: '1717171717', is_hr: false, is_manager: false },
  { name: 'Віктор', surname: 'Швець', tax_id: '1818181818', is_hr: false, is_manager: false },
  { name: 'Людмила', surname: 'Коваль', tax_id: '1919191919', is_hr: false, is_manager: false },
  { name: 'Віталій', surname: 'Пономаренко', tax_id: '2020202020', is_hr: false, is_manager: false },
  { name: 'Світлана', surname: 'Романенко', tax_id: '2121212121', is_hr: false, is_manager: false },
  { name: 'Ярослав', surname: 'Тарасенко', tax_id: '2323232323', is_hr: false, is_manager: false },
  { name: 'Оксана', surname: 'Мороз', tax_id: '2424242424', is_hr: false, is_manager: false },
  { name: 'Роман', surname: 'Кириленко', tax_id: '2525252525', is_hr: false, is_manager: false },
  { name: 'Євген', surname: 'Давиденко', tax_id: '2626262626', is_hr: false, is_manager: false },
  { name: 'Михайло', surname: 'Петров', tax_id: '2727272727', is_hr: false, is_manager: true },
];

async function seedDatabase() {
  try {
    console.log('Starting to seed data into Firestore...');

    const batch = db.batch();
    let count = 0;

    employees.forEach((employee) => {
      // Use a consistent UID based on the tax_id
      const docId = `uid_${employee.tax_id}`;
      const docRef = db.collection('employees').doc(docId);

      // Construct the roleFlags object as expected by the cloud function
      const roleFlags = {
        is_hr: employee.is_hr || false,
        is_manager: employee.is_manager || false,
      };

      const employeeData = {
        name: employee.name,
        surname: employee.surname,
        tax_id: employee.tax_id,
        roleFlags: roleFlags, // Add the roleFlags object
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
