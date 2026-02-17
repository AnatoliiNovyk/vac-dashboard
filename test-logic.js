
// Mocking computeDays for the test
function computeDays(start, end) {
    const startDate = new Date(start + "T00:00:00Z");
    const endDate = new Date(end + "T00:00:00Z");
    const diffMs = endDate - startDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(0, diffDays);
}

function computeUsedDaysToDate(start, end, customTodayStr) {
    if (!start || !end) return 0;

    // Use customTodayStr if provided, otherwise real today
    const todayStr = customTodayStr || new Date().toISOString().split('T')[0];

    if (start > todayStr) {
        return 0; // Future
    }
    if (end < todayStr) {
        return computeDays(start, end); // Past
    }
    return computeDays(start, todayStr); // Current (only part until today)
}

const testToday = "2025-12-19";

console.log("Testing Vacation Logic (Today is 2025-12-19):");

// Scenario 1: Future vacation
const futureStart = "2025-12-22";
const futureEnd = "2025-12-31";
const usedFuture = computeUsedDaysToDate(futureStart, futureEnd, testToday);
console.log(`- Future (${futureStart} to ${futureEnd}): Expect 0, Got ${usedFuture}`);

// Scenario 2: Past vacation
const pastStart = "2025-12-01";
const pastEnd = "2025-12-05";
const usedPast = computeUsedDaysToDate(pastStart, pastEnd, testToday);
console.log(`- Past (${pastStart} to ${pastEnd}): Expect 5, Got ${usedPast}`);

// Scenario 3: Active vacation (started, but not finished)
const activeStart = "2025-12-15";
const activeEnd = "2025-12-25";
const usedActive = computeUsedDaysToDate(activeStart, activeEnd, testToday);
// From 15 to 19 inclusive: 15, 16, 17, 18, 19 = 5 days
console.log(`- Active (${activeStart} to ${activeEnd}): Expect 5, Got ${usedActive}`);

// Final Balance Test
const limit = 24;
const totalUsed = usedFuture + usedPast + usedActive;
console.log(`\nFinal Balance for limit ${limit}: ${limit - totalUsed} (Expected 14)`);

if (usedFuture === 0 && usedPast === 5 && usedActive === 5 && (limit - totalUsed) === 14) {
    console.log("\n✅ TEST PASSED!");
} else {
    console.log("\n❌ TEST FAILED!");
    process.exit(1);
}
