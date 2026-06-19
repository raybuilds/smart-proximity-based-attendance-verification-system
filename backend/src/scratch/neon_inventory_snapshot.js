const { PrismaClient } = require("@prisma/client");
const connectionString = "postgresql://neondb_owner:npg_EXGRzWDFK01k@ep-misty-base-aqo6i25n-pooler.c-8.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

async function main() {
  process.env.DATABASE_URL = connectionString;
  const prisma = new PrismaClient();

  try {
    console.log("=== NEON PRODUCTION DATABASE - INVENTORY SNAPSHOT ===");
    
    // User counts
    const users = await prisma.user.count();
    const students = await prisma.student.count();
    const teachers = await prisma.teacher.count();

    // Course counts
    const courses = await prisma.course.count();

    // Attendance counts
    const proximity = await prisma.usedProximityToken.count();
    const qr = await prisma.sessionQRCode.count();
    const corrections = await prisma.attendanceCorrection.count();
    const attendance = await prisma.attendance.count();
    const sessions = await prisma.attendanceSession.count();

    console.log(`- User:                 ${users}`);
    console.log(`- Student:              ${students}`);
    console.log(`- Teacher:              ${teachers}`);
    console.log(`- Course:               ${courses}`);
    console.log(`- UsedProximityToken:   ${proximity}`);
    console.log(`- SessionQRCode:        ${qr}`);
    console.log(`- AttendanceCorrection: ${corrections}`);
    console.log(`- Attendance:           ${attendance}`);
    console.log(`- AttendanceSession:    ${sessions}`);
    console.log("=====================================================");

  } catch (error) {
    console.error("Inventory failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
