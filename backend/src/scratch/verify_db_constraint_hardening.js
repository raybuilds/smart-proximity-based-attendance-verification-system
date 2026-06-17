const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const assert = require("assert");
const { prisma } = require("../config/database");
const jwt = require("jsonwebtoken");

const baseUrl = "http://localhost:5005/api";
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
      env: { ...process.env, PORT: "5005", ...env }
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

    // Timeout after 10 seconds if server doesn't start
    setTimeout(() => {
      reject(new Error("Server start timeout"));
    }, 10000);
  });
}

async function runTests() {
  console.log("=========================================================================");
  console.log("   🛡️  DATABASE CONSTRAINT HARDENING & ERROR SANITIZATION AUDIT SUITE 🛡️   ");
  console.log("=========================================================================\n");

  const results = {};

  // -------------------------------------------------------------------------
  // TEST 1: Migration Exists
  // -------------------------------------------------------------------------
  console.log("--- TEST 1: Migration Exists ---");
  try {
    const migrationsDir = path.join(__dirname, "../../prisma/migrations");
    const folders = fs.readdirSync(migrationsDir);
    const indexMigration = folders.find(f => f.includes("add_one_active_session_per_course_unique_index"));
    
    if (!indexMigration) {
      throw new Error("Migration folder not found.");
    }
    
    const sqlPath = path.join(migrationsDir, indexMigration, "migration.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf8");
    
    if (!sqlContent.includes("one_active_session_per_course")) {
      throw new Error("migration.sql does not reference one_active_session_per_course");
    }

    console.log(`[PASS] Found migration folder: ${indexMigration}`);
    results["Test 1: Migration Exists"] = "PASS";
  } catch (err) {
    console.error(`[FAIL] ${err.message}`);
    results["Test 1: Migration Exists"] = `FAIL (${err.message})`;
  }

  // -------------------------------------------------------------------------
  // TEST 2: Schema Verification
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 2: Schema Verification ---");
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
    results["Test 2: Schema Verification"] = "PASS";
  } catch (err) {
    console.error(`[FAIL] ${err.message}`);
    results["Test 2: Schema Verification"] = `FAIL (${err.message})`;
  }

  // Start development API server for behavioral tests
  console.log("\nStarting development backend server on port 5005...");
  const devServer = await startServer({ NODE_ENV: "development" });
  console.log("✔ Development backend server started successfully.");

  const suffix = Math.floor(1000 + Math.random() * 9000).toString();
  let teacherAId, teacherAProfileId, tokenA;
  let teacherBId, teacherBProfileId, tokenB;
  let courseA, courseB;

  try {
    // Setup users & courses
    console.log("\nSetting up mock teachers and courses...");
    
    const regA = await apiRequest("/auth/register", "POST", null, {
      name: `Hardened Teacher A ${suffix}`,
      email: `teacher_ha_${suffix}@attendance.local`,
      password: "Password@123",
      role: "teacher",
      department: "CSE"
    });
    tokenA = regA.data.token;
    teacherAId = regA.data.user.id;
    teacherAProfileId = regA.data.user.teacher.id;

    const regB = await apiRequest("/auth/register", "POST", null, {
      name: `Hardened Teacher B ${suffix}`,
      email: `teacher_hb_${suffix}@attendance.local`,
      password: "Password@123",
      role: "teacher",
      department: "IT"
    });
    tokenB = regB.data.token;
    teacherBId = regB.data.user.id;
    teacherBProfileId = regB.data.user.teacher.id;

    courseA = await prisma.course.create({
      data: { name: `H_Course_A_${suffix}`, teacherId: teacherAProfileId, department: "CSE", semester: 4, section: "A" }
    });

    courseB = await prisma.course.create({
      data: { name: `H_Course_B_${suffix}`, teacherId: teacherBProfileId, department: "IT", semester: 4, section: "A" }
    });

    // Create 1 student in each department so eligibility count isn't 0
    await prisma.student.createMany({
      data: [
        { userId: teacherAId, rollNumber: `ROLL_HA_${suffix}`, department: "CSE", semester: 4, section: "A" },
        { userId: teacherBId, rollNumber: `ROLL_HB_${suffix}`, department: "IT", semester: 4, section: "A" }
      ]
    }).catch(() => {}); // catch duplicates if any, since student unique constraint might conflict

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

    // End active sessions for subsequent tests
    await prisma.attendanceSession.updateMany({
      where: { isActive: true },
      data: { isActive: false, endedAt: new Date() }
    });

    // -------------------------------------------------------------------------
    // TEST 4: Service-Level Duplicate Session Protection
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 4: Service-Level Duplicate Session Protection ---");
    try {
      // Start session on Course A
      await apiRequest("/attendance/session/start", "POST", tokenA, { courseId: courseA.id });
      
      // Attempt duplicate session creation for Course A under Teacher A (owner)
      const dupRes = await apiRequest("/attendance/session/start", "POST", tokenA, { courseId: courseA.id });
      
      assert.strictEqual(dupRes.status, 409, "Should return 409 Conflict");
      assert.strictEqual(dupRes.data.success, false, "Should return success: false");
      assert.strictEqual(dupRes.data.message, "An active session already exists for this course.", "Should return specific business message");

      console.log("[PASS] Correctly rejected duplicate active session with 409 and business message.");
      results["Test 4: Service-Level Protection"] = "PASS";
    } catch (err) {
      console.error(`[FAIL] ${err.message}`);
      results["Test 4: Service-Level Protection"] = `FAIL (${err.message})`;
    }

    // -------------------------------------------------------------------------
    // TEST 5: Database-Level Constraint Protection
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 5: Database-Level Constraint Protection ---");
    try {
      // Direct raw query to insert a duplicate active session for Course A, bypassing application locks
      let dbErrorThrown = false;
      try {
        await prisma.$executeRaw`
          INSERT INTO "AttendanceSession" ("teacherId", "courseId", "sessionCode", "isActive", "startedAt")
          VALUES (${teacherBId}, ${courseA.id}, 'MOCKXX', true, NOW());
        `;
      } catch (err) {
        dbErrorThrown = true;
        const msg = err.message || "";
        assert(msg.includes("one_active_session_per_course") || msg.includes("unique constraint") || msg.includes("already exists") || msg.includes("23505"), 
          "Error message should mention unique constraint, index name, or constraint details");
      }

      assert.strictEqual(dbErrorThrown, true, "Database should block direct duplicate active insert");
      console.log("[PASS] Database blocked duplicate active session row via partial unique index.");
      results["Test 5: Database-Level Protection"] = "PASS";
    } catch (err) {
      console.error(`[FAIL] ${err.message}`);
      results["Test 5: Database-Level Protection"] = `FAIL (${err.message})`;
    }

    // End active sessions before Test 7
    await prisma.attendanceSession.updateMany({
      where: { isActive: true },
      data: { isActive: false, endedAt: new Date() }
    });

  } finally {
    // Stop development server
    devServer.kill();
  }

  // -------------------------------------------------------------------------
  // TEST 6: Error Sanitization
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 6: Error Sanitization ---");
  console.log("Starting production backend server on port 5005...");
  const prodServer = await startServer({ NODE_ENV: "production" });
  console.log("✔ Production backend server started successfully.");

  try {
    // Request that causes an integer overflow out-of-range database query error
    const errRes = await apiRequest("/reports/courses/99999999999999999999/defaulters", "GET", tokenA);
    
    console.log("Production error status code:", errRes.status);
    console.log("Production error payload:", JSON.stringify(errRes.data));

    assert.strictEqual(errRes.status, 500, "Should return 500 Internal Server Error");
    assert.strictEqual(errRes.data.success, false, "Should return success: false");
    assert.strictEqual(errRes.data.message, "Internal server error", "Should mask raw database internals");
    assert.strictEqual(errRes.data.stack, undefined, "Stack trace must not leak in production");
    
    // Check that no database internals leak
    const payloadStr = JSON.stringify(errRes.data);
    assert.strictEqual(payloadStr.includes("PostgreSQL"), false, "Should not leak PostgreSQL references");
    assert.strictEqual(payloadStr.includes("Prisma"), false, "Should not leak Prisma references");
    assert.strictEqual(payloadStr.includes("out of range"), false, "Should not leak driver text");

    console.log("[PASS] Production API successfully sanitized database internal errors.");
    results["Test 6: Error Sanitization"] = "PASS";
  } catch (err) {
    console.error(`[FAIL] ${err.message}`);
    results["Test 6: Error Sanitization"] = `FAIL (${err.message})`;
  } finally {
    prodServer.kill();
  }

  // Restart development server for Test 7 (concurrency)
  console.log("\nStarting development backend server on port 5005 for concurrency tests...");
  const conServer = await startServer({ NODE_ENV: "development" });
  console.log("✔ Development backend server started successfully.");

  try {
    // -------------------------------------------------------------------------
    // TEST 7: Real Concurrent API Race Test
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 7: Real Concurrent API Race Test ---");
    try {
      console.log("Firing 5 concurrent start-session requests...");
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(apiRequest("/attendance/session/start", "POST", tokenA, { courseId: courseA.id }));
      }
      
      const raceResults = await Promise.all(promises);
      const successes = raceResults.filter(r => r.status === 201);
      const conflicts = raceResults.filter(r => r.status === 409);

      console.log(`Race Results - 201 Created: ${successes.length}, 409 Conflict: ${conflicts.length}`);
      
      assert.strictEqual(successes.length, 1, "Exactly one request should succeed with 201");
      assert.strictEqual(conflicts.length, 4, "Remaining 4 requests should fail with 409");

      console.log("[PASS] Request race correctly distributed (1 Success, 4 Conflicts).");
      results["Test 7: Concurrent API Race Test"] = "PASS";
    } catch (err) {
      console.error(`[FAIL] ${err.message}`);
      results["Test 7: Concurrent API Race Test"] = `FAIL (${err.message})`;
    }

    // -------------------------------------------------------------------------
    // TEST 8: Post-Concurrency Integrity Verification
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 8: Post-Concurrency Database Integrity Validation ---");
    try {
      const activeCount = await prisma.attendanceSession.count({
        where: {
          courseId: courseA.id,
          isActive: true
        }
      });
      console.log(`Active sessions in database for Course A: ${activeCount}`);
      
      assert.strictEqual(activeCount, 1, "Exactly 1 active session should remain in the database");

      // Verify no duplicate active sessions exist
      const activeSessions = await prisma.attendanceSession.findMany({
        where: { courseId: courseA.id, isActive: true }
      });
      assert.strictEqual(activeSessions.length, 1, "Should have exactly 1 active session row");

      console.log("[PASS] Database remains consistent. No duplicate active session rows or orphans.");
      results["Test 8: Database Integrity Check"] = "PASS";
    } catch (err) {
      console.error(`[FAIL] ${err.message}`);
      results["Test 8: Database Integrity Check"] = `FAIL (${err.message})`;
    }

  } finally {
    // Stop server
    conServer.kill();

    // Clean up mock database resources
    console.log("\nCleaning up constraint audit resources...");
    await prisma.attendanceSession.deleteMany({ where: { courseId: { in: [courseA.id, courseB.id] } } }).catch(() => {});
    await prisma.course.deleteMany({ where: { id: { in: [courseA.id, courseB.id] } } }).catch(() => {});
    await prisma.student.deleteMany({ where: { rollNumber: { in: [`ROLL_HA_${suffix}`, `ROLL_HB_${suffix}`] } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [teacherAId, teacherBId] } } }).catch(() => {});
    console.log("✔ Cleanup completed.");
  }

  // Print results matrix
  console.log("\n==================================================");
  console.log("     CONSTRAINT HARDENING VERIFICATION MATRIX      ");
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
    throw new Error("One or more constraint verification checks failed.");
  }
}

runTests()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("❌ Constraint hardening verification failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
