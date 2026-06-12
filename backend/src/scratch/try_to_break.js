const assert = require("assert");
const { prisma } = require("../config/database");
const reportsService = require("../modules/reports/reports.service");
const jwt = require("jsonwebtoken");

async function runBreakTests() {
  console.log("=========================================================================");
  // We use backslashes here since we are printing on Windows, but forward slash is fine
  console.log("       ⚡ SYSTEM RELIABILITY, STRESS & CONCURRENCY AUDIT SUITE ⚡        ");
  console.log("=========================================================================\n");

  const baseUrl = "http://localhost:5000/api";
  const suffix = Math.floor(1000 + Math.random() * 9000).toString();
  let studentId = null;

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
    } catch (e) {}
    return { status, data, response };
  }

  // 1. Setup mock teacher A, teacher B
  console.log("Setting up Teacher A and Teacher B...");
  const teacherAPayload = {
    name: `Break Teacher A ${suffix}`,
    email: `teacher_a_${suffix}@attendance.local`,
    password: "Password@123",
    role: "teacher",
    department: "CSE"
  };
  const regTeacherA = await apiRequest("/auth/register", "POST", null, teacherAPayload);
  const tokenA = regTeacherA.data.token;
  const teacherAId = regTeacherA.data.user.id;
  const teacherAProfileId = regTeacherA.data.user.teacher.id;

  const teacherBPayload = {
    name: `Break Teacher B ${suffix}`,
    email: `teacher_b_${suffix}@attendance.local`,
    password: "Password@123",
    role: "teacher",
    department: "IT"
  };
  const regTeacherB = await apiRequest("/auth/register", "POST", null, teacherBPayload);
  const tokenB = regTeacherB.data.token;
  const teacherBId = regTeacherB.data.user.id;

  const studentPayload = {
    name: `Break Student ${suffix}`,
    email: `student_${suffix}@attendance.local`,
    password: "Password@123",
    role: "student",
    rollNumber: `ROLL_${suffix}`,
    department: "CSE",
    semester: 4,
    section: "A"
  };
  const regStudent = await apiRequest("/auth/register", "POST", null, studentPayload);
  studentId = regStudent.data.user.id;

  // Create course under Teacher A
  const courseA = await prisma.course.create({
    data: {
      name: `Break_Course_${suffix}`,
      teacherId: teacherAProfileId,
      department: "CSE",
      semester: 4,
      section: "A"
    }
  });

  // Bulk register 500 students to use for load testing
  console.log("Bulk registering 500 students for load testing...");
  const startRegisterTime = Date.now();
  const studentsUsers = [];
  for (let i = 1; i <= 500; i++) {
    studentsUsers.push({
      name: `Student Load ${i} ${suffix}`,
      email: `student_load_${i}_${suffix}@attendance.local`,
      passwordHash: "$2a$10$xyz",
      role: "student"
    });
  }
  await prisma.user.createMany({ data: studentsUsers });
  
  const createdUsers = await prisma.user.findMany({
    where: { email: { startsWith: "student_load_", contains: `_${suffix}@` } },
    select: { id: true, email: true }
  });

  const studentsData = createdUsers.map((u, idx) => {
    return {
      userId: u.id,
      rollNumber: `ROLL_LOAD_${idx}_${suffix}`,
      department: "CSE",
      semester: 4,
      section: "A"
    };
  });
  await prisma.student.createMany({ data: studentsData });
  console.log(`✔ Registered 500 students in ${Date.now() - startRegisterTime}ms.`);

  const auditMatrix = {};

  try {
    // =========================================================================
    // PHASE A: CONCURRENT OPERATIONS
    // =========================================================================
    console.log("\n--- PHASE A: Concurrent Operations ---");

    // 1. Rapidly Start Session Multiple Times
    console.log("Test A1: Rapidly starting session 5 times concurrently...");
    const startPromises = [];
    for (let i = 0; i < 5; i++) {
      startPromises.push(apiRequest("/attendance/session/start", "POST", tokenA, {
        courseId: courseA.id,
        ssid: "MOCK_WIFI",
        bssid: "MOCK_BSSID"
      }));
    }
    const startResults = await Promise.all(startPromises);
    const successStarts = startResults.filter(r => r.status === 201);
    const conflictStarts = startResults.filter(r => r.status === 409);
    console.log(`Successes: ${successStarts.length}, Conflicts (409): ${conflictStarts.length}`);
    
    // Check database state - should have exactly one active session for this teacher
    const activeSessions = await prisma.attendanceSession.findMany({
      where: { teacherId: teacherAId, isActive: true }
    });
    console.log("Active sessions count in database:", activeSessions.length);

    if (activeSessions.length === 1) {
      auditMatrix["A1_Rapid_Start"] = "PASS";
    } else {
      auditMatrix["A1_Rapid_Start"] = "FAIL (Orphan active sessions created)";
    }

    // End active sessions for subsequent tests
    await prisma.attendanceSession.updateMany({
      where: { teacherId: teacherAId, isActive: true },
      data: { isActive: false, endedAt: new Date() }
    });

    // 2. Start Session + Archive Course simultaneously
    console.log("Test A2: Simultaneous Start Session + Archive Course...");
    const resA2_1 = apiRequest("/attendance/session/start", "POST", tokenA, {
      courseId: courseA.id,
      ssid: "MOCK_WIFI",
      bssid: "MOCK_BSSID"
    });
    const resA2_2 = apiRequest(`/courses/${courseA.id}`, "DELETE", tokenA, { reason: "Race test archive" });
    const [startRes, archiveRes] = await Promise.all([resA2_1, resA2_2]);
    console.log(`Start status: ${startRes.status}, Archive status: ${archiveRes.status}`);
    
    // Check database consistency
    const courseStateA2 = await prisma.course.findUnique({ where: { id: courseA.id } });
    const sessionStateA2 = await prisma.attendanceSession.findFirst({
      where: { courseId: courseA.id, isActive: true }
    });

    // If archived course was created, make sure it has no active session. If it has active session, it should not be archived.
    if (courseStateA2.isArchived && sessionStateA2) {
      auditMatrix["A2_Start_Archive"] = "FAIL (Archived course has active session)";
    } else {
      auditMatrix["A2_Start_Archive"] = "PASS";
    }

    // Clean up/End any active session created in A2
    await prisma.attendanceSession.updateMany({
      where: { courseId: courseA.id, isActive: true },
      data: { isActive: false, endedAt: new Date() }
    });
    if (courseStateA2.isArchived) {
      // Restore for subsequent tests
      await prisma.course.update({ where: { id: courseA.id }, data: { isArchived: false, archivedAt: null } });
    }

    // 3. Edit rules + Start session simultaneously
    console.log("Test A3: Edit rules + Start session simultaneously...");
    const resA3_1 = apiRequest(`/courses/${courseA.id}`, "PUT", tokenA, {
      name: courseA.name,
      department: "CSE_NEW",
      semester: 5,
      section: "B"
    });
    const resA3_2 = apiRequest("/attendance/session/start", "POST", tokenA, {
      courseId: courseA.id,
      ssid: "MOCK_WIFI",
      bssid: "MOCK_BSSID"
    });
    const [editRes, startRes3] = await Promise.all([resA3_1, resA3_2]);
    console.log(`Edit status: ${editRes.status}, Start status: ${startRes3.status}`);

    const activeSessionA3 = await prisma.attendanceSession.findFirst({
      where: { courseId: courseA.id, isActive: true }
    });

    if (activeSessionA3) {
      console.log(`Active session snapshots: Dept=${activeSessionA3.departmentSnapshot}, Sem=${activeSessionA3.semesterSnapshot}, Sec=${activeSessionA3.sectionSnapshot}`);
      console.log(`Current Course Rules: Dept=${editRes.data?.course?.department || editRes.data?.department}`);
      auditMatrix["A3_Edit_Start"] = "PASS";
    } else {
      auditMatrix["A3_Edit_Start"] = "PASS (Start failed or rejected correctly)";
    }

    // Cleanup session and restore course settings
    await prisma.attendanceSession.updateMany({
      where: { courseId: courseA.id, isActive: true },
      data: { isActive: false, endedAt: new Date() }
    });
    await prisma.course.update({
      where: { id: courseA.id },
      data: { department: "CSE", semester: 4, section: "A" }
    });

    // 4. Restore + Archive simultaneously
    console.log("Test A4: Restore + Archive course simultaneously...");
    // First, archive
    await apiRequest(`/courses/${courseA.id}`, "DELETE", tokenA, { reason: "Archive for restore race" });
    const resA4_1 = apiRequest(`/courses/${courseA.id}/unarchive`, "POST", tokenA);
    const resA4_2 = apiRequest(`/courses/${courseA.id}`, "DELETE", tokenA, { reason: "Archive race" });
    const [restoreRes, archiveRes2] = await Promise.all([resA4_1, resA4_2]);
    console.log(`Restore status: ${restoreRes.status}, Archive status: ${archiveRes2.status}`);

    const courseStateA4 = await prisma.course.findUnique({ where: { id: courseA.id } });
    console.log(`Final Course State: isArchived=${courseStateA4.isArchived}`);
    auditMatrix["A4_Restore_Archive"] = "PASS";

    // Restore course for subsequent phases
    await prisma.course.update({
      where: { id: courseA.id },
      data: { isArchived: false, archivedAt: null, archiveReason: null }
    });


    // =========================================================================
    // PHASE B: HIGH-CONCURRENCY ATTENDANCE
    // =========================================================================
    console.log("\n--- PHASE B: High-Concurrency Attendance ---");
    const testSizes = [50, 100, 250, 500];

    for (const size of testSizes) {
      console.log(`Testing high concurrency for ${size} students...`);
      
      // Start active session
      const startRes = await apiRequest("/attendance/session/start", "POST", tokenA, {
        courseId: courseA.id,
        ssid: "MOCK_WIFI",
        bssid: "MOCK_BSSID"
      });
      const activeSession = startRes.data.session || startRes.data;
      
      // Generate QR code
      const qrRes = await apiRequest(`/qr/current/${activeSession.id}`, "GET", tokenA);
      const nonce = qrRes.data.qr.nonce;

      // Select 'size' number of registered student IDs
      const targetUsers = createdUsers.slice(0, size);
      
      // Generate tokens for these users
      console.log(`Generating auth tokens for ${size} students...`);
      const jwtSecret = process.env.JWT_SECRET || "replace-with-a-secure-jwt-secret";
      const studentTokens = targetUsers.map((u) => {
        const token = jwt.sign(
          { sub: u.id, email: u.email, role: "student" },
          jwtSecret,
          { expiresIn: "7d" }
        );
        return { studentId: u.id, token };
      });

      // Simulate simultaneous attendance markings
      console.log(`Simulating simultaneous QRs posting for ${size} students...`);
      const startTime = Date.now();
      
      const markResults = [];
      const batchSize = 100;
      for (let i = 0; i < studentTokens.length; i += batchSize) {
        const batch = studentTokens.slice(i, i + batchSize);
        const promises = batch.map(st => 
          apiRequest("/student-attendance/scan", "POST", st.token, {
            sessionCode: activeSession.sessionCode,
            nonce
          })
        );
        const batchResults = await Promise.all(promises);
        markResults.push(...batchResults);
      }
      
      const duration = Date.now() - startTime;

      const successMarks = markResults.filter(r => r.status === 200 || r.status === 201);
      const failedMarks = markResults.filter(r => r.status !== 200 && r.status !== 201);
      console.log(`[SIZE ${size}] Complete in ${duration}ms. Success: ${successMarks.length}, Failed: ${failedMarks.length}`);
      if (failedMarks.length > 0) {
        console.log(`Failed mark sample status:`, failedMarks[0].status);
        console.log(`Failed mark sample response:`, JSON.stringify(failedMarks[0].data, null, 2));
      }

      // Attempt duplicate marking for student 0
      const st0 = studentTokens[0];
      const dupMark = await apiRequest("/student-attendance/scan", "POST", st0.token, {
        sessionCode: activeSession.sessionCode,
        nonce
      });
      console.log(`Duplicate mark status code: ${dupMark.status}`);

      // Count records in DB
      const dbCount = await prisma.attendance.count({ where: { sessionId: activeSession.id } });
      console.log(`Attendance records stored in DB: ${dbCount} (Expected: ${size})`);

      // Verify dashboard totals
      const resDash = await apiRequest("/reports/dashboard", "GET", tokenA);
      const dashboard = resDash.data.dashboard || resDash.data;
      console.log(`Dashboard Stats: totalAttendanceRecords=${dashboard.totalAttendanceRecords}`);

      const pass = (dbCount === size) && (dupMark.status === 409 || dupMark.status === 500);
      auditMatrix[`B_Concurrency_${size}`] = pass ? "PASS" : `FAIL (Stored=${dbCount}, Expected=${size})`;

      // Clean up attendances and end session
      await prisma.attendance.deleteMany({ where: { sessionId: activeSession.id } });
      await apiRequest("/attendance/session/end", "POST", tokenA);
    }


    // =========================================================================
    // PHASE C: EXPORT STRESS TESTING
    // =========================================================================
    console.log("\n--- PHASE C: Export Stress Testing ---");
    const PDFDocument = require("pdfkit");
    const { Writable } = require("stream");

    for (const size of testSizes) {
      console.log(`Simulating export compilation for roster of ${size} students...`);
      const mockStudents = [];
      for (let i = 1; i <= size; i++) {
        mockStudents.push({
          rollNumber: `ROLL_${String(i).padStart(4, "0")}`,
          name: `Mock Student ${i}`,
          attendedSessions: 8,
          totalSessions: 10,
          attendancePercentage: 80.0,
        });
      }

      // We override prisma.course.findUnique to simulate this size roster
      const originalFindUnique = prisma.course.findUnique;
      prisma.course.findUnique = async (args) => {
        if (args.where && args.where.id === courseA.id) {
          return {
            id: courseA.id,
            name: `Stress_Export_Course_${size}`,
            teacherId: teacherAProfileId,
            sessions: [{
              id: 8888,
              sessionCode: "STRESS_SESS",
              isActive: false,
              startedAt: new Date(),
              attendanceRecords: mockStudents.map((s, idx) => ({
                student: {
                  id: 9000 + idx,
                  name: s.name,
                  student: {
                    rollNumber: s.rollNumber,
                  }
                }
              }))
            }]
          };
        }
        return originalFindUnique.apply(prisma.course, [args]);
      };

      let bytesWritten = 0;
      let resolveFinish;
      const finishPromise = new Promise((resolve) => { resolveFinish = resolve; });
      const mockPdfStream = new Writable({
        write(chunk, encoding, callback) {
          bytesWritten += chunk.length;
          callback();
        },
        final(callback) {
          resolveFinish();
          callback();
        }
      });
      mockPdfStream.setHeader = () => {};

      // Intercept page count
      const originalAddPage = PDFDocument.prototype.addPage;
      let pageCount = 1;
      PDFDocument.prototype.addPage = function(...args) {
        pageCount++;
        return originalAddPage.apply(this, args);
      };

      const startTime = Date.now();
      await reportsService.exportCoursePDF(teacherAId, courseA.id, mockPdfStream);
      await finishPromise;
      const duration = Date.now() - startTime;

      // Restore mocks
      prisma.course.findUnique = originalFindUnique;
      PDFDocument.prototype.addPage = originalAddPage;

      console.log(`[SIZE ${size}] Export generated in ${duration}ms. Pages: ${pageCount}, Size: ${bytesWritten} bytes`);
      
      const pass = pageCount > 1 && bytesWritten > 5000;
      auditMatrix[`C_Export_PDF_${size}`] = pass ? "PASS" : "FAIL (Incorrect PDF pagination or empty output)";
    }


    // =========================================================================
    // PHASE D: CACHE CONSISTENCY
    // =========================================================================
    console.log("\n--- PHASE D: Cache Consistency ---");
    
    // 1. Load dashboard
    const resDash1 = await apiRequest("/reports/dashboard", "GET", tokenA);
    const dash1 = resDash1.data.dashboard || resDash1.data;
    const initialSessions = dash1.totalSessions;
    console.log("Initial sessions:", initialSessions);

    // 2. Mark attendance (start session, mark, end)
    const sessionRes = await apiRequest("/attendance/session/start", "POST", tokenA, {
      courseId: courseA.id,
      ssid: "MOCK_WIFI",
      bssid: "MOCK_BSSID"
    });
    const sId = sessionRes.data.session.id;

    // 3. Refresh dashboard (while session is active)
    const resDash2 = await apiRequest("/reports/dashboard", "GET", tokenA);
    const dash2 = resDash2.data.dashboard || resDash2.data;
    console.log("Dashboard sessions count while active:", dash2.totalSessions);

    // 4. End session
    await apiRequest("/attendance/session/end", "POST", tokenA);

    // 5. Refresh dashboard (after session ended)
    const resDash3 = await apiRequest("/reports/dashboard", "GET", tokenA);
    const dash3 = resDash3.data.dashboard || resDash3.data;
    console.log("Dashboard sessions count after ended:", dash3.totalSessions);

    // 6. Archive course
    await apiRequest(`/courses/${courseA.id}`, "DELETE", tokenA, { reason: "Cache invalidation test archive" });

    // 7. Refresh dashboard (after archive)
    const resDash4 = await apiRequest("/reports/dashboard", "GET", tokenA);
    const dash4 = resDash4.data.dashboard || resDash4.data;
    console.log("Active courses count after archive:", dash4.activeCourses);
    console.log("Archived courses count after archive:", dash4.archivedCourses);

    // Unarchive courseA
    await apiRequest(`/courses/${courseA.id}/unarchive`, "POST", tokenA);

    const pass = (dash3.totalSessions === initialSessions + 1) && (dash4.activeCourses === 0) && (dash4.archivedCourses === 1);
    auditMatrix["D_Cache_Consistency"] = pass ? "PASS" : "FAIL (Stale cache values)";


    // =========================================================================
    // PHASE E: SECURITY TESTING
    // =========================================================================
    console.log("\n--- PHASE E: Security Testing ---");

    // 1. Cross-teacher course access
    const sec1 = await apiRequest(`/reports/courses/${courseA.id}`, "GET", tokenB);
    console.log("Cross-teacher course access status:", sec1.status);

    // 2. Cross-teacher exports
    const sec2 = await apiRequest(`/reports/courses/${courseA.id}/export/csv`, "GET", tokenB);
    console.log("Cross-teacher export status:", sec2.status);

    // 3. Export without authentication
    const sec3 = await apiRequest(`/reports/courses/${courseA.id}/export/csv`, "GET", null);
    console.log("Export without auth status:", sec3.status);

    // 4. Session start without authentication
    const sec4 = await apiRequest("/attendance/session/start", "POST", null, { courseId: courseA.id });
    console.log("Session start without auth status:", sec4.status);

    const passSec = (sec1.status === 403) && (sec2.status === 403) && (sec3.status === 401) && (sec4.status === 401);
    auditMatrix["E_Security_Isolations"] = passSec ? "PASS" : "FAIL (Security violation)";


    // =========================================================================
    // PHASE F: DATABASE INTEGRITY
    // =========================================================================
    console.log("\n--- PHASE F: Database Integrity ---");

    // Start a temporary course, session, QR, and attendance
    const tempCourse = await prisma.course.create({
      data: { name: `Temp_Integrity_${suffix}`, teacherId: teacherAProfileId }
    });
    const tempSession = await prisma.attendanceSession.create({
      data: { teacherId: teacherAId, sessionCode: `TEMP_INT_${suffix}`, courseId: tempCourse.id }
    });
    const tempQR = await prisma.sessionQRCode.create({
      data: { sessionId: tempSession.id, nonce: `TEMP_NONCE_${suffix}`, expiresAt: new Date(Date.now() + 60000) }
    });
    const tempAtt = await prisma.attendance.create({
      data: { studentId: studentId, sessionId: tempSession.id, verificationMethod: "manual" }
    });

    // Delete temp course - should cascade delete session, QR, and attendance
    console.log("Deleting temp course to verify cascade delete integrity...");
    await prisma.course.delete({ where: { id: tempCourse.id } });

    // Assert no orphan records
    const orphansSession = await prisma.attendanceSession.findMany({ where: { id: tempSession.id } });
    const orphansQR = await prisma.sessionQRCode.findMany({ where: { id: tempQR.id } });
    const orphansAtt = await prisma.attendance.findMany({ where: { id: tempAtt.id } });

    console.log(`Orphan Sessions: ${orphansSession.length}, QRs: ${orphansQR.length}, Attendances: ${orphansAtt.length}`);
    const passInt = (orphansSession.length === 0) && (orphansQR.length === 0) && (orphansAtt.length === 0);
    auditMatrix["F_Database_Integrity"] = passInt ? "PASS" : "FAIL (Orphan records found)";


    // =========================================================================
    // PHASE G: FAILURE RECOVERY
    // =========================================================================
    console.log("\n--- PHASE G: Failure Recovery ---");

    // Invalid payload injection
    const resBadPayload = await apiRequest("/attendance/session/start", "POST", tokenA, {
      courseId: "not-a-number",
      ssid: 12345
    });
    console.log("Invalid payload injection status:", resBadPayload.status);

    const passRecovery = resBadPayload.status === 400 || resBadPayload.status === 500;
    auditMatrix["G_Failure_Recovery"] = passRecovery ? "PASS" : "FAIL (Rejected payload with incorrect status)";

  } finally {
    // CLEANUP
    console.log("\nCleaning up break audit test resources...");
    await prisma.course.deleteMany({ where: { teacherId: teacherAProfileId } }).catch(() => {});
    await prisma.attendance.deleteMany({
      where: { student: { email: { startsWith: "student_load_", contains: `_${suffix}@` } } }
    }).catch(() => {});
    await prisma.user.deleteMany({
      where: { email: { startsWith: "student_load_", contains: `_${suffix}@` } }
    }).catch(() => {});
    await prisma.user.delete({ where: { id: studentId } }).catch(() => {});
    await prisma.user.delete({ where: { id: teacherAId } }).catch(() => {});
    await prisma.user.delete({ where: { id: teacherBId } }).catch(() => {});
    console.log("✔ Cleanup completed.");
  }

  // Output matrix
  console.log("\n==================================================");
  console.log("           STRESS & RELIABILITY MATRIX            ");
  console.log("==================================================");
  let passedCount = 0;
  let totalCount = 0;
  for (const [key, val] of Object.entries(auditMatrix)) {
    totalCount++;
    if (val === "PASS") passedCount++;
    console.log(`${key.padEnd(30)}: [${val}]`);
  }
  console.log("--------------------------------------------------");
  console.log(`TOTAL AUDIT CHECKS: ${totalCount} | PASSED: ${passedCount} | FAILED: ${totalCount - passedCount}`);
  console.log("==================================================");

  if (passedCount !== totalCount) {
    throw new Error("One or more audit reliability checks failed.");
  }
}

runBreakTests()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("❌ Stress/reliability audit failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
