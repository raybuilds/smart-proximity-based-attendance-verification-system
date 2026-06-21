const assert = require("assert");
const { prisma } = require("../config/database");
const authService = require("../modules/auth/auth.service");
const coursesService = require("../modules/courses/courses.service");

async function runScenarioTests() {
  console.log("=== STARTING SYSTEM INTEGRITY SCENARIO TESTS ===\n");

  try {
    // Scenario 3: Admin exists, attempt second admin creation
    console.log("--- SCENARIO 3: Single Admin Enforcement ---");
    // Ensure at least one admin exists
    const adminUser = await prisma.user.findFirst({
      where: { role: "admin" },
    });
    if (!adminUser) {
      await prisma.user.create({
        data: {
          name: "System Admin",
          email: "admin@attendance.local",
          passwordHash: "dummy",
          role: "admin",
        },
      });
    }

    try {
      await authService.registerUser({
        name: "Second Admin",
        email: "second_admin@attendance.local",
        password: "Password@123",
        role: "admin",
        department: "Computer Science",
      });
      assert.fail("Should have failed to register second admin account");
    } catch (error) {
      assert.strictEqual(error.message, "Administrator account already exists.");
      console.log("[PASS] Scenario 3: Secondary Admin Registration Rejected Successfully.");
    }

    // Scenario 1: Course contains 2 sessions, new student added -> backfilled with AUTO_ABSENT
    console.log("\n--- SCENARIO 1: Student Registration Backfill ---");
    const teacherUser = await prisma.user.findFirst({
      where: { role: "teacher" },
      include: { teacher: true },
    });

    const uniqueSuffix = Date.now();
    // Create new course
    const course = await prisma.course.create({
      data: {
        code: `BACK_${uniqueSuffix}`,
        name: `Backfill Course ${uniqueSuffix}`,
        department: `DEPT_${uniqueSuffix}`,
        semester: 1,
        section: "X",
        teacherId: teacherUser.teacher.id,
      },
    });

    // Conduct 2 sessions
    const session1 = await prisma.attendanceSession.create({
      data: {
        sessionCode: `S1_${uniqueSuffix}`,
        courseId: course.id,
        teacherId: teacherUser.id,
        isActive: false,
        departmentSnapshot: `DEPT_${uniqueSuffix}`,
        semesterSnapshot: 1,
        sectionSnapshot: "X",
      },
    });

    const session2 = await prisma.attendanceSession.create({
      data: {
        sessionCode: `S2_${uniqueSuffix}`,
        courseId: course.id,
        teacherId: teacherUser.id,
        isActive: false,
        departmentSnapshot: `DEPT_${uniqueSuffix}`,
        semesterSnapshot: 1,
        sectionSnapshot: "X",
      },
    });

    // Now register a new student matching course criteria
    const newStudentEmail = `new_student_${uniqueSuffix}@attendance.local`;
    const newStudentRoll = `ROLL_${uniqueSuffix}`;
    const result = await authService.registerUser({
      name: "New Backfill Student",
      email: newStudentEmail,
      password: "Password@123",
      role: "student",
      rollNumber: newStudentRoll,
      department: `DEPT_${uniqueSuffix}`,
      semester: 1,
      section: "X",
    });

    // Check attendance records generated
    const newStudentUser = result.user;
    const records = await prisma.attendance.findMany({
      where: { studentId: newStudentUser.id },
    });

    assert.strictEqual(records.length, 2, "Should create exactly 2 backfilled attendance records");
    assert.ok(records.every((r) => r.status === "absent"), "All backfilled records should be absent");
    assert.ok(records.every((r) => r.method === "AUTO_ABSENT"), "All backfilled records should have method='AUTO_ABSENT'");
    console.log("[PASS] Scenario 1: Historical attendance sessions backfilled with AUTO_ABSENT successfully.");

    // Scenario 2: Student already has records, no duplicates created
    console.log("\n--- SCENARIO 2: Idempotent Backfill Prevention ---");
    // Trigger backfill again
    const { backfillStudentAttendance } = require("../modules/attendance/backfill.service");
    await prisma.$transaction(async (tx) => {
      const studentProfile = await tx.student.findUnique({
        where: { rollNumber: newStudentRoll },
      });
      await backfillStudentAttendance(tx, studentProfile);
    });

    const recordsAfterDuplicateTrigger = await prisma.attendance.findMany({
      where: { studentId: newStudentUser.id },
    });
    assert.strictEqual(recordsAfterDuplicateTrigger.length, 2, "Should not create duplicate attendance records");
    console.log("[PASS] Scenario 2: Duplicate check-in checks verified, idempotent backfill validated.");

    // Cleanup
    await prisma.attendance.deleteMany({
      where: { studentId: newStudentUser.id },
    });
    await prisma.student.delete({
      where: { rollNumber: newStudentRoll },
    });
    await prisma.user.delete({
      where: { email: newStudentEmail },
    });
    await prisma.attendanceSession.deleteMany({
      where: { id: { in: [session1.id, session2.id] } },
    });
    await prisma.course.delete({
      where: { id: course.id },
    });

    console.log("\n=== ALL SCENARIO TESTS PASSED SUCCESSFULLY ===");
  } catch (err) {
    console.error("\n❌ Scenario verification threw error:", err);
    process.exit(1);
  }
}

runScenarioTests();
