const assert = require("assert");
const { prisma } = require("../config/database");

async function runVerification() {
  console.log("=== STARTING COMPREHENSIVE SECURITY, API VALIDATION & DB INTEGRITY AUDIT ===\n");

  const baseUrl = "http://localhost:5000/api";
  const suffix = Math.floor(1000 + Math.random() * 9000).toString();
  let teacherRateUserId = null;
  let teacherRateProfileId = null;

  // Helper for requests
  async function apiRequest(endpoint, method, token, body) {
    const url = `${baseUrl}${endpoint}`;
    const headers = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const status = response.status;
    let data = null;
    try {
      data = await response.json();
    } catch (e) {
      // PDF or CSV might not be JSON
    }
    return { status, data, response };
  }

  // 1. Setup mock teacher A, teacher B, and student
  console.log("Setting up test users...");
  
  const teacherAPayload = {
    name: `Teacher A ${suffix}`,
    email: `teacher_a_${suffix}@attendance.local`,
    password: "Password@123",
    role: "teacher",
    department: "Computer Science"
  };
  const regTeacherA = await apiRequest("/auth/register", "POST", null, teacherAPayload);
  const tokenA = regTeacherA.data.token;
  const teacherAId = regTeacherA.data.user.id;
  const teacherAProfileId = regTeacherA.data.user.teacher.id;

  const teacherBPayload = {
    name: `Teacher B ${suffix}`,
    email: `teacher_b_${suffix}@attendance.local`,
    password: "Password@123",
    role: "teacher",
    department: "Information Technology"
  };
  const regTeacherB = await apiRequest("/auth/register", "POST", null, teacherBPayload);
  const tokenB = regTeacherB.data.token;
  const teacherBId = regTeacherB.data.user.id;

  const studentPayload = {
    name: `Student ${suffix}`,
    email: `student_${suffix}@attendance.local`,
    password: "Password@123",
    role: "student",
    rollNumber: `ROLL_${suffix}`,
    department: "Computer Science",
    semester: 4,
    section: "A"
  };
  const regStudent = await apiRequest("/auth/register", "POST", null, studentPayload);
  const studentId = regStudent.data.user.id;

  console.log("✔ Setup complete.");

  // Create course under Teacher A
  const courseA = await prisma.course.create({
    data: {
      name: `Course_A_${suffix}`,
      teacherId: teacherAProfileId,
      department: "Computer Science",
      semester: 4,
      section: "A"
    }
  });

  try {
    // =========================================================================
    // AUDIT 1: Unauthorized Access (401 Unauthorized)
    // =========================================================================
    console.log("\n--- AUDIT 1: Unauthorized Access ---");
    
    // Call reports endpoint with missing token
    const resNoToken = await apiRequest("/reports/dashboard", "GET", null);
    console.log("No token status:", resNoToken.status);
    assert.strictEqual(resNoToken.status, 401, "Expected 401 Unauthorized");
    assert.strictEqual(resNoToken.data.success, false);

    // Call reports endpoint with invalid token
    const resBadToken = await apiRequest("/reports/dashboard", "GET", "invalid-token");
    console.log("Bad token status:", resBadToken.status);
    assert.strictEqual(resBadToken.status, 401, "Expected 401 Unauthorized");
    console.log("✔ Audit 1 Passed.");

    // =========================================================================
    // AUDIT 2: Forbidden Access / Ownership Protection (403 Forbidden)
    // =========================================================================
    console.log("\n--- AUDIT 2: Forbidden Access / Ownership Protection ---");
    
    // Teacher B trying to view Teacher A's course details
    const resForbiddenView = await apiRequest(`/reports/courses/${courseA.id}`, "GET", tokenB);
    console.log("Forbidden course view status:", resForbiddenView.status);
    assert.strictEqual(resForbiddenView.status, 403, "Expected 403 Forbidden");
    assert.strictEqual(resForbiddenView.data.message, "You do not have permission to access this course");

    // Teacher B trying to export Teacher A's course csv
    const resForbiddenExport = await apiRequest(`/reports/courses/${courseA.id}/export/csv`, "GET", tokenB);
    console.log("Forbidden course export status:", resForbiddenExport.status);
    assert.strictEqual(resForbiddenExport.status, 403, "Expected 403 Forbidden");

    // Student trying to access teacher-only endpoint
    const resStudentForbidden = await apiRequest("/reports/dashboard", "GET", regStudent.data.token);
    console.log("Student forbidden status:", resStudentForbidden.status);
    assert.strictEqual(resStudentForbidden.status, 403, "Expected 403 Forbidden");
    console.log("✔ Audit 2 Passed.");

    // =========================================================================
    // AUDIT 3: Input Validation Gaps (400 Bad Request)
    // =========================================================================
    console.log("\n--- AUDIT 3: Input Validation Gaps ---");

    // 1. Dashboard range validation
    const resBadRange = await apiRequest("/reports/dashboard?range=90d", "GET", tokenA);
    console.log("Dashboard invalid range status:", resBadRange.status);
    assert.strictEqual(resBadRange.status, 400, "Expected 400 Bad Request");
    assert.strictEqual(resBadRange.data.message, "Invalid dashboard range.");

    // 2. Defaulters threshold validation (threshold > 100)
    const resThresholdHigh = await apiRequest(`/reports/courses/${courseA.id}/defaulters?threshold=120`, "GET", tokenA);
    console.log("Defaulter threshold high status:", resThresholdHigh.status);
    assert.strictEqual(resThresholdHigh.status, 400, "Expected 400 Bad Request");
    assert.strictEqual(resThresholdHigh.data.message, "Threshold must be between 1 and 100.");

    // 3. Defaulters threshold validation (threshold < 1)
    const resThresholdLow = await apiRequest(`/reports/courses/${courseA.id}/defaulters?threshold=0`, "GET", tokenA);
    console.log("Defaulter threshold low status:", resThresholdLow.status);
    assert.strictEqual(resThresholdLow.status, 400, "Expected 400 Bad Request");
    
    // 4. Defaulters CSV export threshold validation (threshold invalid)
    const resDefCsvBadThreshold = await apiRequest(`/reports/courses/${courseA.id}/defaulters/export/csv?threshold=-10`, "GET", tokenA);
    console.log("Defaulter CSV export invalid threshold status:", resDefCsvBadThreshold.status);
    assert.strictEqual(resDefCsvBadThreshold.status, 400, "Expected 400 Bad Request");
    console.log("✔ Audit 3 Passed.");

    // =========================================================================
    // AUDIT 4: Not Found Responses (404 Not Found)
    // =========================================================================
    console.log("\n--- AUDIT 4: Not Found Responses ---");

    // Fetch reports for non-existent course
    const resCourseNotFound = await apiRequest("/reports/courses/99999", "GET", tokenA);
    console.log("Course detail not found status:", resCourseNotFound.status);
    assert.strictEqual(resCourseNotFound.status, 404, "Expected 404 Not Found");
    assert.strictEqual(resCourseNotFound.data.message, "Course not found");

    // Fetch trends for non-existent course
    const resTrendsNotFound = await apiRequest("/reports/courses/99999/trends", "GET", tokenA);
    console.log("Course trends not found status:", resTrendsNotFound.status);
    assert.strictEqual(resTrendsNotFound.status, 404, "Expected 404 Not Found");
    console.log("✔ Audit 4 Passed.");

    // =========================================================================
    // AUDIT 5: Active Course Name Uniqueness & Restore Conflicts (409 Conflict)
    // =========================================================================
    console.log("\n--- AUDIT 5: Active Course Name Uniqueness & Restore Conflicts ---");

    // Create course directly using courses route to test duplicate check
    const newCoursePayload = {
      name: `Course_A_${suffix}`, // Same name as courseA
      department: "Computer Science",
      semester: 4,
      section: "A"
    };

    const resDuplicateCreate = await apiRequest("/courses", "POST", tokenA, newCoursePayload);
    console.log("Create active duplicate course status:", resDuplicateCreate.status);
    assert.strictEqual(resDuplicateCreate.status, 409, "Expected 409 Conflict (duplicate active name check)");
    assert.strictEqual(resDuplicateCreate.data.message, "Course name already exists for this teacher");

    // Now, soft delete/archive courseA
    await apiRequest(`/courses/${courseA.id}`, "DELETE", tokenA, { reason: "Archiving for restore test" });
    
    // Now creating duplicate name should be allowed since previous is archived
    const resCreateAfterArchive = await apiRequest("/courses", "POST", tokenA, newCoursePayload);
    console.log("Create duplicate course after archive status:", resCreateAfterArchive.status);
    assert.strictEqual(resCreateAfterArchive.status, 201, "Expected 201 Created");
    const activeCourse2 = resCreateAfterArchive.data.course;

    // Attempt to unarchive the original courseA - should fail with 409 Conflict
    const resRestoreConflict = await apiRequest(`/courses/${courseA.id}/unarchive`, "POST", tokenA);
    console.log("Restore archived course with active duplicate name status:", resRestoreConflict.status);
    assert.strictEqual(resRestoreConflict.status, 409, "Expected 409 Conflict");
    assert.strictEqual(resRestoreConflict.data.message, "An active course with this name already exists.");

    // Clean up activeCourse2
    await prisma.course.delete({ where: { id: activeCourse2.id } });
    console.log("✔ Audit 5 Passed.");

    // =========================================================================
    // AUDIT 6: Session Restrictions on Archived Courses
    // =========================================================================
    console.log("\n--- AUDIT 6: Session Restrictions on Archived Courses ---");

    // Attempt to start a session on archived courseA
    const resStartSessionArchived = await apiRequest("/attendance/session/start", "POST", tokenA, {
      courseId: courseA.id,
      ssid: "MOCK_SSID",
      bssid: "MOCK_BSSID"
    });
    console.log("Start session on archived course status:", resStartSessionArchived.status);
    assert.strictEqual(resStartSessionArchived.status, 409, "Expected 409 Conflict");
    assert.strictEqual(resStartSessionArchived.data.message, "Archived courses cannot be used to start attendance sessions.");
    console.log("✔ Audit 6 Passed.");

    // Unarchive courseA to clean it up and restore it for next audits
    await apiRequest(`/courses/${courseA.id}/unarchive`, "POST", tokenA);

    // =========================================================================
    // AUDIT 7: Rate Limiting (429 Too Many Requests)
    // =========================================================================
    console.log("\n--- AUDIT 7: Rate Limiting ---");
    
    // Register rate limit teacher
    const teacherRatePayload = {
      name: `Teacher Rate ${suffix}`,
      email: `teacher_rate_${suffix}@attendance.local`,
      password: "Password@123",
      role: "teacher",
      department: "Mathematics"
    };
    const regTeacherRate = await apiRequest("/auth/register", "POST", null, teacherRatePayload);
    const tokenRate = regTeacherRate.data.token;
    teacherRateUserId = regTeacherRate.data.user.id;
    teacherRateProfileId = regTeacherRate.data.user.teacher.id;

    const courseRate = await prisma.course.create({
      data: {
        name: `Course_Rate_${suffix}`,
        teacherId: teacherRateProfileId,
        department: "Mathematics",
        semester: 1,
        section: "A"
      }
    });

    // Send 5 successful exports
    console.log("Sending 5 export requests to trigger rate limiting...");
    for (let i = 1; i <= 5; i++) {
      const resRate = await apiRequest(`/reports/courses/${courseRate.id}/export/csv`, "GET", tokenRate);
      assert.strictEqual(resRate.status, 200, `Expected 200 OK for request ${i}`);
    }

    // The 6th request should hit the rate limit and return 429
    const resRateLimitHit = await apiRequest(`/reports/courses/${courseRate.id}/export/csv`, "GET", tokenRate);
    console.log("6th export request status:", resRateLimitHit.status);
    assert.strictEqual(resRateLimitHit.status, 429, "Expected 429 Too Many Requests");
    assert.strictEqual(resRateLimitHit.data.success, false);
    assert.strictEqual(resRateLimitHit.data.message, "Too many export requests. Please try again later.");
    console.log("✔ Audit 7 Passed.");

    // =========================================================================
    // AUDIT 8: Database Integrity & Constraints
    // =========================================================================
    console.log("\n--- AUDIT 8: Database Integrity & Constraints ---");

    // 1. Foreign Key Constraint on invalid course ID (Prisma error)
    console.log("Verifying Foreign Key Constraint on invalid courseId...");
    try {
      await prisma.attendanceSession.create({
        data: {
          teacherId: teacherAId,
          sessionCode: `FAIL_FK_${suffix}`,
          courseId: 99999, // Non-existent course
        }
      });
      assert.fail("Fk constraint check should have thrown error");
    } catch (err) {
      assert.ok(err.code === "P2003" || err.message.includes("Foreign key"), "Expected foreign key constraint Prisma error P2003");
      console.log("Prisma caught FK violation correctly:", err.code);
    }

    // 2. Duplicate Attendance prevention (Unique index constraint on studentId + sessionId)
    console.log("Verifying Duplicate Attendance prevention unique constraint...");
    const testSession = await prisma.attendanceSession.create({
      data: {
        teacherId: teacherAId,
        sessionCode: `TEST_UNIQ_${suffix}`,
        courseId: courseA.id,
      }
    });

    // Mark student present once
    await prisma.attendance.create({
      data: {
        studentId: studentId,
        sessionId: testSession.id,
        status: "present",
        verificationMethod: "manual"
      }
    });

    // Mark again (duplicate) - should fail unique constraint
    try {
      await prisma.attendance.create({
        data: {
          studentId: studentId,
          sessionId: testSession.id,
          status: "absent",
          verificationMethod: "manual"
        }
      });
      assert.fail("Unique constraint check should have thrown error");
    } catch (err) {
      assert.ok(err.code === "P2002" || err.message.includes("Unique constraint"), "Expected unique constraint Prisma error P2002");
      console.log("Prisma caught Duplicate Attendance violation correctly:", err.code);
    }

    // Cleanup session and records
    await prisma.attendance.deleteMany({ where: { sessionId: testSession.id } });
    await prisma.attendanceSession.delete({ where: { id: testSession.id } });
    console.log("✔ Audit 8 Passed.");

  } finally {
    // =========================================================================
    // CLEANUP
    // =========================================================================
    console.log("\nCleaning up test resources...");
    await prisma.course.deleteMany({ where: { teacherId: teacherAProfileId } }).catch(() => {});
    if (teacherRateProfileId) {
      await prisma.course.deleteMany({ where: { teacherId: teacherRateProfileId } }).catch(() => {});
    }
    await prisma.user.delete({ where: { id: studentId } }).catch(() => {});
    await prisma.user.delete({ where: { id: teacherAId } }).catch(() => {});
    await prisma.user.delete({ where: { id: teacherBId } }).catch(() => {});
    if (teacherRateUserId) {
      await prisma.user.delete({ where: { id: teacherRateUserId } }).catch(() => {});
    }
    console.log("✔ Cleanup complete.");
  }

  console.log("\n=========================================================================");
  console.log("   🎉 ALL SECURITY, API VALIDATION & DB INTEGRITY CHECKS PASSED 🎉       ");
  console.log("=========================================================================");
}

runVerification()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("❌ Audit failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
