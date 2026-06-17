// backend/audit/pre_audit_snapshot.js
// Capture baseline snapshot of core tables before audit run.

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function getTableStats(tableName) {
  const countResult = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS count FROM "${tableName}"`);
  const minIdResult = await prisma.$queryRawUnsafe(`SELECT MIN(id) AS minId FROM "${tableName}"`);
  const maxIdResult = await prisma.$queryRawUnsafe(`SELECT MAX(id) AS maxId FROM "${tableName}"`);
  const latestResult = await prisma.$queryRawUnsafe(`SELECT MAX("createdAt") AS latestCreatedAt FROM "${tableName}"`);
  return {
    count: Number(countResult[0].count),
    minId: minIdResult[0].minId ? Number(minIdResult[0].minId) : null,
    maxId: maxIdResult[0].maxId ? Number(maxIdResult[0].maxId) : null,
    latestCreatedAt: latestResult[0].latestCreatedAt ? latestResult[0].latestCreatedAt.toISOString() : null,
  };
}

async function main() {
  const auditRunId = process.env.AUDIT_RUN_ID;
  if (!auditRunId) {
    console.error('AUDIT_RUN_ID not set');
    process.exit(1);
  }
  const tables = ['Attendance', 'Course', 'AttendanceSession', 'UsedProximityToken'];
  const snapshot = { auditRunId, branchName: process.env.LOAD_TEST_BRANCH || null, tables: {} };
  for (const tbl of tables) {
    snapshot.tables[tbl] = await getTableStats(tbl);
  }
  const snapshotsDir = path.resolve(__dirname, 'snapshots');
  if (!fs.existsSync(snapshotsDir)) {
    fs.mkdirSync(snapshotsDir, { recursive: true });
  }
  const filePath = path.join(snapshotsDir, `${auditRunId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
  console.log(`Snapshot saved to ${filePath}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
