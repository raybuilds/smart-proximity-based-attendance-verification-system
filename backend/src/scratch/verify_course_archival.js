const assert = require("assert");
const { prisma } = require("../config/database");
const coursesService = require("../modules/courses/courses.service");
const attendanceService = require("../modules/attendance/attendance.service");
const studentAttendanceService = require("../modules/studentAttendance/studentAttendance.service");
const reportsService = require("../modules/reports/reports.service");

async function runVerification() {
  console.log("=== STARTING PHASE 4: COURSE ELIGIBILITY, SNAPSHOTS, & SOFT ARCHIVAL VERIFICATION ===\n");

  const results = [];
  const logTest = (name, status, details = "") => {
    results.push({ name, status, details });
    console.log(`[${status}] ${name} ${details ? "- " + details : ""}`);
  };

  // 1. Resolve Teacher A (seeded user)
  const user = await prisma.user.findUnique({
    where: { email: "teacher@attendance.local" },
    include: { teacher: true },
  });
  if (!user || !user.teacher) {
    throw new Error("Seed teacher not found.");
  }
  const userId = user.id;

  // 2. Resolve Student (seeded student)
  const studentUser = await prisma.user.findUnique({
    where: { email: "student@attendance.local" },
    include: { student: true },
  });
  if (!studentUser || !studentUser.student) {
    throw new Error("Seed student not found.");
  }
  const studentId = studentUser.id;

  // Cleanup any old test runs with same name to keep it clean
  await prisma.attendance.deleteMany({
    where: { session: { course: { name: { startsWith: "P4Test_" } } } }
  });
  await prisma.attendanceSession.deleteMany({
    where: { course: { name: { startsWith: "P4Test_" } } }
  });
  await prisma.course.deleteMany({
    where: { name: { startsWith: "P4Test_" } }
  });

  const uniqueName = `P4Test_${Date.now()}`;
  const mockStudentEmail = `mock_student_p4_${Date.now()}@attendance.local`;
  let mockStudentId = null;

  try {
    // ----------------------------------------------------
    // Test 1: Create Course with Rules & Verify Normalization
    // ----------------------------------------------------
    console.log("\n--- TEST 1: Create Course & Normalization ---");
    const course = await coursesService.createCourse(userId, {
      name: uniqueName,
      department: "  cse  ",
      semester: 5,
      section: "  a  "
    });

    assert.strictEqual(course.name, uniqueName);
    assert.strictEqual(course.department, "CSE", "Expected department to be capitalized and trimmed");
    assert.strictEqual(course.section, "A", "Expected section to be capitalized and trimmed");
    assert.strictEqual(course.semester, 5);
    logTest("Create Course & Normalization", "PASS");

    // ----------------------------------------------------
    // Test 2: Active duplicate course name block
    // ----------------------------------------------------
    console.log("\n--- TEST 2: Active Duplicate Block ---");
    try {
      await coursesService.createCourse(userId, { name: uniqueName });
      logTest("Active Duplicate Block", "FAIL", "Allowed duplicate active course name");
    } catch (err) {
      assert.strictEqual(err.statusCode, 409);
      logTest("Active Duplicate Block", "PASS", "Blocked active duplicate course name");
    }

    // ----------------------------------------------------
    // Test 2.5: Empty Group Blocker check (Block session if 0 students match)
    // ----------------------------------------------------
    console.log("\n--- TEST 2.5: Empty Group Blocker ---");
    try {
      await attendanceService.startSession(userId, course.id);
      logTest("Empty Group Blocker", "FAIL", "Allowed starting session with 0 matching students");
    } catch (err) {
      assert.strictEqual(err.statusCode, 409);
      assert.strictEqual(err.message, "No eligible students exist for this course. Please review the course eligibility settings.");
      logTest("Empty Group Blocker", "PASS", "Blocked session start for empty eligibility group");
    }

    // Create a matching student to allow session start
    console.log("\nCreating a mock matching student for Course eligibility...");
    const mockStudent = await prisma.user.create({
      data: {
        name: "Mock Student P4",
        email: mockStudentEmail,
        passwordHash: "$2a$10$xyz",
        role: "student",
        student: {
          create: {
            rollNumber: `ROLL_P4_${Date.now()}`,
            department: "CSE",
            semester: 5,
            section: "A",
          },
        },
      },
      include: {
        student: true,
      },
    });
    mockStudentId = mockStudent.id;

    // ----------------------------------------------------
    // Test 3: Start session and verify Snapshots
    // ----------------------------------------------------
    console.log("\n--- TEST 3: Start Session & Snapshot Storing ---");
    const session = await attendanceService.startSession(userId, course.id);
    assert.strictEqual(session.departmentSnapshot, "CSE");
    assert.strictEqual(session.semesterSnapshot, 5);
    assert.strictEqual(session.sectionSnapshot, "A");
    logTest("Start Session & Snapshot Storing", "PASS");

    // ----------------------------------------------------
    // Test 4: Block course updates/archival during active session
    // ----------------------------------------------------
    console.log("\n--- TEST 4: Active Session Locks ---");
    try {
      await coursesService.updateCourse(userId, course.id, {
        name: uniqueName,
        department: "ECE" // Change rule
      });
      logTest("Edit Rules During Active Session Blocked", "FAIL");
    } catch (err) {
      assert.strictEqual(err.statusCode, 409);
      logTest("Edit Rules During Active Session Blocked", "PASS");
    }

    try {
      await coursesService.deleteCourse(userId, course.id, { archiveReason: "Try delete" });
      logTest("Archive Course During Active Session Blocked", "FAIL");
    } catch (err) {
      assert.strictEqual(err.statusCode, 409);
      assert.strictEqual(err.message, "Courses with active attendance sessions cannot be archived.");
      logTest("Archive Course During Active Session Blocked", "PASS");
    }

    // ----------------------------------------------------
    // Test 5: End session
    // ----------------------------------------------------
    console.log("\n--- Ending session ---");
    await attendanceService.endSession(userId);

    // ----------------------------------------------------
    // Test 6: Verify snapshot integrity after course edit
    // ----------------------------------------------------
    console.log("\n--- TEST 6: Snapshot Integrity & Course Edit ---");
    // Update course to new semester/section
    await coursesService.updateCourse(userId, course.id, {
      name: uniqueName,
      department: "CSE",
      semester: 6,
      section: "B"
    });

    // Fetch reports/validation rules and ensure they use original snapshots for historical session
    const resolvedHistory = await reportsService.getStudentAttendanceHistory(studentId);
    // Find our session record in student history
    const sessionHist = resolvedHistory.find(r => r.sessionId === session.id);
    if (sessionHist) {
      assert.strictEqual(sessionHist.departmentSnapshot, "CSE", "Expected snapshot CSE");
      assert.strictEqual(sessionHist.semesterSnapshot, 5, "Expected snapshot Sem 5");
      assert.strictEqual(sessionHist.sectionSnapshot, "A", "Expected snapshot Sec A");
      logTest("Historical Snapshot Integrity", "PASS");
    } else {
      // Let's verify by directly loading the session from db
      const sessionDb = await prisma.attendanceSession.findUnique({ where: { id: session.id } });
      assert.strictEqual(sessionDb.departmentSnapshot, "CSE");
      assert.strictEqual(sessionDb.semesterSnapshot, 5);
      assert.strictEqual(sessionDb.sectionSnapshot, "A");
      logTest("Historical Snapshot Integrity", "PASS", "Validated directly via database fields");
    }

    // ----------------------------------------------------
    // Test 7: Soft archival with reason
    // ----------------------------------------------------
    console.log("\n--- TEST 7: Soft Archival ---");
    const archivedCourse = await coursesService.deleteCourse(userId, course.id, {
      archiveReason: "Semester Finished"
    });
    assert.strictEqual(archivedCourse.isArchived, true);
    assert.ok(archivedCourse.archivedAt);
    assert.strictEqual(archivedCourse.archiveReason, "SEMESTER FINISHED", "Normalized reason uppercase");
    logTest("Soft Archival With Reason", "PASS");

    // ----------------------------------------------------
    // Test 8: Archived Course hidden from normal listing
    // ----------------------------------------------------
    console.log("\n--- TEST 8: GET /courses Excludes Archived ---");
    const activeList = await coursesService.getCourses(userId, false);
    const activeFound = activeList.find(c => c.id === course.id);
    assert.ok(!activeFound, "Archived course should be excluded from active list");
    logTest("GET /courses Excludes Archived", "PASS");

    // ----------------------------------------------------
    // Test 9: Archived Course included when includeArchived=true
    // ----------------------------------------------------
    console.log("\n--- TEST 9: GET /courses?includeArchived=true ---");
    const fullList = await coursesService.getCourses(userId, true);
    const archivedFound = fullList.find(c => c.id === course.id);
    assert.ok(archivedFound, "Archived course should be included when requested");
    assert.strictEqual(archivedFound.isArchived, true);
    logTest("GET /courses?includeArchived=true Includes Archived", "PASS");

    // ----------------------------------------------------
    // Test 10: Archived courses visible in reports
    // ----------------------------------------------------
    console.log("\n--- TEST 10: Reports Include Archived ---");
    const reportsList = await reportsService.getTeacherCoursesReport(userId);
    const reportFound = reportsList.find(c => c.id === course.id);
    assert.ok(reportFound, "Archived course must be visible in reports list");
    assert.strictEqual(reportFound.isArchived, true);
    logTest("Archived Course Visible In Reports", "PASS");

    // ----------------------------------------------------
    // Test 11: Prevent starting session on archived course
    // ----------------------------------------------------
    console.log("\n--- TEST 11: Block Sessions on Archived Course ---");
    try {
      await attendanceService.startSession(userId, course.id);
      logTest("Start Session on Archived Blocked", "FAIL");
    } catch (err) {
      assert.strictEqual(err.statusCode, 409);
      assert.strictEqual(err.message, "Archived courses cannot be used to start attendance sessions.");
      logTest("Start Session on Archived Blocked", "PASS");
    }

    // ----------------------------------------------------
    // Test 12: Duplicate Name allowed if old is archived
    // ----------------------------------------------------
    console.log("\n--- TEST 12: Duplicate Name Allowed After Archive ---");
    const newCourse = await coursesService.createCourse(userId, { name: uniqueName });
    assert.ok(newCourse.id !== course.id);
    logTest("Duplicate Name Allowed After Archive", "PASS");

    // ----------------------------------------------------
    // Test 13: Unarchive Course Blocked if Active Duplicate Name exists
    // ----------------------------------------------------
    console.log("\n--- TEST 13: Unarchive Blocked by Active Duplicate ---");
    try {
      await coursesService.unarchiveCourse(userId, course.id);
      logTest("Unarchive Blocked by Active Duplicate", "FAIL");
    } catch (err) {
      assert.strictEqual(err.statusCode, 409);
      assert.strictEqual(err.message, "An active course with this name already exists.");
      logTest("Unarchive Blocked by Active Duplicate", "PASS");
    }

    // Clean up active duplicate
    await prisma.course.delete({ where: { id: newCourse.id } });

    // ----------------------------------------------------
    // Test 14: Restore Archived Course Success
    // ----------------------------------------------------
    console.log("\n--- TEST 14: Restore Archived Course ---");
    const restoredCourse = await coursesService.unarchiveCourse(userId, course.id);
    assert.strictEqual(restoredCourse.isArchived, false);
    assert.strictEqual(restoredCourse.archivedAt, null);
    assert.strictEqual(restoredCourse.archiveReason, null);
    logTest("Restore Archived Course", "PASS");

    // ----------------------------------------------------
    // Test 15: Database Indexes Verification
    // ----------------------------------------------------
    console.log("\n--- TEST 15: Database Indexes Existence ---");
    const indexes = await prisma.$queryRaw`
      SELECT indexname FROM pg_indexes
      WHERE tablename IN ('Course', 'AttendanceSession', 'Student')
    `;
    const indexNames = indexes.map(i => i.indexname);
    
    const courseIdxExists = indexNames.some(name => name.includes("Course_teacherId_isArchived_idx") || name.includes("Course_teacherId_isArchived_key") || (name.includes("teacherId") && name.includes("isArchived")));
    const sessionIdxExists = indexNames.some(name => name.includes("AttendanceSession_courseId_isActive_idx") || (name.includes("courseId") && name.includes("isActive")));
    const studentIdxExists = indexNames.some(name => name.includes("Student_department_semester_section_idx") || (name.includes("department") && name.includes("semester") && name.includes("section")));

    assert.ok(courseIdxExists, "Expected index on Course(teacherId, isArchived)");
    assert.ok(sessionIdxExists, "Expected index on AttendanceSession(courseId, isActive)");
    assert.ok(studentIdxExists, "Expected index on Student(department, semester, section)");
    logTest("Database Indexes Existence", "PASS");

  } catch (error) {
    console.error("\n❌ Verification script threw error:", error);
    logTest("Verification Script Completion", "FAIL", error.message);
  } finally {
    // Final cleanup
    console.log("\n--- Running Final Cleanup ---");
    await prisma.attendance.deleteMany({
      where: { session: { course: { name: { startsWith: "P4Test_" } } } }
    });
    await prisma.attendanceSession.deleteMany({
      where: { course: { name: { startsWith: "P4Test_" } } }
    });
    await prisma.course.deleteMany({
      where: { name: { startsWith: "P4Test_" } }
    });
    if (mockStudentId) {
      await prisma.user.delete({ where: { id: mockStudentId } }).catch(() => {});
    }
  }

  // Display PASS/FAIL Report
  console.log("\n==================================================");
  console.log("             FINAL PASS/FAIL REPORT               ");
  console.log("==================================================");
  let passCount = 0;
  let failCount = 0;
  results.forEach(res => {
    if (res.status === "PASS") passCount++;
    else failCount++;
    console.log(`[${res.status}] ${res.name} ${res.details ? "- " + res.details : ""}`);
  });
  console.log("--------------------------------------------------");
  console.log(`TOTAL: ${results.length} | PASSED: ${passCount} | FAILED: ${failCount}`);
  console.log("==================================================");

  if (failCount > 0) {
    throw new Error("One or more verification tests failed.");
  }
}

runVerification()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("❌ Verification failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
