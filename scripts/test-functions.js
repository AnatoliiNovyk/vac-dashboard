const functions = require('../functions/index.js');

console.log('Loading functions/index.js...');

if (functions.signInWithTaxId) {
    console.log('✅ signInWithTaxId is exported.');
} else {
    console.error('❌ signInWithTaxId is NOT exported.');
    process.exit(1);
}

if (functions.getManagerTeam) {
    console.log('✅ getManagerTeam is exported.');
} else {
    console.error('❌ getManagerTeam is NOT exported.');
}

console.log('Functions file loaded successfully.');
