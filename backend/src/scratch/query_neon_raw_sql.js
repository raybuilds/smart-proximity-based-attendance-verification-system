const { PrismaClient } = require("@prisma/client");
const connectionString = "postgresql://neondb_owner:npg_EXGRzWDFK01k@ep-misty-base-aqo6i25n-pooler.c-8.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

async function main() {
  process.env.DATABASE_URL = connectionString;
  const prisma = new PrismaClient();

  try {
    console.log("=== Neon Postgres Raw Query Performance ===");
    
    const sessCount = await prisma.$queryRaw`SELECT COUNT(*)::int FROM "AttendanceSession";`;
    const attCount = await prisma.$queryRaw`SELECT COUNT(*)::int FROM "Attendance";`;
    const qrCount = await prisma.$queryRaw`SELECT COUNT(*)::int FROM "SessionQRCode";`;
    const corrCount = await prisma.$queryRaw`SELECT COUNT(*)::int FROM "AttendanceCorrection";`;

    console.log(`- SELECT COUNT(*) FROM "AttendanceSession"; ➔ ${sessCount[0].count}`);
    console.log(`- SELECT COUNT(*) FROM "Attendance";        ➔ ${attCount[0].count}`);
    console.log(`- SELECT COUNT(*) FROM "SessionQRCode";      ➔ ${qrCount[0].count}`);
    console.log(`- SELECT COUNT(*) FROM "AttendanceCorrection";➔ ${corrCount[0].count}`);

    // Fetch active session info
    const liveSessions = await prisma.$queryRaw`SELECT id, "sessionCode", "isActive" FROM "AttendanceSession" WHERE "isActive" = true;`;
    console.log("Active Sessions list:", JSON.stringify(liveSessions, null, 2));

  } catch (error) {
    console.error("Query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
