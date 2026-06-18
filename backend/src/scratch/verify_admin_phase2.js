const assert = require("assert");
const { prisma } = require("../config/database");
const adminService = require("../modules/admin/admin.service");

async function runVerification() {
  console.log("=== STARTING ADMIN OVERSIGHT PHASE 2 VERIFICATION ===\n");

  const results = [];
  const logTest = (name, status, details = "") => {
    results.push({ name, status, details });
    console.log(`[${status}] ${name} ${details ? "- " + details : ""}`);
  };

  try {
    // 1. Setup clean course data / Resolve entities
    const teacherUser = await prisma.user.findFirst({
      where: { role: "teacher" },
      include: { teacher: true }
    });
    if (!teacherUser || !teacherUser.teacher) {
      throw new Error("No teacher found for test seeding.");
    }

    const studentUser = await prisma.user.findFirst({
      where: { role: "student" },
      include: { student: true }
    });
    if (!studentUser || !studentUser.student) {
      throw new Error("No student found for test seeding.");
    }

    // Create a new dummy course with 0 sessions
    const cleanCourse = await prisma.course.create({
      data: {
        code: `TEST_${Date.now()}`,
        name: "Test Zero Sessions Course",
        department: "Computer Science",
        semester: 4,
        section: "A",
        teacherId: teacherUser.id
      }
    });

    console.log("--- TEST 1: Course with Zero Sessions ---");
    const courses = await adminService.getAdminCourses();
    const targetCourse = courses.find(c => c.courseId === cleanCourse.id);
    assert.ok(targetCourse, "Should find the seeded course in courses list");
    assert.strictEqual(targetCourse.attendancePercentage, 100.0, "Average attendance should be 100.0% if 0 sessions");
    assert.strictEqual(targetCourse.activeSession, false, "Should not be active");

    const detail = await adminService.getAdminCourseDetail(cleanCourse.id);
    assert.strictEqual(detail.stats.averageAttendance, 100.0, "Average attendance should be 100.0% in detail as well");
    assert.strictEqual(detail.defaulters.length, 0, "Defaulters list should be empty");
    assert.strictEqual(detail.corrections.length, 0, "Corrections should be empty");
    assert.strictEqual(detail.sessions.length, 0, "Sessions should be empty");
    logTest("Course with 0 Sessions Edge Cases", "PASS");

    console.log("\n--- TEST 2: Active Session Duration (Age) ---");
    // Create a temporary teacher to avoid active session constraints
    const tempTeacherUser = await prisma.user.create({
      data: {
        name: "Temp Test Teacher Session Age",
        email: `temp_teach_age_${Date.now()}@attendance.local`,
        passwordHash: "dummy",
        role: "teacher",
        isActive: true
      }
    });
    const tempTeacher = await prisma.teacher.create({
      data: {
        userId: tempTeacherUser.id,
        employeeId: `EMP_AGE_${Date.now()}`,
        department: "Computer Science"
      }
    });

    const activeSession = await prisma.attendanceSession.create({
      data: {
        sessionCode: `LIV_${Date.now()}`,
        courseId: cleanCourse.id,
        teacherId: tempTeacherUser.id,
        startedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago
        endedAt: new Date(Date.now() + 45 * 60 * 1000),
        isActive: true,
        departmentSnapshot: "Computer Science",
        semesterSnapshot: 4,
        sectionSnapshot: "A"
      }
    });

    const liveSessions = await adminService.getAdminLiveSessions();
    const liveItem = liveSessions.find(s => s.sessionId === activeSession.id);
    assert.ok(liveItem, "Should find live session");
    assert.strictEqual(liveItem.durationMinutes, 15, "Duration minutes age should be approximately 15");
    logTest("Live Sessions Duration & Count Metrics", "PASS");

    console.log("\n--- TEST 3: At Risk Excludes Students with 0 Sessions ---");
    // Seed a new student with no attendance sessions at all (we need overall attendance calculated)
    const emptyStudentUser = await prisma.user.create({
      data: {
        name: "Clean Seed Student",
        email: `clean_stu_${Date.now()}@attendance.local`,
        passwordHash: "dummy",
        role: "student",
        isActive: true
      }
    });
    const emptyStudent = await prisma.student.create({
      data: {
        userId: emptyStudentUser.id,
        rollNumber: `ROLL_${Date.now()}`,
        department: "Electronics",
        semester: 2,
        section: "B"
      }
    });

    const atRisk = await adminService.getAdminAtRisk();
    const isAtRisk = atRisk.some(s => s.studentId === emptyStudent.id);
    assert.strictEqual(isAtRisk, false, "Students with 0 sessions should be excluded from At Risk list");
    logTest("At-Risk Exclude Zero-Session Student", "PASS");

    console.log("\n--- TEST 4: Paginated Manual Corrections ---");
    // Create a manual correction for the student
    const correction = await prisma.attendance.create({
      data: {
        studentId: studentUser.id,
        sessionId: activeSession.id,
        status: "present",
        method: "MANUAL",
        verificationMethod: "manual_input",
        correctionReason: "Network Issue",
        modifiedByTeacherId: teacherUser.id,
        markedAt: new Date()
      }
    });

    const paginated = await adminService.getAdminManualCorrections({ page: 1, limit: 1 });
    assert.ok(paginated.items.length <= 1, "Should obey pagination limit");
    assert.ok(paginated.totalRecords >= 1, "Should return total records");
    assert.ok(paginated.totalPages >= 1, "Should return total pages");
    assert.ok(typeof paginated.hasMore === "boolean", "Should return hasMore flag");
    logTest("Manual Corrections Paginated Audit Log", "PASS");

    console.log("\n--- TEST 5: Analytics & Correction Breakdown ---");
    const analytics = await adminService.getAdminAnalytics();
    assert.ok(analytics.bestCourse !== undefined);
    assert.ok(analytics.worstCourse !== undefined);
    assert.ok(analytics.manualCorrectionBreakdown["Network Issue"] >= 1, "Should capture Network Issue correction count");
    logTest("Institutional Analytics & Correction Reasons", "PASS");

    // Clean up
    await prisma.attendance.delete({ where: { id: correction.id } });
    await prisma.student.delete({ where: { id: emptyStudent.id } });
    await prisma.user.delete({ where: { id: emptyStudentUser.id } });
    await prisma.attendanceSession.delete({ where: { id: activeSession.id } });
    await prisma.teacher.delete({ where: { id: tempTeacher.id } });
    await prisma.user.delete({ where: { id: tempTeacherUser.id } });
    await prisma.course.delete({ where: { id: cleanCourse.id } });

    console.log("\n==================================================");
    console.log("             FINAL PASS/FAIL REPORT               ");
    console.log("==================================================");
    results.forEach(r => {
      console.log(`[${r.status}] ${r.name}`);
    });
    console.log("--------------------------------------------------");
    console.log(`TOTAL: ${results.length} | PASSED: ${results.filter(r => r.status === "PASS").length} | FAILED: 0`);
    console.log("==================================================");
    console.log("✓ All Phase 2 verification tests passed successfully!");
  } catch (error) {
    console.error("\n❌ Verification script threw error:", error);
    process.exit(1);
  }
}

runVerification();
