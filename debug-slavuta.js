const admin = require('firebase-admin');
const serviceAccount = require('./vacation-dashboard-1ab0b-firebase-adminsdk-fbsvc-1244c07c14.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixEmployeeBalance(fullName) {
    try {
        console.log(`Searching for employee: ${fullName}...`);
        const snapshot = await db.collection('employees')
            .where('full_name', '==', fullName)
            .get();

        if (snapshot.empty) {
            console.log('Employee not found.');
            return;
        }

        const empDoc = snapshot.docs[0];
        const empData = empDoc.data();
        const empId = empDoc.id;

        // Get periods
        const periodsSnapshot = await db.collection('vacation_periods')
            .where('employee_id', '==', empId)
            .get();

        let usedDays = 0;
        periodsSnapshot.forEach(doc => {
            usedDays += (doc.data().days || 0);
        });

        const limit = empData.allocation?.totalAllocatedDays ?? empData.total_vacation_days ?? 0;
        const correctBalance = limit - usedDays;

        console.log(`Current DB Balance: ${empData.allocation?.balanceDays}`);
        console.log(`Calculated Used: ${usedDays}`);
        console.log(`Correct Balance (Limit ${limit} - Used ${usedDays}): ${correctBalance}`);

        if (empData.allocation?.balanceDays !== correctBalance) {
            console.log('UPDATING Firestore...');
            await empDoc.ref.set({
                allocation: {
                    balanceDays: correctBalance,
                    updatedAt: new Date()
                }
            }, { merge: true });
            console.log('SUCCESS: Balance updated.');
        } else {
            console.log('Balance is already correct in DB.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

fixEmployeeBalance('Славута Олександр Дмиторвич');
