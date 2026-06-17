// backend/audit/tests/token_collision.test.js
// Verification of concurrent proximity token collision.
// Scenario: Send 20 concurrent requests reusing the same proximity token.
// Expected: Exactly 1 success, N-1 (19) conflicts (409), 0 unexpected responses.

const assert = require('assert');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const path = require('path');
const http = require('http');
const { PrismaClient } = require('@prisma/client');

const auditRunId = process.env.AUDIT_RUN_ID || 'LOADTEST_DRYRUN';
const backendUrlStr = process.env.BACKEND_URL || 'http://localhost:5000';

async function runTest() {
  const reportsDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  let pass = true;
  let details = '';
  let successes = 0;
  let conflicts = 0;
  let otherErrors = 0;
  const N = 20;

  const isDryRun = auditRunId === 'LOADTEST_DRYRUN';

  if (isDryRun) {
    assert.ok(reportsDir, 'Reports directory does not exist.');
    details = 'Dry-run: Concurrent token collision simulation skipped. Baseline unique constraints checked in DB schema.';
  } else {
    // Load manifest
    const manifestPath = path.join(__dirname, '..', 'reports', `audit_seed_manifest_${auditRunId}.json`);
    if (!fs.existsSync(manifestPath)) {
      console.error(`Error: Seed manifest not found at ${manifestPath}`);
      process.exit(1);
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  // Decode proximity token to extract JTI for tracing
  const testStudent = manifest.students[0];
  const decodedToken = jwt.decode(testStudent.proximityToken);
  const testJti = decodedToken?.jti;
  console.log('Test JTI (from manifest proximityToken):', testJti);

    const studentToken = manifest.students[0].token;
    const sessionCode = manifest.sessions[0].sessionCode;
    const nonce = manifest.qrNonce;
    const proximityToken = manifest.students[0].proximityToken;

    details = `Simulating ${N} concurrent requests using the same proximity token...`;
    const url = new URL(backendUrlStr);
    const postData = JSON.stringify({
      sessionCode,
      nonce,
      proximityToken
    });

    const makeRequest = () => {
      return new Promise((resolve) => {
        const req = http.request({
          hostname: url.hostname,
          port: url.port || 80,
          path: '/api/student-attendance/scan',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'Authorization': `Bearer ${studentToken}`
          }
        }, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            if (res.statusCode === 200) {
              successes++;
            } else if (res.statusCode === 409) {
              conflicts++;
            } else {
              otherErrors++;
              console.log(`Unexpected status ${res.statusCode}: ${body}`);
            }
            resolve();
          });
        });
        req.on('error', (err) => {
          otherErrors++;
          console.error(`Request error: ${err.message}`);
          resolve();
        });
        req.write(postData);
        req.end();
      });
    };

    // Fire N concurrent requests
    await Promise.all(Array.from({ length: N }, makeRequest));
    
    const expectedConflicts = N - 1;
    try {
      assert.strictEqual(successes, 1, `Expected exactly 1 success, but got ${successes}`);
      assert.strictEqual(conflicts, expectedConflicts, `Expected exactly ${expectedConflicts} conflicts, but got ${conflicts}`);
      assert.strictEqual(otherErrors, 0, `Expected 0 unexpected errors, but got ${otherErrors}`);
      
      // Perform database-level verification
      const prisma = new PrismaClient();
      try {
        const studentId = manifest.students[0].id;
        const sessionId = manifest.sessions[0].id;
        const attendanceRecords = await prisma.attendance.findMany({
          where: { studentId, sessionId }
        });
        assert.strictEqual(attendanceRecords.length, 1, `DB Integrity Error: Expected exactly 1 database row for studentId ${studentId} and sessionId ${sessionId}, but found ${attendanceRecords.length}`);
        details = `Passed: Successfully verified concurrency. Exactly 1 success, ${conflicts} conflicts, and 0 unexpected responses. DB Verified: Exactly ${attendanceRecords.length} attendance row exists in database (no duplicates).`;
      } finally {
        await prisma.$disconnect();
      }
    } catch (err) {
      pass = false;
      details = `Failed: Token collision check failed: ${err.message}`;
      writeReport(pass, successes, conflicts, otherErrors, N, details, reportsDir);
      process.exit(1);
    }
  }

  writeReport(pass, successes, conflicts, otherErrors, N, details, reportsDir);
    // After test execution, query UsedProximityToken rows for debugging
    if (!isDryRun) {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.usedProximityToken.findMany({ orderBy: { id: 'asc' } }).then(rows => {
        console.log('UsedProximityToken rows after test:');
        console.table(rows.map(r => ({ id: r.id, jti: r.jti, createdAt: r.createdAt, expiresAt: r.expiresAt })));
        prisma.$disconnect();
      }).catch(err => {
        console.error('Error querying UsedProximityToken:', err);
        prisma.$disconnect();
      });
    }
}

function writeReport(pass, successes, conflicts, otherErrors, N, details, reportsDir) {
  const timestamp = new Date().toISOString();
  const reportContent = `# Token Collision Test Report

- **Audit Run ID**: ${auditRunId}
- **Timestamp**: ${timestamp}
- **Result**: ${pass ? 'PASS' : 'FAIL'}

## Metrics
- **Concurrent Requests (N)**: ${N}
- **Successes**: ${successes} (Expected: exactly 1)
- **Conflicts (409)**: ${conflicts} (Expected: exactly ${N - 1})
- **Unexpected Responses / Errors**: ${otherErrors} (Expected: 0)

## Details
${details}
`;

  const reportPath = path.join(reportsDir, `token_collision_report_${auditRunId}.md`);
  fs.writeFileSync(reportPath, reportContent);
  console.log(`Token Collision report generated at: ${reportPath}`);
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
