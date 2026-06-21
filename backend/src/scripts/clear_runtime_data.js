const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("==================================================");
  console.log("   ATTENDANCE SYSTEM - RUNTIME DATA CLEANUP       ");
  console.log("==================================================");

  try {
    // 1. Log Counts Before Deletions
    const preUsedProximityToken = await prisma.usedProximityToken.count();
    const preSessionQRCode = await prisma.sessionQRCode.count();
    const preAttendanceCorrection = await prisma.attendanceCorrection.count();
    const preAttendance = await prisma.attendance.count();
    const preAttendanceSession = await prisma.attendanceSession.count();

    console.log("Current Record Counts (Before Cleanup):");
    console.log(`- UsedProximityToken: ${preUsedProximityToken}`);
    console.log(`- SessionQRCode:      ${preSessionQRCode}`);
    console.log(`- AttendanceCorrection: ${preAttendanceCorrection}`);
    console.log(`- Attendance:         ${preAttendance}`);
    console.log(`- AttendanceSession:  ${preAttendanceSession}`);
    console.log("--------------------------------------------------");

    // 2. Perform Deletions in Safe Dependency Order
    // Order:
    // a. UsedProximityToken (Independent)
    // b. AttendanceCorrection (Depends on Attendance)
    // c. Attendance (Depends on AttendanceSession)
    // d. SessionQRCode (Depends on AttendanceSession)
    // e. AttendanceSession (Root dependency)

    console.log("Executing deletions...");
    
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

    console.log("--------------------------------------------------");

    // 3. Log Counts After Deletions
    const postUsedProximityToken = await prisma.usedProximityToken.count();
    const postSessionQRCode = await prisma.sessionQRCode.count();
    const postAttendanceCorrection = await prisma.attendanceCorrection.count();
    const postAttendance = await prisma.attendance.count();
    const postAttendanceSession = await prisma.attendanceSession.count();

    console.log("Record Counts (After Cleanup):");
    console.log(`- UsedProximityToken: ${postUsedProximityToken}`);
    console.log(`- SessionQRCode:      ${postSessionQRCode}`);
    console.log(`- AttendanceCorrection: ${postAttendanceCorrection}`);
    console.log(`- Attendance:         ${postAttendance}`);
    console.log(`- AttendanceSession:  ${postAttendanceSession}`);
    console.log("--------------------------------------------------");

    // 4. Verify Demo Accounts and Course Structure Integrity
    const usersCount = await prisma.user.count();
    const coursesCount = await prisma.course.count();
    const studentProfiles = await prisma.student.count();
    const teacherProfiles = await prisma.teacher.count();

    console.log("Infrastructure Verification:");
    console.log(`- Total User Accounts: ${usersCount}`);
    console.log(`- Total Active/Archived Courses: ${coursesCount}`);
    console.log(`- Student Profiles: ${studentProfiles}`);
    console.log(`- Teacher Profiles: ${teacherProfiles}`);

    // Verify specifically seeded profiles exist
    const adminUser = await prisma.user.findUnique({ where: { email: "admin@attendance.local" } });
    const teacherUser = await prisma.user.findUnique({ where: { email: "teacher@attendance.local" } });
    const studentUser = await prisma.user.findUnique({ where: { email: "student@attendance.local" } });

    console.log("Demo Environment Profiles:");
    console.log(`- admin@attendance.local:   ${adminUser ? "PRESERVED ✓" : "MISSING ✗"}`);
    console.log(`- teacher@attendance.local: ${teacherUser ? "PRESERVED ✓" : "MISSING ✗"}`);
    console.log(`- student@attendance.local: ${studentUser ? "PRESERVED ✓" : "MISSING ✗"}`);

    if (!adminUser || !teacherUser || !studentUser) {
      throw new Error("Demo environments seed profile check failed!");
    }

    console.log("==================================================");
    console.log("STATUS: SUCCESSFUL DEMO SYSTEM REINITIALIZATION");
    console.log("==================================================");

  } catch (error) {
    console.error("Cleanup process encountered an error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
