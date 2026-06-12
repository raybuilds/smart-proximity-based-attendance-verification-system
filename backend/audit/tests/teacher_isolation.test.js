// backend/audit/tests/teacher_isolation.test.js
// Verification of teacher data isolation: Ensures no cross-teacher data leakage.

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

  // Load manifest if not dry-run
  let manifest = null;
  if (auditRunId !== 'LOADTEST_DRYRUN') {
    const manifestPath = path.join(__dirname, '..', 'reports', `audit_seed_manifest_${auditRunId}.json`);
    if (!fs.existsSync(manifestPath)) {
      console.error(`Error: Seed manifest not found at ${manifestPath}`);
      process.exit(1);
    }
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }

  try {
    const sessions = await prisma.attendanceSession.findMany({
      include: {
        teacher: true,
        course: true
      }
    });

    let mismatches = 0;
    for (const session of sessions) {
      if (session.course && session.course.teacherId !== session.teacherId) {
        const teacherUser = await prisma.user.findUnique({
          where: { id: session.teacherId },
          include: { teacher: true }
        });
        if (teacherUser && teacherUser.teacher && teacherUser.teacher.id !== session.course.teacherId) {
          mismatches++;
        }
      }
    }

    assert.strictEqual(mismatches, 0, `Detected ${mismatches} session-to-course teacher mismatch(es).`);
    details = 'All sessions map correctly to courses with matching teacher ownership. No data leakage detected.';
  } catch (error) {
    pass = false;
    details = `Teacher Isolation Check Failed: ${error.message}`;
    writeReport(pass, details, reportsDir);
    process.exit(1);
  }

  writeReport(pass, details, reportsDir);
}

function writeReport(pass, details, reportsDir) {
  const timestamp = new Date().toISOString();
  const reportContent = `# Teacher Isolation Test Report

- **Audit Run ID**: ${auditRunId}
- **Timestamp**: ${timestamp}
- **Result**: ${pass ? 'PASS' : 'FAIL'}

## Details
${details}
`;

  const reportPath = path.join(reportsDir, `teacher_isolation_report_${auditRunId}.md`);
  fs.writeFileSync(reportPath, reportContent);
  console.log(`Teacher Isolation report generated at: ${reportPath}`);
}

runTest()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
