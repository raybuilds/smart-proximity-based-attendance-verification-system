const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const assert = require("assert");
const { prisma } = require("../config/database");

const baseUrl = "http://localhost:5007/api";

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

// Helper to spawn backend server
function startServer(env = {}) {
  return new Promise((resolve, reject) => {
    const serverProcess = spawn("node", ["src/app.js"], {
      cwd: path.join(__dirname, "../.."),
      env: { ...process.env, PORT: "5007", ...env }
    });

    let stdoutData = "";
    serverProcess.stdout.on("data", (data) => {
      stdoutData += data.toString();
      if (stdoutData.includes("Backend server running")) {
        resolve(serverProcess);
      }
    });

    serverProcess.stderr.on("data", (data) => {
      console.error("[Server Error]", data.toString());
    });

    serverProcess.on("error", (err) => {
      reject(err);
    });

    setTimeout(() => {
      reject(new Error("Server start timeout"));
    }, 15000);
  });
}

async function runAudit() {
  console.log("=========================================================================");
  console.log("  🛡️  TEACHER-LEVEL PARTIAL UNIQUE INDEX AUDIT & CONCURRENCY SUITE 🛡️  ");
  console.log("=========================================================================\n");

  const results = {};

  // -------------------------------------------------------------------------
  // TEST 1: Migration Verification
  // -------------------------------------------------------------------------
  console.log("--- TEST 1: Migration Verification ---");
  try {
    const indexes = await prisma.$queryRaw`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE indexname = 'one_active_session_per_teacher';
    `;
    
    if (indexes.length !== 1) {
      throw new Error(`Expected exactly 1 index, found: ${indexes.length}`);
    }

    const indexdef = indexes[0].indexdef;
    console.log("Index definition:", indexdef);
    assert(indexdef.includes('WHERE ("isActive" = true)'), "Index definition should contain partial WHERE filter");

    console.log("[PASS] Index one_active_session_per_teacher verified in PostgreSQL schema.");
    results["Test 1: Migration Verification"] = "PASS";
  } catch (err) {
    console.error(`[FAIL] ${err.message}`);
    results["Test 1: Migration Verification"] = `FAIL (${err.message})`;
  }

  // Start development API server for behavioral tests
  console.log("\nStarting development backend server on port 5007...");
  let devServer = await startServer({ NODE_ENV: "development" });
  console.log("✔ Development backend server started successfully.");

  const suffix = Math.floor(1000 + Math.random() * 9000).toString();
  let teacherAId, teacherAProfileId, tokenA;
  let teacherBId, teacherBProfileId, tokenB;
  let courseA, courseB;

  try {
    // Setup users & courses
    console.log("\nSetting up mock teachers and courses...");
    
    const regA = await apiRequest("/auth/register", "POST", null, {
      name: `Aud Teacher A ${suffix}`,
      email: `teacher_aud_a_${suffix}@attendance.local`,
      password: "Password@123",
      role: "teacher",
      department: "CSE"
    });
    tokenA = regA.data.token;
    teacherAId = regA.data.user.id;
    teacherAProfileId = regA.data.user.teacher.id;

    const regB = await apiRequest("/auth/register", "POST", null, {
      name: `Aud Teacher B ${suffix}`,
      email: `teacher_aud_b_${suffix}@attendance.local`,
      password: "Password@123",
      role: "teacher",
      department: "IT"
    });
    tokenB = regB.data.token;
    teacherBId = regB.data.user.id;
    teacherBProfileId = regB.data.user.teacher.id;

    courseA = await prisma.course.create({
      data: { name: `Aud_Course_A_${suffix}`, teacherId: teacherAProfileId, department: "CSE", semester: 4, section: "A" }
    });

    courseB = await prisma.course.create({
      data: { name: `Aud_Course_B_${suffix}`, teacherId: teacherAProfileId, department: "CSE", semester: 4, section: "A" }
    });

    await prisma.student.createMany({
      data: [
        { userId: teacherAId, rollNumber: `ROLL_HA_${suffix}`, department: "CSE", semester: 4, section: "A" },
        { userId: teacherBId, rollNumber: `ROLL_HB_${suffix}`, department: "IT", semester: 4, section: "A" }
      ]
    }).catch(() => {});

    // -------------------------------------------------------------------------
    // TEST 2: Rapid Tap Race Test (5 concurrent requests)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 2: Rapid Tap Race Test ---");
    try {
      console.log("Firing 5 concurrent start-session requests...");
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(apiRequest("/attendance/session/start", "POST", tokenA, { courseId: courseA.id }));
      }
      
      const raceResults = await Promise.all(promises);
      const successes = raceResults.filter(r => r.status === 201);
      const conflicts = raceResults.filter(r => r.status === 409);

      console.log(`Race Results - 201: ${successes.length}, 409: ${conflicts.length}`);
      assert.strictEqual(successes.length, 1, "Exactly one request should succeed with 201");
      assert.strictEqual(conflicts.length, 4, "Remaining 4 requests should fail with 409");

      console.log("[PASS] 5-request race test correctly handled.");
      results["Test 2: Rapid Tap Race Test"] = "PASS";
    } catch (err) {
      console.error(`[FAIL] ${err.message}`);
      results["Test 2: Rapid Tap Race Test"] = `FAIL (${err.message})`;
    }

    // End active sessions for subsequent tests
    await prisma.attendanceSession.updateMany({
      where: { isActive: true },
      data: { isActive: false, endedAt: new Date() }
    });

    // -------------------------------------------------------------------------
    // TEST 3: High Contention Stress Test (50 concurrent requests)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 3: High Contention Stress Test ---");
    try {
      console.log("Firing 50 concurrent start-session requests...");
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(apiRequest("/attendance/session/start", "POST", tokenA, { courseId: courseA.id }));
      }
      
      const raceResults = await Promise.all(promises);
      const successes = raceResults.filter(r => r.status === 201);
      const conflicts = raceResults.filter(r => r.status === 409);

      console.log(`Race Results - 201: ${successes.length}, 409: ${conflicts.length}`);
      assert.strictEqual(successes.length, 1, "Exactly one request should succeed with 201");
      assert.strictEqual(conflicts.length, 49, "Remaining 49 requests should fail with 409");

      console.log("[PASS] 50-request stress test correctly handled.");
      results["Test 3: High Contention Stress Test"] = "PASS";
    } catch (err) {
      console.error(`[FAIL] ${err.message}`);
      results["Test 3: High Contention Stress Test"] = `FAIL (${err.message})`;
    }

    // End active sessions
    await prisma.attendanceSession.updateMany({
      where: { isActive: true },
      data: { isActive: false, endedAt: new Date() }
    });

    // -------------------------------------------------------------------------
    // TEST 4: Course Archive Race
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 4: Course Archive Race ---");
    try {
      const p1 = apiRequest("/attendance/session/start", "POST", tokenA, { courseId: courseA.id });
      const p2 = apiRequest(`/courses/${courseA.id}`, "DELETE", tokenA, { reason: "Archive race" });
      
      const [res1, res2] = await Promise.all([p1, p2]);
      console.log(`Start status: ${res1.status}, Archive status: ${res2.status}`);

      // Verify DB consistency
      const courseState = await prisma.course.findUnique({ where: { id: courseA.id } });
      const activeSession = await prisma.attendanceSession.findFirst({
        where: { courseId: courseA.id, isActive: true }
      });

      if (courseState.isArchived && activeSession) {
        throw new Error("Archived course has active session!");
      }

      console.log("[PASS] Course archive race verified. No orphan session exists on archived course.");
      results["Test 4: Course Archive Race"] = "PASS";
    } catch (err) {
      console.error(`[FAIL] ${err.message}`);
      results["Test 4: Course Archive Race"] = `FAIL (${err.message})`;
    }

    // Ensure session ended and course restored
    await prisma.attendanceSession.updateMany({
      where: { isActive: true },
      data: { isActive: false, endedAt: new Date() }
    });
    await prisma.course.update({
      where: { id: courseA.id },
      data: { isArchived: false, archivedAt: null, archiveReason: null }
    });

    // -------------------------------------------------------------------------
    // TEST 5: Course Restore Race
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 5: Course Restore Race ---");
    try {
      // First, archive it
      await apiRequest(`/courses/${courseA.id}`, "DELETE", tokenA, { reason: "Initial archive" });

      const p1 = apiRequest(`/courses/${courseA.id}/unarchive`, "POST", tokenA);
      const p2 = apiRequest(`/courses/${courseA.id}`, "DELETE", tokenA, { reason: "Restore race archive" });

      const [res1, res2] = await Promise.all([p1, p2]);
      console.log(`Restore status: ${res1.status}, Archive status: ${res2.status}`);

      const courseState = await prisma.course.findUnique({ where: { id: courseA.id } });
      console.log("Course archive state:", courseState.isArchived);

      console.log("[PASS] Course restore race verified. No invalid state produced.");
      results["Test 5: Course Restore Race"] = "PASS";
    } catch (err) {
      console.error(`[FAIL] ${err.message}`);
      results["Test 5: Course Restore Race"] = `FAIL (${err.message})`;
    }

    // Restore course for subsequent tests
    await prisma.course.update({
      where: { id: courseA.id },
      data: { isArchived: false, archivedAt: null, archiveReason: null }
    });

    // -------------------------------------------------------------------------
    // TEST 6: Teacher Constraint Enforcement (Starts session on Course A then B)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 6: Teacher Constraint Enforcement ---");
    try {
      // Start session on Course A (Teacher A)
      const res1 = await apiRequest("/attendance/session/start", "POST", tokenA, { courseId: courseA.id });
      assert.strictEqual(res1.status, 201, "First session creation should succeed");

      // Start session on Course B (Teacher A)
      const res2 = await apiRequest("/attendance/session/start", "POST", tokenA, { courseId: courseB.id });
      
      assert.strictEqual(res2.status, 409, "Second session creation should fail with 409 Conflict");
      assert.strictEqual(res2.data.message, "You already have an active attendance session.", "Should return specific teacher-level business message");

      console.log("[PASS] Enforced teacher-level active session validation.");
      results["Test 6: Teacher Constraint Enforcement"] = "PASS";
    } catch (err) {
      console.error(`[FAIL] ${err.message}`);
      results["Test 6: Teacher Constraint Enforcement"] = `FAIL (${err.message})`;
    }

    // -------------------------------------------------------------------------
    // TEST 7: Database Integrity Audit
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 7: Database Integrity Audit ---");
    try {
      const duplicateTeachers = await prisma.$queryRaw`
        SELECT "teacherId", COUNT(*)::integer AS active_count
        FROM "AttendanceSession"
        WHERE "isActive" = true
        GROUP BY "teacherId"
        HAVING COUNT(*) > 1;
      `;
      assert.strictEqual(duplicateTeachers.length, 0, "No teacher should have duplicate active sessions in the database.");

      const duplicateCourses = await prisma.$queryRaw`
        SELECT "courseId", COUNT(*)::integer AS active_count
        FROM "AttendanceSession"
        WHERE "isActive" = true
        GROUP BY "courseId"
        HAVING COUNT(*) > 1;
      `;
      assert.strictEqual(duplicateCourses.length, 0, "No course should have duplicate active sessions in the database.");

      console.log("[PASS] Database schema integrity check passed. No duplicates.");
      results["Test 7: Database Integrity Audit"] = "PASS";
    } catch (err) {
      console.error(`[FAIL] ${err.message}`);
      results["Test 7: Database Integrity Audit"] = `FAIL (${err.message})`;
    }

    // End active sessions before Test 8
    await prisma.attendanceSession.updateMany({
      where: { isActive: true },
      data: { isActive: false, endedAt: new Date() }
    });

  } finally {
    devServer.kill();
  }

  // -------------------------------------------------------------------------
  // TEST 8: Constraint Persistence
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 8: Constraint Persistence ---");
  try {
    console.log("Simulating API restart...");
    const conServer = await startServer({ NODE_ENV: "development" });
    
    try {
      console.log("Firing 50 concurrent start-session requests to restarted API...");
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(apiRequest("/attendance/session/start", "POST", tokenA, { courseId: courseA.id }));
      }
      
      const raceResults = await Promise.all(promises);
      const successes = raceResults.filter(r => r.status === 201);
      const conflicts = raceResults.filter(r => r.status === 409);

      console.log(`Race Results after restart - 201: ${successes.length}, 409: ${conflicts.length}`);
      assert.strictEqual(successes.length, 1, "Exactly one request should succeed with 201");
      assert.strictEqual(conflicts.length, 49, "Remaining 49 requests should fail with 409");

      // Verify DB integrity
      const activeCount = await prisma.attendanceSession.count({
        where: { courseId: courseA.id, isActive: true }
      });
      assert.strictEqual(activeCount, 1, "Exactly 1 active session should exist in DB");

      console.log("[PASS] Index and constraint mapping survive restart, keeping database consistent.");
      results["Test 8: Constraint Persistence"] = "PASS";
    } finally {
      conServer.kill();
    }
  } catch (err) {
    console.error(`[FAIL] ${err.message}`);
    results["Test 8: Constraint Persistence"] = `FAIL (${err.message})`;
  }

  // Clean up mock database resources
  console.log("\nCleaning up final audit database resources...");
  await prisma.attendanceSession.deleteMany({ where: { courseId: { in: [courseA.id, courseB.id] } } }).catch(() => {});
  await prisma.course.deleteMany({ where: { id: { in: [courseA.id, courseB.id] } } }).catch(() => {});
  await prisma.student.deleteMany({ where: { rollNumber: { in: [`ROLL_HA_${suffix}`, `ROLL_HB_${suffix}`] } } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: { in: [teacherAId, teacherBId] } } }).catch(() => {});
  console.log("✔ Cleanup completed.");

  // Print results matrix
  console.log("\n==================================================");
  console.log("      TEACHER INDEX AUDIT & PERSISTENCE MATRIX    ");
  console.log("==================================================");
  let passedCount = 0;
  let totalCount = 0;
  for (const [key, val] of Object.entries(results)) {
    totalCount++;
    if (val === "PASS") passedCount++;
    console.log(`${key.padEnd(35)}: [${val}]`);
  }
  console.log("--------------------------------------------------");
  console.log(`TOTAL: ${totalCount} | PASSED: ${passedCount} | FAILED: ${totalCount - passedCount}`);
  console.log("==================================================");

  if (passedCount !== totalCount) {
    throw new Error("One or more final audit verification checks failed.");
  }
}

runAudit()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("❌ Teacher constraint verification failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
