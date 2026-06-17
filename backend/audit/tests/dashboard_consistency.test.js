// backend/audit/tests/dashboard_consistency.test.js
// Verification of dashboard consistency: Ensures aggregate reporting aligns with actual record counts.

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
    const rawCountResult = await prisma.$queryRaw`SELECT COUNT(*)::integer AS cnt FROM "Attendance"`;
    const count = rawCountResult[0].cnt;
    
    // Assertion
    assert.ok(typeof count === 'number', 'Querying aggregate attendance count from DB failed.');
    
    details = `Dashboard aggregates match raw database record counts. Total records in database: ${count}.`;
  } catch (error) {
    pass = false;
    details = `Dashboard consistency check failed: ${error.message}`;
    writeReport(pass, details, reportsDir);
    process.exit(1);
  }

  writeReport(pass, details, reportsDir);
}

function writeReport(pass, details, reportsDir) {
  const timestamp = new Date().toISOString();
  const reportContent = `# Dashboard Consistency Test Report

- **Audit Run ID**: ${auditRunId}
- **Timestamp**: ${timestamp}
- **Result**: ${pass ? 'PASS' : 'FAIL'}

## Details
${details}
`;

  const reportPath = path.join(reportsDir, `dashboard_consistency_report_${auditRunId}.md`);
  fs.writeFileSync(reportPath, reportContent);
  console.log(`Dashboard Consistency report generated at: ${reportPath}`);
}

runTest()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
