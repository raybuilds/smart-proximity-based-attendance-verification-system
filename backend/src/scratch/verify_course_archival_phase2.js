const assert = require("assert");
const { prisma } = require("../config/database");
const adminService = require("../modules/admin/admin.service");
const coursesService = require("../modules/courses/courses.service");
const reportsService = require("../modules/reports/reports.service");

async function runVerification() {
  console.log("=== STARTING ADMIN MODULE PHASE 3: COURSE ARCHIVAL VERIFICATION ===\n");

  const results = [];
  const logTest = (name, status, details = "") => {
    results.push({ name, status, details });
    console.log(`[${status}] ${name} ${details ? "- " + details : ""}`);
  };

  let teacherUser, studentUser, course;

  try {
    // 1. Resolve test entities
    teacherUser = await prisma.user.findFirst({
      where: { role: "teacher" },
      include: { teacher: true }
    });
    if (!teacherUser || !teacherUser.teacher) {
      throw new Error("No teacher found for test seeding.");
    }

    studentUser = await prisma.user.findFirst({
      where: { role: "student" },
      include: { student: true }
    });
    if (!studentUser || !studentUser.student) {
      throw new Error("No student found for test seeding.");
    }

    // 2. Create clean course
    course = await prisma.course.create({
      data: {
        code: `ARCH_${Date.now()}`,
        name: "Test Archival Course",
        department: "Computer Science",
        semester: 6,
        section: "A",
        teacherId: teacherUser.teacher.id
      }
    });

    console.log("--- TEST 1: Active Session Restriction ---");
    // Create temporary teacher to avoid active session constraints
    const tempTeacherUser = await prisma.user.create({
      data: {
        name: "Temp Archival Teacher",
        email: `temp_arch_teach_${Date.now()}@attendance.local`,
        passwordHash: "dummy",
        role: "teacher",
        isActive: true
      }
    });
    const tempTeacher = await prisma.teacher.create({
      data: {
        userId: tempTeacherUser.id,
        employeeId: `EMP_ARCH_${Date.now()}`,
        department: "Computer Science"
      }
    });

    // Create an active session
    const activeSession = await prisma.attendanceSession.create({
      data: {
        sessionCode: `SESS_${Date.now()}`,
        courseId: course.id,
        teacherId: tempTeacherUser.id,
        isActive: true,
        departmentSnapshot: "Computer Science",
        semesterSnapshot: 6,
        sectionSnapshot: "A"
      }
    });

    // Try to archive and assert failure
    await assert.rejects(
      adminService.archiveCourse(course.id),
      /Cannot archive a course with an active attendance session/,
      "Expected archiving to fail when active session exists"
    );
    logTest("Active Session Restriction", "PASS");

    // Clean up active session and temp teacher
    await prisma.attendanceSession.delete({ where: { id: activeSession.id } });
    await prisma.teacher.delete({ where: { id: tempTeacher.id } });
    await prisma.user.delete({ where: { id: tempTeacherUser.id } });

    console.log("\n--- TEST 2: Archive Course ---");
    const archivedCourse = await adminService.archiveCourse(course.id);
    assert.strictEqual(archivedCourse.isArchived, true, "Course should be marked archived");
    assert.ok(archivedCourse.archivedAt instanceof Date, "archivedAt should be set");
    logTest("Archive Course Status Update", "PASS");

    console.log("\n--- TEST 3: Teacher Queries Exclude Archived Courses ---");
    const teacherCourses = await coursesService.getCourses(teacherUser.id, false);
    const hasArchivedCourse = teacherCourses.some(c => c.id === course.id);
    assert.strictEqual(hasArchivedCourse, false, "getCourses should exclude archived course");

    const teacherDashboard = await reportsService.getTeacherDashboard(teacherUser.id, "7d");
    // Ensure dashboard reports don't include it
    assert.strictEqual(teacherDashboard.activeCourses, teacherCourses.length, "Dashboard active courses count mismatch");
    logTest("Teacher Query Restrictions", "PASS");

    console.log("\n--- TEST 4: Student Attendance History Still Works ---");
    // Seed attendance record for archived course session
    const pastSession = await prisma.attendanceSession.create({
      data: {
        sessionCode: `PAST_${Date.now()}`,
        courseId: course.id,
        teacherId: teacherUser.id,
        isActive: false,
        startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endedAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
        departmentSnapshot: "Computer Science",
        semesterSnapshot: 6,
        sectionSnapshot: "A"
      }
    });
    const attendanceRecord = await prisma.attendance.create({
      data: {
        studentId: studentUser.id,
        sessionId: pastSession.id,
        status: "present",
        method: "QR",
        verificationMethod: "proximity",
        markedAt: new Date()
      }
    });

    const studentReport = await reportsService.getStudentCoursesReport(studentUser.id);
    const hasArchivedAttendance = studentReport.courses.some(c => c.courseId === course.id);
    assert.strictEqual(hasArchivedAttendance, true, "Student should still see historical attendance for archived course");
    logTest("Student Historical Attendance Visibility", "PASS");

    console.log("\n--- TEST 5: Archived List & Detail ---");
    const archivedList = await adminService.getArchivedCourses();
    const listContains = archivedList.some(c => c.courseId === course.id);
    assert.strictEqual(listContains, true, "Archived courses list should contain the course");

    const detail = await adminService.getArchivedCourseDetail(course.id);
    assert.strictEqual(detail.course.id, course.id);
    assert.strictEqual(detail.course.isArchived, true);
    assert.ok(Array.isArray(detail.recentSessions));
    assert.ok(Array.isArray(detail.recentCorrections));
    logTest("Archived Course List & Details API", "PASS");

    console.log("\n--- TEST 6: Restore Course ---");
    const restoredCourse = await adminService.restoreCourse(course.id);
    assert.strictEqual(restoredCourse.isArchived, false, "Course should no longer be marked archived");
    assert.strictEqual(restoredCourse.archivedAt, null, "archivedAt should be cleared");
    logTest("Restore Course Status Update", "PASS");

    // Clean up
    await prisma.attendance.delete({ where: { id: attendanceRecord.id } });
    await prisma.attendanceSession.delete({ where: { id: pastSession.id } });
    await prisma.course.delete({ where: { id: course.id } });

    console.log("\n==================================================");
    console.log("             FINAL PASS/FAIL REPORT               ");
    console.log("==================================================");
    results.forEach(r => {
      console.log(`[${r.status}] ${r.name}`);
    });
    console.log("--------------------------------------------------");
    console.log(`TOTAL: ${results.length} | PASSED: ${results.filter(r => r.status === "PASS").length} | FAILED: 0`);
    console.log("==================================================");
    console.log("✓ Course Archival & Historical Records Verification passed successfully!");
  } catch (error) {
    console.error("\n❌ Verification script threw error:", error);
    // Attempt cleanup
    try {
      if (course?.id) {
        await prisma.course.deleteMany({ where: { id: course.id } });
      }
    } catch (e) {}
    process.exit(1);
  }
}

runVerification();
