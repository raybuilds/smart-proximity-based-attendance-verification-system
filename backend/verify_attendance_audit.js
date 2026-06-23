const { prisma } = require("./src/config/database");
const http = require("http");
const jwt = require("jsonwebtoken");
const config = require("./src/config");

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const headers = { ...options.headers };
    if (postData) {
      headers["Content-Length"] = Buffer.byteLength(postData);
    }
    const req = http.request({ ...options, headers }, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log("=== STARTING ATTENDANCE AUDIT SYSTEM BACKEND VALIDATION ===");

  // 1. Fetch or seed necessary records
  const teacher = await prisma.teacher.findFirst({
    include: { user: true }
  });
  if (!teacher) {
    console.error("ERROR: No teacher found in database. Run migrations/seeding first.");
    process.exit(1);
  }

  const course = await prisma.course.findFirst({
    where: { teacherId: teacher.id },
  });
  if (!course) {
    console.error("ERROR: No course found for the teacher.");
    process.exit(1);
  }

  const student = await prisma.student.findFirst({
    where: {
      department: course.department,
      year: course.year,
      section: course.section,
    },
    include: { user: true }
  });
  if (!student) {
    console.error("ERROR: No student found matching course department/year/section.");
    process.exit(1);
  }

  console.log(`Teacher: ID ${teacher.userId} (${teacher.user.name})`);
  console.log(`Course:  ID ${course.id} (${course.name})`);
  console.log(`Student: ID ${student.userId} (${student.user.name}), Dept: ${student.department}, Sem: ${student.year}, Sec: ${student.section}`);

  // Generate JWT token for the teacher
  const token = jwt.sign(
    {
      sub: teacher.userId,
      email: teacher.user.email,
      role: teacher.user.role,
    },
    config.jwtSecret,
    { expiresIn: "1h" }
  );

  // Clear existing attendance for this student/course to have a clean test
  const testSessions = await prisma.attendanceSession.findMany({
    where: { courseId: course.id }
  });
  const testSessionIds = testSessions.map(s => s.id);

  await prisma.attendanceCorrection.deleteMany({
    where: { studentId: student.userId, sessionId: { in: testSessionIds } }
  });
  await prisma.attendance.deleteMany({
    where: { studentId: student.userId, sessionId: { in: testSessionIds } }
  });

  // Ensure we have at least 3 sessions conducted in this course
  let sessions = await prisma.attendanceSession.findMany({
    where: { courseId: course.id },
    orderBy: { startedAt: "asc" }
  });

  if (sessions.length < 3) {
    console.log("Creating test attendance sessions...");
    for (let i = sessions.length; i < 3; i++) {
      const code = `TEST_SESS_${Date.now()}_${i}`;
      await prisma.attendanceSession.create({
        data: {
          courseId: course.id,
          teacherId: teacher.userId,
          sessionCode: code,
          isActive: false,
          startedAt: new Date(Date.now() - (3 - i) * 24 * 60 * 60 * 1000), // chronological spacing
          endedAt: new Date(),
          departmentSnapshot: course.department,
          yearSnapshot: course.year,
          sectionSnapshot: course.section,
        }
      });
    }
    sessions = await prisma.attendanceSession.findMany({
      where: { courseId: course.id },
      orderBy: { startedAt: "asc" }
    });
  }

  console.log(`Sessions count: ${sessions.length}`);

  // Test 1: GET Student History - Initial State (All Absent)
  console.log("\n--- TEST 1: GET student history (initial all-absent state) ---");
  const getOptions = {
    hostname: "localhost",
    port: 5000,
    path: `/api/reports/courses/${course.id}/students/${student.userId}/history`,
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  };

  let res = await makeRequest(getOptions);
  console.log("GET Response Status:", res.statusCode);
  if (res.statusCode !== 200) {
    console.error("FAIL: History retrieval failed", res.body);
    process.exit(1);
  }

  let history = res.body.data;
  console.log("Summary metrics:");
  console.log(`  totalSessions:         ${history.summary.totalSessions}`);
  console.log(`  presentCount:          ${history.summary.presentCount}`);
  console.log(`  absentCount:           ${history.summary.absentCount}`);
  console.log(`  qrCount:               ${history.summary.qrCount}`);
  console.log(`  manualCount:           ${history.summary.manualCount}`);
  console.log(`  reliabilityPercentage: ${history.summary.reliabilityPercentage}`);
  console.log(`  correctionCount:       ${history.summary.correctionCount}`);
  console.log(`  lastAttendedDate:      ${history.summary.lastAttendedDate}`);
  console.log(`  currentAbsenceStreak:  ${history.summary.currentAbsenceStreak}`);

  // Assertions for Test 1
  if (history.summary.presentCount !== 0) throw new Error("presentCount should be 0");
  if (history.summary.absentCount !== sessions.length) throw new Error(`absentCount should be ${sessions.length}`);
  if (history.summary.reliabilityPercentage !== null) throw new Error("reliabilityPercentage should be null when presentCount is 0");
  if (history.summary.hasAttendanceData !== false) throw new Error("hasAttendanceData should be false when presentCount is 0");
  if (history.summary.correctionCount !== 0) throw new Error("correctionCount should be 0");
  if (history.summary.lastAttendedDate !== null) throw new Error("lastAttendedDate should be null");
  if (history.summary.currentAbsenceStreak !== sessions.length) throw new Error(`currentAbsenceStreak should be ${sessions.length}`);
  console.log("PASS: Initial state assertions verified.");

  // Test 2: Manual Correction of Session 2 (index 1)
  console.log("\n--- TEST 2: Perform manual correction on Session 2 ---");
  const targetSession = sessions[1];
  const syntheticId = `session-${targetSession.id}-student-${student.userId}`;
  const patchData = JSON.stringify({ reason: "Phone Issue" });
  const patchOptions = {
    hostname: "localhost",
    port: 5000,
    path: `/api/reports/attendance/${syntheticId}/manual`,
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  };

  res = await makeRequest(patchOptions, patchData);
  console.log("PATCH Response Status:", res.statusCode);
  console.log("PATCH Response Body:", res.body);
  if (res.statusCode !== 200 && res.statusCode !== 201) {
    console.error("FAIL: Manual correction failed", res.body);
    process.exit(1);
  }
  console.log("PASS: Correction request returned successfully.");

  // Verify database record & audit trail
  console.log("Verifying Database updates...");
  const attendance = await prisma.attendance.findUnique({
    where: { studentId_sessionId: { studentId: student.userId, sessionId: targetSession.id } },
    include: { corrections: true }
  });
  if (!attendance) throw new Error("Attendance record was not created!");
  if (attendance.status !== "present") throw new Error("Attendance status should be present");
  if (attendance.method !== "MANUAL") throw new Error("Attendance method should be MANUAL");
  if (attendance.modifiedByTeacherId !== teacher.userId) throw new Error("modifiedByTeacherId should be teacher user ID");
  if (attendance.correctionReason !== "Phone Issue") throw new Error("correctionReason should be 'Phone Issue'");

  if (attendance.corrections.length !== 1) throw new Error("Should have exactly 1 correction log");
  const audit = attendance.corrections[0];
  if (audit.sessionId !== targetSession.id) throw new Error("Audit record sessionId mismatch");
  if (audit.studentId !== student.userId) throw new Error("Audit record studentId mismatch");
  if (audit.previousMethod !== null) throw new Error("Audit previousMethod should be null");
  if (audit.newMethod !== "MANUAL") throw new Error("Audit newMethod should be MANUAL");
  if (audit.correctionReason !== "Phone Issue") throw new Error("Audit correctionReason mismatch");
  if (audit.modifiedByTeacherId !== teacher.userId) throw new Error("Audit modifiedByTeacherId mismatch");
  console.log("PASS: Database state and AttendanceCorrection audit log successfully validated.");

  // Test 3: Lock Check (Additional Correction Attempt)
  console.log("\n--- TEST 3: Attempt second manual correction on same session (Lock Check) ---");
  res = await makeRequest(patchOptions, JSON.stringify({ reason: "Emergency" }));
  console.log("PATCH Response Status (Expected 409):", res.statusCode);
  console.log("PATCH Response Body:", res.body);
  if (res.statusCode !== 409) {
    console.error("FAIL: Lock failed. Second correction should be rejected with 409.");
    process.exit(1);
  }
  console.log("PASS: Second correction properly locked and rejected with HTTP 409.");

  // Test 4: GET Student History - Corrected State
  console.log("\n--- TEST 4: GET student history after correction ---");
  res = await makeRequest(getOptions);
  console.log("GET Response Status:", res.statusCode);
  if (res.statusCode !== 200) {
    console.error("FAIL: History retrieval failed");
    process.exit(1);
  }

  history = res.body.data;
  console.log("Summary metrics:");
  console.log(`  totalSessions:         ${history.summary.totalSessions}`);
  console.log(`  presentCount:          ${history.summary.presentCount}`);
  console.log(`  absentCount:           ${history.summary.absentCount}`);
  console.log(`  qrCount:               ${history.summary.qrCount}`);
  console.log(`  manualCount:           ${history.summary.manualCount}`);
  console.log(`  reliabilityPercentage: ${history.summary.reliabilityPercentage}`);
  console.log(`  correctionCount:       ${history.summary.correctionCount}`);
  console.log(`  lastAttendedDate:      ${history.summary.lastAttendedDate}`);
  console.log(`  currentAbsenceStreak:  ${history.summary.currentAbsenceStreak}`);

  // Assertions for Test 4
  if (history.summary.presentCount !== 1) throw new Error("presentCount should be 1");
  if (history.summary.absentCount !== sessions.length - 1) throw new Error("absentCount should be totalSessions - 1");
  if (history.summary.qrCount !== 0) throw new Error("qrCount should be 0");
  if (history.summary.manualCount !== 1) throw new Error("manualCount should be 1");
  if (history.summary.reliabilityPercentage !== 0) throw new Error("reliabilityPercentage should be 0 since QR is 0 and Present is 1");
  if (history.summary.hasAttendanceData !== true) throw new Error("hasAttendanceData should be true when presentCount > 0");
  if (history.summary.correctionCount !== 1) throw new Error("correctionCount should be 1");
  if (!history.summary.lastAttendedDate) throw new Error("lastAttendedDate should not be null");
  
  const expectedStreak = sessions.length - 1 - 1; // totalSessions - 1 - lastPresentIndex(which is 1) => 3 - 1 - 1 = 1
  if (history.summary.currentAbsenceStreak !== expectedStreak) {
    throw new Error(`currentAbsenceStreak should be ${expectedStreak}, got ${history.summary.currentAbsenceStreak}`);
  }
  
  // Timeline checks
  const timelineItem = history.timeline.find(t => t.sessionId === targetSession.id);
  if (!timelineItem) throw new Error("Timeline item for Session 2 not found");
  console.log("Timeline entry for corrected session:");
  console.log("  status:", timelineItem.status);
  console.log("  method:", timelineItem.method);
  console.log("  sessionDate:", timelineItem.sessionDate);
  console.log("  correctionDate:", timelineItem.correctionDate);
  console.log("  modifiedBy:", timelineItem.modifiedBy);
  console.log("  correctionReason:", timelineItem.correctionReason);

  if (timelineItem.status !== "Present") throw new Error("Timeline status should be Present");
  if (timelineItem.method !== "MANUAL") throw new Error("Timeline method should be MANUAL");
  if (!timelineItem.sessionDate) throw new Error("sessionDate missing");
  if (!timelineItem.correctionDate) throw new Error("correctionDate missing");
  if (timelineItem.modifiedBy !== "You") throw new Error("modifiedBy should be 'You'");
  if (timelineItem.correctionReason !== "Phone Issue") throw new Error("correctionReason mismatch");

  console.log("PASS: Post-correction history metrics and timeline validated successfully!");
  console.log("\n=== ALL TEST CASES PASSED SUCCESSFULLY ===");
  process.exit(0);
}

runTests()
  .catch(err => {
    console.error("FATAL ERROR IN TEST RUN:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
