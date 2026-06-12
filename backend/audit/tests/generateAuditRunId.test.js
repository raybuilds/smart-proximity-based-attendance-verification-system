// backend/audit/tests/generateAuditRunId.test.js
// Unit tests for generateAuditRunId ensuring format correctness and character validity.
// No duplicate check is performed because collisions are probabilistic.

const assert = require('assert');
const { generateAuditRunId } = require('../generateAuditRunId');

// Regular expression for the required format: LOADTEST_YYYYMMDD_XXXXXX
// XXXXXX must be 6 uppercase alphanumeric characters.
const ID_REGEX = /^LOADTEST_[0-9]{8}_[A-Z0-9]{6}$/;

function runTests() {
  console.log('Running Audit Run ID Generator Tests (10,000 iterations)...');
  const iterations = 10000;
  const collisions = new Map(); // track collisions only for info
  
  for (let i = 0; i < iterations; i++) {
    const id = generateAuditRunId();
    
    // Verify overall format
    assert.ok(ID_REGEX.test(id), `ID does not match format: ${id}`);
    
    // Ensure no whitespace
    assert.strictEqual(/\s/.test(id), false, `ID contains whitespace: ${id}`);
    
    // Ensure characters after last underscore are uppercase alphanumeric only
    const suffix = id.split('_')[2];
    assert.ok(/^[A-Z0-9]{6}$/.test(suffix), `Suffix contains invalid characters: ${suffix}`);
    
    // Track collisions (informational only)
    collisions.set(id, (collisions.get(id) || 0) + 1);
  }

  // Report number of collisions for information
  const duplicateCount = Array.from(collisions.values()).filter(v => v > 1).length;
  console.log(`PASS: Generated ${iterations} IDs matching pattern ${ID_REGEX.toString()} with 0 formatting violations.`);
  console.log(`Informational: Detected ${duplicateCount} collision(s) in 10,000 generated IDs.`);
}

try {
  runTests();
} catch (error) {
  console.error('FAIL: Audit Run ID Unit Test failed!', error);
  process.exit(1);
}
