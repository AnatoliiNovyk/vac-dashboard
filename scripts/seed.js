const admin = require('firebase-admin');

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';

admin.initializeApp({ projectId: 'vacation-dashboard-06562-e46b1' });

const db = admin.firestore();
const data = require('../vacation_dashboard_data.json');

function splitName(fullName = '') {
  if (!fullName.trim()) {
    return { first: '', last: '' };
  }
  const parts = fullName.trim().split(/\s+/);
  const first = parts.shift();
  const last = parts.join(' ');
  return { first: first || '', last: last || '' };
}

function mapRoleFlags(employee) {
  const role = employee.role || '';
  return {
    is_hr: role === 'hr' || Boolean(employee.is_hr_manager),
    is_manager: role === 'manager',
    is_hr_head: Boolean(employee.is_hr_manager)
  };
}

async function clearCollection(collectionName) {
  const docs = await db.collection(collectionName).listDocuments();
  if (!docs.length) return;
  const batch = db.batch();
  docs.forEach((docRef) => batch.delete(docRef));
  await batch.commit();
  console.log(`🧹 Cleared collection ${collectionName}`);
}

async function seedDepartments() {
  const departments = data.departments || [];
  if (!departments.length) return;
  const batch = db.batch();
  departments.forEach((depName) => {
    const docRef = db.collection('departments').doc(depName);
    batch.set(docRef, { name: depName });
  });
  await batch.commit();
  console.log(`✅ Seeded ${departments.length} departments.`);
}

async function seedEmployees() {
  const employees = data.employees || [];
  if (!employees.length) return;
  const batch = db.batch();
  employees.forEach((employee) => {
    const docId = String(employee.tin); // FIXED: Use tax_id as document ID
    const { first, last } = splitName(employee.name);
    const docRef = db.collection('employees').doc(docId);
    batch.set(docRef, {
      name: first,
      surname: last,
      full_name: employee.name,
      department: employee.department || '',
      position: employee.position || '',
      manager_id: employee.manager_id ? String(employee.manager_id) : null,
      total_vacation_days: employee.total_vacation_days ?? 0,
      used_vacation_days: employee.used_vacation_days ?? 0,
      tax_id: employee.tin,
      roleFlags: mapRoleFlags(employee)
    });
  });
  await batch.commit();
  console.log(`✅ Seeded ${employees.length} employees.`);
}

async function seedVacationPeriods() {
  const periods = data.vacation_periods || [];
  if (!periods.length) return;
  const batch = db.batch();
  periods.forEach((period) => {
    const docRef = db.collection('vacation_periods').doc(String(period.id));
    batch.set(docRef, {
      employee_id: String(period.employee_id),
      start_date: period.start_date,
      end_date: period.end_date,
      days: period.days,
      manager_id: period.manager_id ? String(period.manager_id) : null,
      type: period.type || ''
    });
  });
  await batch.commit();
  console.log(`✅ Seeded ${periods.length} vacation periods.`);
}

async function seedDatabase() {
  try {
    console.log('🚀 Starting Firestore seeding using vacation_dashboard_data.json');

    await clearCollection('vacation_periods');
    await clearCollection('employees');
    await clearCollection('departments');

    await seedDepartments();
    await seedEmployees();
    await seedVacationPeriods();

    console.log('🎉 Seeding complete.');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
