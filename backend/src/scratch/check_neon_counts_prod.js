const { PrismaClient } = require("@prisma/client");
const connectionString = "postgresql://neondb_owner:npg_EXGRzWDFK01k@ep-misty-base-aqo6i25n-pooler.c-8.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

async function run() {
  process.env.DATABASE_URL = connectionString;
  const prisma = new PrismaClient();
  try {
    const proximity = await prisma.usedProximityToken.count();
    const qr = await prisma.sessionQRCode.count();
    const corrections = await prisma.attendanceCorrection.count();
    const attendance = await prisma.attendance.count();
    const sessions = await prisma.attendanceSession.count();
    const users = await prisma.user.count();
    const courses = await prisma.course.count();

    console.log("Neon Production Database Counts:");
    console.log(`- UsedProximityToken: ${proximity}`);
    console.log(`- SessionQRCode:      ${qr}`);
    console.log(`- AttendanceCorrection: ${corrections}`);
    console.log(`- Attendance:         ${attendance}`);
    console.log(`- AttendanceSession:  ${sessions}`);
    console.log(`- User:               ${users}`);
    console.log(`- Course:             ${courses}`);
  } catch (err) {
    console.error("Error querying Neon:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
