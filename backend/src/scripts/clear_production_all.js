const { PrismaClient } = require("@prisma/client");
const connectionString = "postgresql://neondb_owner:npg_EXGRzWDFK01k@ep-misty-base-aqo6i25n-pooler.c-8.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

async function main() {
  console.log("==================================================");
  console.log("    NEON PRODUCTION DATABASE - COMPLETE WIPE      ");
  console.log("==================================================");

  process.env.DATABASE_URL = connectionString;
  const prisma = new PrismaClient();

  try {
    console.log("Executing cascading deletes in dependency order...");
    
    // 1. Runtime / Logs Data
    const delProximity = await prisma.usedProximityToken.deleteMany({});
    console.log(`✔ Deleted ${delProximity.count} UsedProximityTokens`);

    const delCorrection = await prisma.attendanceCorrection.deleteMany({});
    console.log(`✔ Deleted ${delCorrection.count} AttendanceCorrections`);

    const delAttendance = await prisma.attendance.deleteMany({});
    console.log(`✔ Deleted ${delAttendance.count} Attendances`);

    const delQRCode = await prisma.sessionQRCode.deleteMany({});
    console.log(`✔ Deleted ${delQRCode.count} SessionQRCodes`);

    const delSession = await prisma.attendanceSession.deleteMany({});
    console.log(`✔ Deleted ${delSession.count} AttendanceSessions`);

    // 2. Master Academic Data
    const delCourse = await prisma.course.deleteMany({});
    console.log(`✔ Deleted ${delCourse.count} Courses`);

    const delStudent = await prisma.student.deleteMany({});
    console.log(`✔ Deleted ${delStudent.count} Students`);

    const delTeacher = await prisma.teacher.deleteMany({});
    console.log(`✔ Deleted ${delTeacher.count} Teachers`);

    const delUser = await prisma.user.deleteMany({});
    console.log(`✔ Deleted ${delUser.count} Users`);

    console.log("--------------------------------------------------");

    // 3. Post-wipe verification checks
    const users = await prisma.user.count();
    const students = await prisma.student.count();
    const teachers = await prisma.teacher.count();
    const courses = await prisma.course.count();
    const proximity = await prisma.usedProximityToken.count();
    const qr = await prisma.sessionQRCode.count();
    const corrections = await prisma.attendanceCorrection.count();
    const attendance = await prisma.attendance.count();
    const sessions = await prisma.attendanceSession.count();

    console.log("Post-Wipe Records Counts:");
    console.log(`- User:                 ${users}`);
    console.log(`- Student:              ${students}`);
    console.log(`- Teacher:              ${teachers}`);
    console.log(`- Course:               ${courses}`);
    console.log(`- UsedProximityToken:   ${proximity}`);
    console.log(`- SessionQRCode:        ${qr}`);
    console.log(`- AttendanceCorrection: ${corrections}`);
    console.log(`- Attendance:           ${attendance}`);
    console.log(`- AttendanceSession:    ${sessions}`);

    if (users > 0 || courses > 0 || attendance > 0) {
      throw new Error("Wipe validation failed! Rows still exist in tables.");
    }

    console.log("==================================================");
    console.log("STATUS: SUCCESSFUL FULL PRODUCTION DATABASE WIPE");
    console.log("==================================================");

  } catch (error) {
    console.error("Casading wipe process failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
