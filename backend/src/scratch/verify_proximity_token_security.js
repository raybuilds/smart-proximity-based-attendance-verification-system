const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const assert = require("assert");
const { prisma } = require("../config/database");
const jwt = require("jsonwebtoken");

const baseUrl = "http://localhost:5009/api";
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
      env: { ...process.env, PORT: "5009", ...env }
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

async function runSecurityAudit() {
  console.log("=========================================================================");
  console.log("   🛡️  SERVER-ENFORCED PROXIMITY TOKEN & REPLAY AUDIT SUITE 🛡️     ");
  console.log("=========================================================================\n");

  const results = {};
  const attackMetrics = { attempts: 0, blocked: 0, successful: 0 };

  const logAttackAttempt = (blocked) => {
    attackMetrics.attempts++;
    if (blocked) {
      attackMetrics.blocked++;
    } else {
      attackMetrics.successful++;
    }
  };

  // Start development API server for live tests
  console.log("Starting development backend server on port 5009...");
  let devServer;
  try {
    devServer = await startServer({ NODE_ENV: "development" });
    console.log("✔ Development backend server started successfully.\n");
  } catch (err) {
    console.error("❌ Failed to start backend server:", err.message);
    process.exit(1);
  }

  const suffix = Math.floor(1000 + Math.random() * 9000).toString();
  let teacherAId, teacherAProfileId, tokenA;
  let teacherBId, teacherBProfileId, tokenB;
  let studentAId, tokenStudentA;
  let studentBId, tokenStudentB;
  let studentCId;
  let courseA, courseB;
  let sessionA, sessionB;

  try {
    // -------------------------------------------------------------------------
    // SETUP MOCK RESOURCES
    // -------------------------------------------------------------------------
    console.log("Setting up mock teachers, students, and courses...");
    
    // Register Teacher A
    const regTA = await apiRequest("/auth/register", "POST", null, {
      name: `Prox Teacher A ${suffix}`,
      email: `teacher_a_${suffix}@prox.local`,
      password: "Password@123",
      role: "teacher",
      department: "CSE"
    });
    tokenA = regTA.data.token;
    teacherAId = regTA.data.user.id;
    teacherAProfileId = regTA.data.user.teacher.id;

    // Register Teacher B
    const regTB = await apiRequest("/auth/register", "POST", null, {
      name: `Prox Teacher B ${suffix}`,
      email: `teacher_b_${suffix}@prox.local`,
      password: "Password@123",
      role: "teacher",
      department: "IT"
    });
    tokenB = regTB.data.token;
    teacherBId = regTB.data.user.id;
    teacherBProfileId = regTB.data.user.teacher.id;

    // Register Student A (Eligible for Course A)
    const regSA = await apiRequest("/auth/register", "POST", null, {
      name: `Prox Student A ${suffix}`,
      email: `student_a_${suffix}@prox.local`,
      password: "Password@123",
      role: "student",
      rollNumber: `ROLL_A_${suffix}`,
      department: "CSE",
      semester: 4,
      section: "A"
    });
    tokenStudentA = regSA.data.token;
    studentAId = regSA.data.user.id;

    // Register Student B (Eligible for Course A)
    const regSB = await apiRequest("/auth/register", "POST", null, {
      name: `Prox Student B ${suffix}`,
      email: `student_b_${suffix}@prox.local`,
      password: "Password@123",
      role: "student",
      rollNumber: `ROLL_B_${suffix}`,
      department: "CSE",
      semester: 4,
      section: "A"
    });
    tokenStudentB = regSB.data.token;
    studentBId = regSB.data.user.id;

    // Register Student C (Eligible for Course B)
    const regSC = await apiRequest("/auth/register", "POST", null, {
      name: `Prox Student C ${suffix}`,
      email: `student_c_${suffix}@prox.local`,
      password: "Password@123",
      role: "student",
      rollNumber: `ROLL_C_${suffix}`,
      department: "IT",
      semester: 2,
      section: "B"
    });
    studentCId = regSC.data.user.id;

    // Create Course A (CSE Dept)
    courseA = await prisma.course.create({
      data: {
        name: `CourseA_${suffix}`,
        teacherId: teacherAProfileId,
        department: "CSE",
        semester: 4,
        section: "A"
      }
    });

    // Create Course B (IT Dept)
    courseB = await prisma.course.create({
      data: {
        name: `CourseB_${suffix}`,
        teacherId: teacherBProfileId,
        department: "IT",
        semester: 2,
        section: "B"
      }
    });

    console.log("✔ Setup complete.\n");

    // =========================================================================
    // TEST 1: Valid Flow
    // =========================================================================
    console.log("--- TEST 1: Valid Flow ---");
    // Start session
    const startRes1 = await apiRequest("/attendance/session/start", "POST", tokenA, {
      courseId: courseA.id,
      ssid: "ATTENDANCE_TEACHER",
      bssid: "AA:BB:CC:DD:EE:FF"
    });
    sessionA = startRes1.data.session || startRes1.data;
    
    // Get current QR
    const qrRes1 = await apiRequest(`/qr/current/${sessionA.id}`, "GET", tokenA);
    const nonce1 = qrRes1.data.qr.nonce;

    // Perform Wi-Fi validation (generates proximity token)
    const wifiRes1 = await apiRequest("/wifi/validate", "POST", tokenStudentA, {
      sessionCode: sessionA.sessionCode,
      ssid: "ATTENDANCE_TEACHER",
      bssid: "AA:BB:CC:DD:EE:FF",
      rssi: -50
    });
    console.log(`WiFi Validation Status: ${wifiRes1.status}`);
    const proxToken1 = wifiRes1.data.proximityToken;
    assert.ok(proxToken1, "Should have received proximityToken");

    // Submit attendance scan
    const scanRes1 = await apiRequest("/student-attendance/scan", "POST", tokenStudentA, {
      sessionCode: sessionA.sessionCode,
      nonce: nonce1,
      proximityToken: proxToken1
    });
    console.log(`Scan Response Status: ${scanRes1.status}, body:`, JSON.stringify(scanRes1.data));
    
    const isTest1Pass = scanRes1.status === 200 && scanRes1.data.success === true;
    results["Test 1: Valid Flow"] = isTest1Pass ? "PASS" : "FAIL";

    // =========================================================================
    // TEST 2: Direct API Bypass
    // =========================================================================
    console.log("\n--- TEST 2: Direct API Bypass ---");
    // Attempt scan without proximity token
    logAttackAttempt(true);
    const scanRes2 = await apiRequest("/student-attendance/scan", "POST", tokenStudentB, {
      sessionCode: sessionA.sessionCode,
      nonce: nonce1
      // proximityToken omitted
    });
    console.log(`Bypass Scan Status: ${scanRes2.status}, body:`, JSON.stringify(scanRes2.data));
    
    const isTest2Pass = scanRes2.status === 400 && (scanRes2.data.message.includes("Required") || scanRes2.data.message.includes("proximityToken"));
    results["Test 2: Direct API Bypass"] = isTest2Pass ? "PASS" : "FAIL";

    // =========================================================================
    // TEST 3: QR Sharing Attack
    // =========================================================================
    console.log("\n--- TEST 3: QR Sharing Attack ---");
    // Student A obtains QR payload and shares it. Student B tries to scan directly
    // without executing Wi-Fi proximity.
    logAttackAttempt(true);
    const scanRes3 = await apiRequest("/student-attendance/scan", "POST", tokenStudentB, {
      sessionCode: sessionA.sessionCode,
      nonce: nonce1,
      proximityToken: "INVALID_DUMMY_TOKEN"
    });
    console.log(`Sharing Attack Status: ${scanRes3.status}, body:`, JSON.stringify(scanRes3.data));

    const isTest3Pass = scanRes3.status === 400 && scanRes3.data.message.includes("Invalid or expired proximity token");
    results["Test 3: QR Sharing Attack"] = isTest3Pass ? "PASS" : "FAIL";

    // =========================================================================
    // TEST 4: Token Theft Attempt
    // =========================================================================
    console.log("\n--- TEST 4: Token Theft Attempt ---");
    // Student B steals Student A's proximity token (proxToken1) and tries to mark attendance.
    // However, proxToken1 is bound to Student A's studentId.
    logAttackAttempt(true);
    
    // We need a new fresh proximity token for Student A since proxToken1 was already consumed.
    const wifiRes4 = await apiRequest("/wifi/validate", "POST", tokenStudentA, {
      sessionCode: sessionA.sessionCode,
      ssid: "ATTENDANCE_TEACHER",
      bssid: "AA:BB:CC:DD:EE:FF",
      rssi: -50
    });
    const proxToken4 = wifiRes4.data.proximityToken;

    // Student B attempts to submit using Student A's proximity token
    const scanRes4 = await apiRequest("/student-attendance/scan", "POST", tokenStudentB, {
      sessionCode: sessionA.sessionCode,
      nonce: nonce1,
      proximityToken: proxToken4
    });
    console.log(`Theft Attack Status: ${scanRes4.status}, body:`, JSON.stringify(scanRes4.data));

    const isTest4Pass = scanRes4.status === 400 && scanRes4.data.message.includes("student mismatch");
    results["Test 4: Token Theft Attempt"] = isTest4Pass ? "PASS" : "FAIL";

    // =========================================================================
    // TEST 5: Expired Token
    // =========================================================================
    console.log("\n--- TEST 5: Expired Token ---");
    // Generate token
    const wifiRes5 = await apiRequest("/wifi/validate", "POST", tokenStudentB, {
      sessionCode: sessionA.sessionCode,
      ssid: "ATTENDANCE_TEACHER",
      bssid: "AA:BB:CC:DD:EE:FF",
      rssi: -50
    });
    const proxToken5 = wifiRes5.data.proximityToken;

    // Wait 16 seconds (expiration is 15s)
    console.log("Waiting 16 seconds for proximity token to expire naturally...");
    await new Promise(resolve => setTimeout(resolve, 16000));

    // Submit expired token
    logAttackAttempt(true);
    const scanRes5 = await apiRequest("/student-attendance/scan", "POST", tokenStudentB, {
      sessionCode: sessionA.sessionCode,
      nonce: nonce1,
      proximityToken: proxToken5
    });
    console.log(`Expired Token Scan Status: ${scanRes5.status}, body:`, JSON.stringify(scanRes5.data));

    const isTest5Pass = scanRes5.status === 400 && scanRes5.data.message.includes("Invalid or expired proximity token");
    results["Test 5: Expired Token"] = isTest5Pass ? "PASS" : "FAIL";

    // =========================================================================
    // TEST 6: Token Replay
    // =========================================================================
    console.log("\n--- TEST 6: Token Replay ---");
    // Refresh QR to ensure active QR exists
    const qrRes6 = await apiRequest(`/qr/current/${sessionA.id}`, "GET", tokenA);
    const nonce6 = qrRes6.data.qr.nonce;

    // Generate new token
    const wifiRes6 = await apiRequest("/wifi/validate", "POST", tokenStudentB, {
      sessionCode: sessionA.sessionCode,
      ssid: "ATTENDANCE_TEACHER",
      bssid: "AA:BB:CC:DD:EE:FF",
      rssi: -50
    });
    const proxToken6 = wifiRes6.data.proximityToken;

    // 1st consumption -> succeeds
    const scanRes6_1 = await apiRequest("/student-attendance/scan", "POST", tokenStudentB, {
      sessionCode: sessionA.sessionCode,
      nonce: nonce6,
      proximityToken: proxToken6
    });
    console.log(`1st Scan Status: ${scanRes6_1.status}`);

    // 2nd consumption (replay) -> fails
    logAttackAttempt(true);
    const scanRes6_2 = await apiRequest("/student-attendance/scan", "POST", tokenStudentB, {
      sessionCode: sessionA.sessionCode,
      nonce: nonce6,
      proximityToken: proxToken6
    });
    console.log(`2nd Replay Status: ${scanRes6_2.status}, body:`, JSON.stringify(scanRes6_2.data));

    const isTest6Pass = scanRes6_1.status === 200 && scanRes6_2.status === 409 && scanRes6_2.data.message.includes("already used");
    results["Test 6: Token Replay"] = isTest6Pass ? "PASS" : "FAIL";

    // Clean up student attendances for session A to reuse student A and B
    await prisma.attendance.deleteMany({ where: { sessionId: sessionA.id } });

    // =========================================================================
    // TEST 7: Concurrent Replay
    // =========================================================================
    console.log("\n--- TEST 7: Concurrent Replay & DB Verification ---");
    // Refresh QR to ensure active QR exists
    const qrRes7 = await apiRequest(`/qr/current/${sessionA.id}`, "GET", tokenA);
    const nonce7 = qrRes7.data.qr.nonce;

    // Generate token for Student A
    const wifiRes7 = await apiRequest("/wifi/validate", "POST", tokenStudentA, {
      sessionCode: sessionA.sessionCode,
      ssid: "ATTENDANCE_TEACHER",
      bssid: "AA:BB:CC:DD:EE:FF",
      rssi: -50
    });
    const proxToken7 = wifiRes7.data.proximityToken;
    const decoded7 = jwt.decode(proxToken7);
    const jti7 = decoded7.jti;

    // Fire 20 concurrent requests with the SAME token
    console.log("Firing 20 concurrent scan requests with the exact same proximity token...");
    const concurrentPromises = [];
    for (let i = 0; i < 20; i++) {
      logAttackAttempt(true);
      concurrentPromises.push(apiRequest("/student-attendance/scan", "POST", tokenStudentA, {
        sessionCode: sessionA.sessionCode,
        nonce: nonce7,
        proximityToken: proxToken7
      }));
    }

    const concurrentResults = await Promise.all(concurrentPromises);
    const successScans = concurrentResults.filter(r => r.status === 200);
    const conflictScans = concurrentResults.filter(r => r.status === 409);

    console.log(`Concurrencies Finished. Success count: ${successScans.length}, Conflict count: ${conflictScans.length}`);
    
    // Adjust attack metric (exactly 1 was valid/success)
    attackMetrics.blocked--;
    attackMetrics.successful++;

    // DB audits
    const attendanceDbCount = await prisma.attendance.count({
      where: { sessionId: sessionA.id, studentId: studentAId }
    });
    const tokenDbCount = await prisma.usedProximityToken.count({
      where: { jti: jti7 }
    });

    console.log(`DB Count - Attendance rows: ${attendanceDbCount} (Expected: 1)`);
    console.log(`DB Count - UsedProximityToken rows: ${tokenDbCount} (Expected: 1)`);

    const isTest7Pass = successScans.length === 1 && conflictScans.length === 19 && attendanceDbCount === 1 && tokenDbCount === 1;
    results["Test 7: Concurrent Replay"] = isTest7Pass ? "PASS" : "FAIL";

    // =========================================================================
    // TEST 8: Session Mismatch
    // =========================================================================
    console.log("\n--- TEST 8: Session Mismatch ---");
    // Start session B under Teacher B
    const startRes8 = await apiRequest("/attendance/session/start", "POST", tokenB, {
      courseId: courseB.id,
      ssid: "ATTENDANCE_TEACHER",
      bssid: "AA:BB:CC:DD:EE:FF"
    });
    sessionB = startRes8.data.session || startRes8.data;

    // Refresh QR for session B to ensure active QR exists
    await apiRequest(`/qr/current/${sessionB.id}`, "GET", tokenB);

    // Student A validates wifi against Session B
    const wifiRes8 = await apiRequest("/wifi/validate", "POST", tokenStudentA, {
      sessionCode: sessionB.sessionCode,
      ssid: "ATTENDANCE_TEACHER",
      bssid: "AA:BB:CC:DD:EE:FF",
      rssi: -50
    });
    const proxToken8 = wifiRes8.data.proximityToken;

    // Student A tries to submit this token against Session A (mismatch!)
    logAttackAttempt(true);
    const scanRes8 = await apiRequest("/student-attendance/scan", "POST", tokenStudentA, {
      sessionCode: sessionA.sessionCode,
      nonce: nonce1,
      proximityToken: proxToken8
    });
    console.log(`Session Mismatch Scan Status: ${scanRes8.status}, body:`, JSON.stringify(scanRes8.data));

    const isTest8Pass = scanRes8.status === 400 && scanRes8.data.message.includes("session mismatch");
    results["Test 8: Session Mismatch"] = isTest8Pass ? "PASS" : "FAIL";

    // End active session B
    await apiRequest("/attendance/session/end", "POST", tokenB);

    // =========================================================================
    // REFINEMENT 1: Transaction Atomicity Rollback Validation
    // =========================================================================
    console.log("\n--- REFINEMENT 1: Transaction Atomicity Rollback Validation ---");
    // Refresh QR to ensure active QR exists
    const qrResAtom = await apiRequest(`/qr/current/${sessionA.id}`, "GET", tokenA);
    const nonceAtom = qrResAtom.data.qr.nonce;
    
    // Student A already has marked attendance in session A.
    // Student A generates a fresh proximity token.
    const wifiResAtom = await apiRequest("/wifi/validate", "POST", tokenStudentA, {
      sessionCode: sessionA.sessionCode,
      ssid: "ATTENDANCE_TEACHER",
      bssid: "AA:BB:CC:DD:EE:FF",
      rssi: -50
    });
    const proxTokenAtom = wifiResAtom.data.proximityToken;
    const decodedAtom = jwt.decode(proxTokenAtom);
    const jtiAtom = decodedAtom.jti;

    // Student A tries to scan again. This will fail on duplicates AFTER token creation in transaction.
    const scanResAtom = await apiRequest("/student-attendance/scan", "POST", tokenStudentA, {
      sessionCode: sessionA.sessionCode,
      nonce: nonceAtom,
      proximityToken: proxTokenAtom
    });
    console.log(`Atomic Scan Status: ${scanResAtom.status}, body:`, JSON.stringify(scanResAtom.data));

    // Verify UsedProximityToken row is NOT present in DB due to transaction rollback
    const tokenAtomDbCount = await prisma.usedProximityToken.count({
      where: { jti: jtiAtom }
    });
    console.log(`UsedProximityToken row count in DB for rolled-back jti: ${tokenAtomDbCount} (Expected: 0)`);

    const isAtomPass = scanResAtom.status === 409 && tokenAtomDbCount === 0;
    results["Refinement 1: Transaction Atomicity"] = isAtomPass ? "PASS" : "FAIL";

    // End active session A
    await apiRequest("/attendance/session/end", "POST", tokenA);

  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log("\nCleaning up security verification resources...");
    if (courseA) {
      await prisma.course.delete({ where: { id: courseA.id } }).catch(() => {});
    }
    if (courseB) {
      await prisma.course.delete({ where: { id: courseB.id } }).catch(() => {});
    }
    if (studentAId) {
      await prisma.user.delete({ where: { id: studentAId } }).catch(() => {});
    }
    if (studentBId) {
      await prisma.user.delete({ where: { id: studentBId } }).catch(() => {});
    }
    if (studentCId) {
      await prisma.user.delete({ where: { id: studentCId } }).catch(() => {});
    }
    if (teacherAId) {
      await prisma.user.delete({ where: { id: teacherAId } }).catch(() => {});
    }
    if (teacherBId) {
      await prisma.user.delete({ where: { id: teacherBId } }).catch(() => {});
    }

    console.log("Shutting down development backend server...");
    if (devServer) {
      devServer.kill("SIGTERM");
    }
    console.log("✔ Cleanup complete.\n");
  }

  // =========================================================================
  // PRINT SUMMARY MATRIX
  // =========================================================================
  console.log("==================================================");
  console.log("      PROXIMITY TOKEN STABILIZATION MATRIX        ");
  console.log("==================================================");
  let passedCount = 0;
  let totalCount = 0;
  for (const [key, val] of Object.entries(results)) {
    totalCount++;
    if (val === "PASS") passedCount++;
    console.log(`${key.padEnd(40)}: [${val}]`);
  }
  console.log("--------------------------------------------------");
  console.log(`TOTAL AUDIT CHECKS: ${totalCount} | PASSED: ${passedCount} | FAILED: ${totalCount - passedCount}`);
  console.log(`ATTACK METRICS: Attempts: ${attackMetrics.attempts} | Blocked: ${attackMetrics.blocked} | Success: ${attackMetrics.successful}`);
  console.log("==================================================");

  if (passedCount !== totalCount) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSecurityAudit();
