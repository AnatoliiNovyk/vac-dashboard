
const fs = require('fs');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Read data from JSON file
const data = JSON.parse(fs.readFileSync('vacation_dashboard_data.json', 'utf8'));

// Function to upload data to Firestore
async function uploadData() {
  console.log('Starting data upload...');

  // Upload employees
  const employeesRef = db.collection('employees');
  for (const employee of data.employees) {
    await employeesRef.doc(String(employee.id)).set(employee);
  }
  console.log('✅ Employees uploaded successfully!');

  // Upload vacation periods to the correct collection
  const vacationsRef = db.collection('vacation_periods'); // FIXED: Was 'vacations'
  for (const vacation of data.vacation_periods) {
    // Let Firestore generate the ID
    await vacationsRef.add(vacation);
  }
  console.log('✅ Vacation periods uploaded successfully to "vacation_periods" collection!');

  // Upload departments to the correct collection
  const departmentsRef = db.collection('departments'); // FIXED: Was 'config'
  for (const departmentName of data.departments) {
      await departmentsRef.add({ name: departmentName });
  }
  console.log('✅ Departments uploaded successfully to "departments" collection!');

  console.log('\n🎉 Database seeding complete!');
}

uploadData().catch(error => {
    console.error('🔥 Error seeding database:', error);
    process.exit(1);
});
