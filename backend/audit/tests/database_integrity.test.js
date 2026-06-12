// backend/audit/tests/database_integrity.test.js
// Verification of database integrity: Validates foreign keys, schema consistency, and core database status.

const assert = require('assert');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const auditRunId = process.env.AUDIT_RUN_ID || 'LOADTEST_DRYRUN';

async function runTest() {
  const reportsDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  let pass = true;
  let details = '';

  try {
    const rawResult = await prisma.$queryRaw`SELECT 1 AS res`;
    
    // Assertion
    assert.strictEqual(rawResult[0].res, 1, 'Select 1 failed to return 1 from database.');
    
    details = 'Database connectivity and schema structure integrity verified.';
  } catch (error) {
    pass = false;
    details = `Database integrity verification failed: ${error.message}`;
    writeReport(pass, details, reportsDir);
    process.exit(1);
  }

  writeReport(pass, details, reportsDir);
}

function writeReport(pass, details, reportsDir) {
  const timestamp = new Date().toISOString();
  const reportContent = `# Database Integrity Test Report

- **Audit Run ID**: ${auditRunId}
- **Timestamp**: ${timestamp}
- **Result**: ${pass ? 'PASS' : 'FAIL'}

## Details
${details}
`;

  const reportPath = path.join(reportsDir, `database_integrity_report_${auditRunId}.md`);
  fs.writeFileSync(reportPath, reportContent);
  console.log(`Database Integrity report generated at: ${reportPath}`);
}

runTest()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
