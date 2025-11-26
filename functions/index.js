const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { getFirestore, FieldValue, FieldPath } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const crypto = require('crypto');

// Initialize the Admin SDK
admin.initializeApp();

const BAS_IMPORT_CHUNK_SIZE = 500;
const BAS_INVALID_RATIO_THRESHOLD = 0.3;

function assertHrAccess(context) {
  const claims = context.auth?.token || {};
  if (claims.isHR || claims.is_hr || claims.isHRHead || claims.is_hr_head) {
    return;
  }
  throw new functions.https.HttpsError(
    'permission-denied',
    'Лише користувачі з HR-повноваженнями можуть запускати BAS-імпорт.'
  );
}

function chunkArray(items, size) {
  if (!Array.isArray(items) || size <= 0) {
    return [];
  }
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function sanitizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function computeDurationDays(startDate, endDate, fallback) {
  if (typeof fallback === 'number' && Number.isFinite(fallback)) {
    return fallback;
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : null;
}

function buildVacationDocId(taxId, startDate, endDate, type = '') {
  const hash = crypto
    .createHash('sha1')
    .update([taxId, startDate, endDate, type || 'default'].join('|'))
    .digest('hex');
  return hash;
}

function mapEmployeeForFirestore(employee) {
  const taxId = sanitizeString(employee.taxId || employee.tax_id);
  const firstName = sanitizeString(employee.firstName || employee.first_name);
  const lastName = sanitizeString(employee.lastName || employee.surname);
  const middleName = sanitizeString(employee.middleName || employee.middle_name);
  const department = sanitizeString(employee.department || employee.departmentName);
  const position = sanitizeString(employee.position);
  const managerTaxId = sanitizeString(employee.managerTaxId || employee.manager_tax_id);
  const totalAllocatedDays = parseNumber(employee?.allocation?.totalAllocatedDays);
  const balanceDays = parseNumber(employee?.allocation?.balanceDays);

  return {
    tax_id: taxId,
    taxId,
    external_id: sanitizeString(employee.externalId || employee.external_id || taxId),
    externalId: sanitizeString(employee.externalId || employee.external_id || taxId),
    full_name: sanitizeString(
      employee.fullName || [lastName, firstName, middleName].filter(Boolean).join(' ')
    ),
    name: firstName,
    first_name: firstName,
    surname: lastName,
    last_name: lastName,
    middle_name: middleName,
    patronymic: middleName,
    department,
    department_id: department,
    position,
    manager_id: managerTaxId || null,
    manager_tax_id: managerTaxId || null,
    allocation: {
      totalAllocatedDays: totalAllocatedDays,
      balanceDays: balanceDays,
      updatedAt: FieldValue.serverTimestamp()
    },
    bas: {
      syncedAt: FieldValue.serverTimestamp(),
      source: 'import'
    },
    updatedAt: FieldValue.serverTimestamp()
  };
}

function mapVacationForFirestore(vacation) {
  const taxId = sanitizeString(vacation.employeeTaxId || vacation.taxId || vacation.employee_id);
  const startDate = sanitizeString(vacation.startDate || vacation.start_date);
  const endDate = sanitizeString(vacation.endDate || vacation.end_date);
  const type = sanitizeString(vacation.type);
  const status = sanitizeString(vacation.status);
  const duration = computeDurationDays(startDate, endDate, vacation.durationDays ?? vacation.days);

  return {
    employee_id: taxId,
    employee_tax_id: taxId,
    start_date: startDate,
    end_date: endDate,
    days: duration,
    type: type || 'Відпустка',
    status,
    bas: {
      syncedAt: FieldValue.serverTimestamp(),
      source: 'import'
    },
    updated_at: FieldValue.serverTimestamp()
  };
}

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
    const firestore = admin.firestore();
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

    const normalizedClaims = {
      isHR: Boolean(flags.isHR ?? flags.is_hr),
      is_hr: Boolean(flags.isHR ?? flags.is_hr),
      isManager: Boolean(flags.isManager ?? flags.is_manager),
      is_manager: Boolean(flags.isManager ?? flags.is_manager),
      isHRHead: Boolean(flags.isHRHead ?? flags.is_hr_head ?? flags.is_hr_manager),
      is_hr_head: Boolean(flags.isHRHead ?? flags.is_hr_head ?? flags.is_hr_manager)
    };

    console.log(`[Function] Found user with UID: ${uid}. Setting custom claims:`, normalizedClaims);
    await auth.setCustomUserClaims(uid, normalizedClaims);

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

exports.importBasData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Неавторизований доступ до BAS-імпорту заборонено.');
  }

  assertHrAccess(context);

  const payload = data?.payload || {};
  const summary = data?.summary || {};
  const options = data?.options || {};

  const employees = Array.isArray(payload.employees) ? payload.employees : [];
  const vacations = Array.isArray(payload.vacations) ? payload.vacations : [];

  if (employees.length === 0 && vacations.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Немає даних для синхронізації з BAS.');
  }

  const metrics = summary.metrics || {};
  const thresholds = summary.thresholds || {};
  const invalidFromThreshold = typeof thresholds.invalidRatio === 'number' ? thresholds.invalidRatio : null;
  const invalidFromMetrics = typeof metrics.invalidRowCount === 'number' && typeof metrics.totalRows === 'number' && metrics.totalRows > 0
    ? metrics.invalidRowCount / metrics.totalRows
    : 0;
  const invalidRatio = invalidFromThreshold !== null ? invalidFromThreshold : invalidFromMetrics;
  const invalidLimit = typeof thresholds.invalidLimit === 'number' ? thresholds.invalidLimit : BAS_INVALID_RATIO_THRESHOLD;

  if (!options.force && invalidRatio > invalidLimit) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `Частка невалідних рядків (${Math.round(invalidRatio * 100)}%) перевищує допустимий поріг ${Math.round(invalidLimit * 100)}%. Імпорт зупинено.`
    );
  }

  const firestore = getFirestore();
  const dryRun = Boolean(options.dryRun);
  const employeeChunks = chunkArray(employees, BAS_IMPORT_CHUNK_SIZE);
  const vacationChunks = chunkArray(vacations, BAS_IMPORT_CHUNK_SIZE);

  let employeesWritten = 0;
  for (const chunk of employeeChunks) {
    if (chunk.length === 0) {
      continue;
    }
    const batch = firestore.batch();
    chunk.forEach((employee) => {
      const mapped = mapEmployeeForFirestore(employee);
      const taxId = sanitizeString(mapped.tax_id);
      if (!taxId) {
        return;
      }
      const docRef = firestore.collection('employees').doc(taxId);
      batch.set(docRef, mapped, { merge: true });
      employeesWritten += 1;
    });
    if (!dryRun && chunk.length > 0) {
      await batch.commit();
    }
  }

  let vacationsWritten = 0;
  for (const chunk of vacationChunks) {
    if (chunk.length === 0) {
      continue;
    }
    const batch = firestore.batch();
    chunk.forEach((vacation) => {
      const mapped = mapVacationForFirestore(vacation);
      const taxId = sanitizeString(mapped.employee_id);
      const startDate = sanitizeString(mapped.start_date);
      const endDate = sanitizeString(mapped.end_date);
      if (!taxId || !startDate || !endDate) {
        return;
      }
      const docId = buildVacationDocId(taxId, startDate, endDate, mapped.type);
      const docRef = firestore.collection('vacation_periods').doc(docId);
      batch.set(docRef, mapped, { merge: true });
      vacationsWritten += 1;
    });
    if (!dryRun && chunk.length > 0) {
      await batch.commit();
    }
  }

  let integrationLogId = null;
  if (!dryRun) {
    const logEntry = {
      action: 'bas_import',
      userId: context.auth.uid || null,
      createdAt: FieldValue.serverTimestamp(),
      summary: {
        fileName: summary.fileName || null,
        format: summary.format || null,
        metrics: {
          totalRows: metrics.totalRows ?? null,
          processedRows: metrics.processedRows ?? null,
          employeeCount: metrics.employeeCount ?? null,
          vacationCount: metrics.vacationCount ?? null,
          invalidRowCount: metrics.invalidRowCount ?? null,
          warningCount: metrics.warningCount ?? null
        },
        thresholds: {
          invalidRatio,
          invalidLimit
        },
        errorsSample: summary.errorsSample || [],
        warningsSample: summary.warningsSample || [],
        duplicatesSample: summary.duplicatesSample || []
      },
      result: {
        employeesWritten,
        vacationsWritten,
        employeeChunks: employeeChunks.length,
        vacationChunks: vacationChunks.length
      }
    };
    const logRef = await firestore.collection('integration_logs').add(logEntry);
    integrationLogId = logRef.id;
  }

  return {
    employeesWritten,
    vacationsWritten,
    employeeChunks: employeeChunks.length,
    vacationChunks: vacationChunks.length,
    dryRun,
    integrationLogId,
    invalidRatio,
    invalidLimit
  };
});

// --- Helper Functions for Team Trees ---

function calculateDepth(descendants, employeeMap) {
  // Simplified depth calculation
  // In a real implementation, we would traverse the tree to find the max depth
  // For now, we'll just return a placeholder or calculate based on known hierarchy if possible
  // Since we have a flat list of descendants, calculating exact depth requires reconstructing the tree
  // Let's assume a default or try to estimate.
  // A better approach for depth:
  // 1. Build a map of id -> manager_id
  // 2. For each descendant, traverse up to the root (managerId) and count steps
  // 3. Max steps = depth

  let maxDepth = 0;
  for (const descendantId of descendants) {
    let currentId = descendantId;
    let depth = 0;
    while (currentId && employeeMap.has(currentId)) {
      const emp = employeeMap.get(currentId);
      if (!emp.manager_id) break;
      // If we reach the root manager (not in the descendants list but is the root), stop
      // Note: employeeMap contains ALL employees, so we need to be careful not to loop infinitely
      // We should pass the root managerId to stop
      depth++;
      currentId = emp.manager_id;
      if (depth > 20) break; // Safety break
    }
    if (depth > maxDepth) maxDepth = depth;
  }
  return maxDepth;
}

async function buildTeamTreeSync(managerId) {
  console.log(`[buildTeamTreeSync] Building tree for ${managerId}`);
  const firestore = admin.firestore();
  const allEmployees = await firestore.collection('employees').get();
  console.log(`[buildTeamTreeSync] Fetched ${allEmployees.size} employees`);

  const employeeMap = new Map();
  allEmployees.docs.forEach(doc => {
    employeeMap.set(doc.id, { id: doc.id, ...doc.data() });
  });

  // BFS traversal
  const descendants = [];
  const queue = [managerId];
  const visited = new Set([managerId]);

  while (queue.length > 0) {
    const currentId = queue.shift();

    // Find direct subordinates
    for (const [empId, emp] of employeeMap.entries()) {
      if (emp.manager_id === currentId && !visited.has(empId)) {
        visited.add(empId);
        descendants.push(empId);
        queue.push(empId);
      }
    }
  }

  console.log(`[buildTeamTreeSync] Found ${descendants.length} descendants`);

  // Save to cache
  await firestore.collection('teamTrees').doc(managerId).set({
    managerId,
    descendants,
    depth: 0, // Placeholder, implementing full depth calc might be expensive here
    employeeCount: descendants.length,
    updatedAt: FieldValue.serverTimestamp(),
    version: 1
  });

  return descendants;
}

async function rebuildTeamTree(managerId) {
  return buildTeamTreeSync(managerId);
}

async function addManagerChain(managerId, set) {
  const firestore = getFirestore();
  let currentId = managerId;
  const visited = new Set();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const empDoc = await firestore.collection('employees').doc(currentId).get();

    if (!empDoc.exists) break;

    const emp = empDoc.data();
    if (emp.manager_id) {
      set.add(emp.manager_id);
      currentId = emp.manager_id;
    } else {
      break;
    }
  }
}

// --- New Cloud Functions for Manager View Optimization ---

/**
 * Sign in with Tax ID (IPN)
 * Returns a custom auth token
 */
exports.signInWithTaxId = functions.https.onCall(async (data, context) => {
  const taxId = data.tax_id;
  if (!taxId || !/^\d{10}$/.test(taxId)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Некоректний ІПН. Має бути 10 цифр.'
    );
  }

  try {
    const firestore = admin.firestore();
    const snapshot = await firestore.collection('employees')
      .where('tax_id', '==', taxId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new functions.https.HttpsError(
        'not-found',
        'Користувача з таким ІПН не знайдено.'
      );
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    const uid = userDoc.id;

    // Create custom claims
    const claims = {
      isHR: !!userData.isHR,
      isHRHead: !!userData.isHRHead,
      isManager: !!userData.isManager,
      departmentId: userData.department_id
    };

    // Create custom token
    const token = await admin.auth().createCustomToken(uid, claims);

    return { token };
  } catch (error) {
    console.error('signInWithTaxId error:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      'internal',
      'Помилка сервера при вході.'
    );
  }
});

exports.getManagerTeam = functions.https.onCall(async (data, context) => {
  console.log('[getManagerTeam] Called');

  // 1. Authentication check
  if (!context.auth) {
    console.error('[getManagerTeam] Unauthenticated');
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const safeData = data || {};
  const managerId = safeData.managerId || context.auth.uid;
  const filters = safeData.filters || {};
  console.log(`[getManagerTeam] ManagerId: ${managerId}, Filters:`, filters);

  // 2. Access check (only manager themselves or HR)
  const isHR = context.auth.token.isHR || context.auth.token.is_hr;
  if (!isHR && context.auth.uid !== managerId) {
    console.error(`[getManagerTeam] Access denied. User: ${context.auth.uid}, Target: ${managerId}`);
    throw new functions.https.HttpsError('permission-denied', 'Access denied');
  }

  try {
    const firestore = admin.firestore();

    // 3. Read teamTrees cache
    const teamTreeDoc = await firestore.collection('teamTrees').doc(managerId).get();

    let descendantIds = [];
    let cached = false;

    if (teamTreeDoc.exists) {
      const treeData = teamTreeDoc.data();
      descendantIds = treeData.descendants || [];
      cached = true;
      console.log(`[getManagerTeam] Cache hit. Descendants: ${descendantIds.length}`);

      // Check cache freshness (< 1 hour)
      const updatedAt = treeData.updatedAt ? treeData.updatedAt.toMillis() : 0;
      const cacheAge = Date.now() - updatedAt;
      if (cacheAge > 3600000) {
        console.log('[getManagerTeam] Cache stale, triggering rebuild');
        // Cache stale - rebuild asynchronously
        rebuildTeamTree(managerId).catch(err =>
          console.error('Failed to rebuild team tree:', err)
        );
      }
    } else {
      console.log('[getManagerTeam] Cache miss, building synchronously');
      // Cache missing - build synchronously
      descendantIds = await buildTeamTreeSync(managerId);
      cached = false;
      console.log(`[getManagerTeam] Built tree. Descendants: ${descendantIds.length}`);
    }

    // 4. Load employees
    const employeeIds = [managerId, ...descendantIds];
    console.log(`[getManagerTeam] Loading ${employeeIds.length} employees`);

    const chunks = chunkArray(employeeIds, 10);
    let employees = [];

    for (const chunk of chunks) {
      if (chunk.length === 0) continue;
      try {
        const snapshot = await firestore.collection('employees')
          .where(FieldPath.documentId(), 'in', chunk)
          .get();
        employees.push(...snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('[getManagerTeam] Error fetching employees chunk:', err);
        throw err;
      }
    }

    // 5. Apply filters
    if (filters.department) {
      employees = employees.filter(emp =>
        emp.department === filters.department ||
        emp.department_id === filters.department
      );
    }

    // 6. Load vacations for these employees
    const vacationChunks = chunkArray(employees.map(e => e.id), 10);
    let vacations = [];

    for (const chunk of vacationChunks) {
      if (chunk.length === 0) continue;
      try {
        const snapshot = await firestore.collection('vacation_periods')
          .where('employee_id', 'in', chunk)
          .get();
        vacations.push(...snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('[getManagerTeam] Error fetching vacations chunk:', err);
        throw err;
      }
    }

    console.log(`[getManagerTeam] Returning ${employees.length} employees and ${vacations.length} vacations`);

    return {
      employees,
      vacations,
      cached,
      teamSize: descendantIds.length + 1,
      timestamp: Date.now()
    };

  } catch (error) {
    console.error('getManagerTeam error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Update teamTrees when an employee is changed (manager_id changes).
 */
exports.updateTeamTreesOnEmployeeChange = functions.firestore
  .document('employees/{employeeId}')
  .onWrite(async (change, context) => {
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    // Check if manager_id changed
    const managerChanged = before?.manager_id !== after?.manager_id;

    if (!managerChanged && change.before.exists && change.after.exists) {
      return null;
    }

    const affectedManagers = new Set();

    // Add old manager chain
    if (before?.manager_id) {
      affectedManagers.add(before.manager_id);
      await addManagerChain(before.manager_id, affectedManagers);
    }

    // Add new manager chain
    if (after?.manager_id) {
      affectedManagers.add(after.manager_id);
      await addManagerChain(after.manager_id, affectedManagers);
    }

    // Rebuild team trees for all affected managers
    const rebuildPromises = Array.from(affectedManagers).map(managerId =>
      rebuildTeamTree(managerId).catch(err =>
        console.error(`Failed to rebuild tree for ${managerId}:`, err)
      )
    );

    await Promise.all(rebuildPromises);

    console.log(`Updated ${affectedManagers.size} team trees`);
    return null;
  });

/**
 * Rebuild all teamTrees (admin utility).
 */
exports.rebuildAllTeamTrees = functions.https.onRequest(async (req, res) => {
  try {
    const firestore = admin.firestore();
    const employeesSnapshot = await firestore.collection('employees').get();

    const managers = new Set();
    employeesSnapshot.docs.forEach(doc => {
      const emp = doc.data();
      if (emp.manager_id) {
        managers.add(emp.manager_id);
      }
    });

    console.log(`Found ${managers.size} managers`);

    const results = [];
    for (const managerId of managers) {
      try {
        await buildTeamTreeSync(managerId);
        results.push({ managerId, status: 'success' });
      } catch (error) {
        results.push({ managerId, status: 'error', error: error.message });
      }
    }

    res.json({
      success: true,
      managersProcessed: managers.size,
      results
    });

  } catch (error) {
    console.error('rebuildAllTeamTrees error:', error);
    res.status(500).json({ error: error.message });
  }
});
