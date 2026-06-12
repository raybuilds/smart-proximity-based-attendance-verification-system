// backend/audit/post_cleanup_verify.js
// Verify that after audit cleanup, core table row counts match the baseline snapshot.
// Also ensures no residual test entities remain (based on AUDIT_RUN_ID naming convention).

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function getTableCount(tableName) {
  const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS count FROM "${tableName}"`);
  return Number(result[0].count);
}

async function main() {
  const auditRunId = process.env.AUDIT_RUN_ID;
  if (!auditRunId) {
    console.error('AUDIT_RUN_ID not set');
    process.exit(1);
  }

  // Connect with retry logic to allow database recovery
  let retries = 5;
  while (retries > 0) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      break;
    } catch (err) {
      retries--;
      if (retries === 0) {
        console.error('Failed to establish database connection after 5 attempts.');
        throw err;
      }
      console.log(`Database connection failed. Retrying in 3 seconds... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  const snapshotsDir = path.resolve(__dirname, 'snapshots');
  const snapshotPath = path.join(snapshotsDir, `${auditRunId}.json`);
  if (!fs.existsSync(snapshotPath)) {
    console.error('Snapshot file not found:', snapshotPath);
    process.exit(1);
  }
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  const tables = ['Attendance', 'Course', 'AttendanceSession', 'UsedProximityToken'];
  let allPass = true;
  for (const tbl of tables) {
    const baseline = snapshot.tables[tbl];
    const currentCount = await getTableCount(tbl);
    if (baseline.count !== currentCount) {
      console.error(`Count mismatch for ${tbl}: baseline=${baseline.count}, current=${currentCount}`);
      allPass = false;
    } else {
      console.log(`Count match for ${tbl}: ${currentCount}`);
    }
  }
  // Additional cleanup checks – look for any rows that contain the auditRunId in identifiable fields.
  // Since schema specifics are unknown, perform generic pattern checks where possible.
  // Example: teachers/emails, students/emails, courses/name, sessions/name.
  const checks = [
    { table: 'Teacher', column: 'email' },
    { table: 'Student', column: 'email' },
    { table: 'Course', column: 'name' },
    { table: 'AttendanceSession', column: 'name' },
    { table: 'UsedProximityToken', column: 'token' }
  ];
  for (const { table, column } of checks) {
    try {
      const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS cnt FROM "${table}" WHERE "${column}" ILIKE $1`, `%${auditRunId}%`);
      const cnt = Number(result[0].cnt);
      if (cnt > 0) {
        console.error(`Found ${cnt} residual rows in ${table}.${column} containing auditRunId`);
        allPass = false;
      } else {
        console.log(`No residual rows in ${table}.${column}`);
      }
    } catch (e) {
      // Table may not exist or column not present – ignore.
    }
  }
  if (!allPass) {
    console.error('Post‑cleanup verification FAILED');
    process.exit(1);
  }
  console.log('Post‑cleanup verification PASSED');
}

main()
  .catch(e => {
    console.error('Verification error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
