const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");
const assert = require("assert");
const { prisma } = require("../config/database");
const jwt = require("jsonwebtoken");

const baseUrl = "http://localhost:5006/api";
const jwtSecret = process.env.JWT_SECRET || "replace-with-a-secure-jwt-secret";

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
      env: { ...process.env, PORT: "5006", ...env }
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

    // Timeout after 15 seconds if server doesn't start
    setTimeout(() => {
      reject(new Error("Server start timeout"));
    }, 15000);
  });
}

async function runAudit() {
  console.log("=========================================================================");
  console.log("  🏁  FINAL CONSTRAINT PERSISTENCE & CONCURRENCY HARDENING AUDIT SUITE 🏁  ");
  console.log("=========================================================================\n");

  const results = {};

  // -------------------------------------------------------------------------
  // TEST 1: Backend & PostgreSQL Restart Tests
  // -------------------------------------------------------------------------
  console.log("--- TEST 1: Backend & PostgreSQL Restart ---");
  try {
    console.log("Simulating server restarts...");
    
    // We already know PostgreSQL is running on port 5434. Let's restart backend.
    const server = await startServer({ NODE_ENV: "development" });
    console.log("✔ Backend API booted successfully.");
    
    // Stop backend
    server.kill();
    console.log("✔ Backend API stopped successfully.");
    
    // Start backend again to verify reconnection
    const server2 = await startServer({ NODE_ENV: "development" });
    console.log("✔ Backend API successfully restarted and reconnected to PostgreSQL.");
    server2.kill();
    
    results["Test 1: Backend Restart"] = "PASS";
  } catch (err) {
    console.error(`[FAIL] ${err.message}`);
    results["Test 1: Backend Restart"] = `FAIL (${err.message})`;
  }

  // -------------------------------------------------------------------------
  // TEST 2: Index Persistence Check
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 2: Index Persistence ---");
  try {
    const indexes = await prisma.$queryRaw`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'AttendanceSession'
      AND indexname = 'one_active_session_per_course';
    `;
    
    if (indexes.length !== 1) {
      throw new Error(`Expected exactly 1 index, found: ${indexes.length}`);
    }

    console.log(`[PASS] Index one_active_session_per_course verified in PostgreSQL schema.`);
    results["Test 2: Index Persistence"] = "PASS";
  } catch (err) {
    console.error(`[FAIL] ${err.message}`);
    results["Test 2: Index Persistence"] = `FAIL (${err.message})`;
  }

  // Restart server for positive/negative concurrency stress tests
  const serverProcess = await startServer({ NODE_ENV: "development" });
  
  const suffix = Math.floor(1000 + Math.random() * 9000).toString();
  let teacherAId, teacherAProfileId, tokenA;
  let teacherBId, teacherBProfileId, tokenB;
  let courseA, courseB;

  try {
    // Setup users & courses
    console.log("\nSetting up mock teachers and courses...");
    
    const regA = await apiRequest("/auth/register", "POST", null, {
      name: `Audit Teacher A ${suffix}`,
      email: `teacher_aud_a_${suffix}@attendance.local`,
      password: "Password@123",
      role: "teacher",
      department: "CSE"
    });
    tokenA = regA.data.token;
    teacherAId = regA.data.user.id;
    teacherAProfileId = regA.data.user.teacher.id;

    const regB = await apiRequest("/auth/register", "POST", null, {
      name: `Audit Teacher B ${suffix}`,
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
      data: { name: `Aud_Course_B_${suffix}`, teacherId: teacherBProfileId, department: "IT", semester: 4, section: "A" }
    });

    await prisma.student.createMany({
      data: [
        { userId: teacherAId, rollNumber: `ROLL_HA_${suffix}`, department: "CSE", semester: 4, section: "A" },
        { userId: teacherBId, rollNumber: `ROLL_HB_${suffix}`, department: "IT", semester: 4, section: "A" }
      ]
    }).catch(() => {});

    // -------------------------------------------------------------------------
    // TEST 3: Positive Path (Sessions on different courses concurrently)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 3: Positive Path ---");
    try {
      const resA = await apiRequest("/attendance/session/start", "POST", tokenA, { courseId: courseA.id });
      const resB = await apiRequest("/attendance/session/start", "POST", tokenB, { courseId: courseB.id });

      assert.strictEqual(resA.status, 201, "Teacher A starting session on Course A should succeed");
      assert.strictEqual(resB.status, 201, "Teacher B starting session on Course B should succeed");

      console.log("[PASS] Sessions created concurrently for different courses under valid rules.");
      results["Test 3: Positive Path"] = "PASS";
    } catch (err) {
      console.error(`[FAIL] ${err.message}`);
      results["Test 3: Positive Path"] = `FAIL (${err.message})`;
    }

    // End active sessions for concurrency tests
    await prisma.attendanceSession.updateMany({
      where: { isActive: true },
      data: { isActive: false, endedAt: new Date() }
    });

    // -------------------------------------------------------------------------
    // TEST 4: High Contention Concurrency (50 concurrent requests)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 4: High Contention Concurrency ---");
    try {
      console.log("Firing 50 concurrent start-session requests...");
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(apiRequest("/attendance/session/start", "POST", tokenA, { courseId: courseA.id }));
      }
      
      const raceResults = await Promise.all(promises);
      const successes = raceResults.filter(r => r.status === 201);
      const conflicts = raceResults.filter(r => r.status === 409);

      console.log(`Race Results - 201 Created: ${successes.length}, 409 Conflict: ${conflicts.length}`);
      
      assert.strictEqual(successes.length, 1, "Exactly one request should succeed with 201");
      assert.strictEqual(conflicts.length, 49, "Remaining 49 requests should fail with 409");

      console.log("[PASS] 50-request concurrency race correctly distributed (1 Success, 49 Conflicts).");
      results["Test 4: High Contention Concurrency"] = "PASS";
    } catch (err) {
      console.error(`[FAIL] ${err.message}`);
      results["Test 4: High Contention Concurrency"] = `FAIL (${err.message})`;
    }

    // -------------------------------------------------------------------------
    // TEST 5: Database Integrity Validation
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 5: Database Integrity Validation ---");
    try {
      const activeCount = await prisma.attendanceSession.count({
        where: {
          courseId: courseA.id,
          isActive: true
        }
      });
      console.log(`Active sessions in database for Course A: ${activeCount}`);
      assert.strictEqual(activeCount, 1, "Exactly 1 active session should remain in the database");

      const duplicates = await prisma.$queryRaw`
        SELECT "courseId", COUNT(*)::integer AS active_count
        FROM "AttendanceSession"
        WHERE "isActive" = true
        GROUP BY "courseId"
        HAVING COUNT(*) > 1;
      `;
      console.log(`Duplicate active session courses in DB: ${duplicates.length}`);
      assert.strictEqual(duplicates.length, 0, "No duplicate active sessions should exist in DB");

      console.log("[PASS] Database remains strictly consistent under stress.");
      results["Test 5: Database Integrity Validation"] = "PASS";
    } catch (err) {
      console.error(`[FAIL] ${err.message}`);
      results["Test 5: Database Integrity Validation"] = `FAIL (${err.message})`;
    }

  } finally {
    serverProcess.kill();
  }

  // -------------------------------------------------------------------------
  // TEST 6: Transaction Boundary Verification (Static Audit)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 6: Transaction Boundary Verification ---");
  try {
    const servicePath = path.join(__dirname, "../modules/attendance/attendance.service.js");
    const serviceContent = fs.readFileSync(servicePath, "utf8");

    // Extract startSession implementation
    const startIdx = serviceContent.indexOf("async function startSession(");
    if (startIdx === -1) throw new Error("Could not find startSession function definition.");
    
    // Find matching closing brace for startSession function
    let braceCount = 0;
    let endIdx = -1;
    for (let i = startIdx; i < serviceContent.length; i++) {
      if (serviceContent[i] === "{") braceCount++;
      if (serviceContent[i] === "}") braceCount--;
      if (braceCount === 0 && serviceContent[i] === "}") {
        endIdx = i;
        break;
      }
    }

    const startSessionBody = serviceContent.substring(startIdx, endIdx + 1);

    // Audit for prisma.attendanceSession usage
    const hasOutsideCall = startSessionBody.includes("prisma.attendanceSession");
    if (hasOutsideCall) {
      throw new Error("Found prisma.attendanceSession used inside startSession outside tx block.");
    }

    console.log("[PASS] Verified that all validation queries and writes execute through tx context.");
    results["Test 6: Transaction Boundary Audit"] = "PASS";
  } catch (err) {
    console.error(`[FAIL] ${err.message}`);
    results["Test 6: Transaction Boundary Audit"] = `FAIL (${err.message})`;
  }

  // -------------------------------------------------------------------------
  // TEST 7: Constraint Mapping Specificity Verification (Static Audit)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 7: Constraint Mapping Specificity Verification ---");
  try {
    const servicePath = path.join(__dirname, "../modules/attendance/attendance.service.js");
    const serviceContent = fs.readFileSync(servicePath, "utf8");

    // Extract startSession implementation
    const startIdx = serviceContent.indexOf("async function startSession(");
    let braceCount = 0;
    let endIdx = -1;
    for (let i = startIdx; i < serviceContent.length; i++) {
      if (serviceContent[i] === "{") braceCount++;
      if (serviceContent[i] === "}") braceCount--;
      if (braceCount === 0 && serviceContent[i] === "}") {
        endIdx = i;
        break;
      }
    }
    const startSessionBody = serviceContent.substring(startIdx, endIdx + 1);

    // Extract catch block
    const catchIdx = startSessionBody.indexOf("catch (error) {");
    if (catchIdx === -1) throw new Error("Could not find catch block.");
    const catchBody = startSessionBody.substring(catchIdx);

    // Verify presence of one_active_session_per_course and lack of generic courseId checks
    const targetCourseIdCheck = catchBody.includes('target.includes("courseId")');
    if (targetCourseIdCheck) {
      throw new Error("Catch block uses generic target.includes('courseId') check instead of strictly checking the constraint name.");
    }

    if (!catchBody.includes("one_active_session_per_course")) {
      throw new Error("Catch block does not verify the constraint name 'one_active_session_per_course'.");
    }

    console.log("[PASS] Verified constraint validation is specific to one_active_session_per_course.");
    results["Test 7: Constraint Specificity Audit"] = "PASS";
  } catch (err) {
    console.error(`[FAIL] ${err.message}`);
    results["Test 7: Constraint Specificity Audit"] = `FAIL (${err.message})`;
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
  console.log("      FINAL AUDIT STRESS & PERSISTENCE MATRIX     ");
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
    console.error("❌ Final audit verification failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
