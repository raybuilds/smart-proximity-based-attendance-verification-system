const assert = require("assert");
const { prisma } = require("../config/database");
const adminService = require("../modules/admin/admin.service");
const authService = require("../modules/auth/auth.service");
const bcrypt = require("bcryptjs");

async function runVerification() {
  console.log("=== STARTING ADMIN OVERSIGHT & USER MANAGEMENT PORTAL VERIFICATION ===\n");

  const results = [];
  const logTest = (name, status, details = "") => {
    results.push({ name, status, details });
    console.log(`[${status}] ${name} ${details ? "- " + details : ""}`);
  };

  try {
    // 1. Resolve seed user info
    const teacherUser = await prisma.user.findUnique({
      where: { email: "teacher@attendance.local" },
      include: { teacher: true }
    });
    if (!teacherUser || !teacherUser.teacher) {
      throw new Error("Seed teacher not found in database.");
    }

    const studentUser = await prisma.user.findUnique({
      where: { email: "student@attendance.local" },
      include: { student: true }
    });
    if (!studentUser || !studentUser.student) {
      throw new Error("Seed student not found in database.");
    }

    // Create a temporary admin user for verification
    const adminUser = await prisma.user.create({
      data: {
        name: "Test System Admin",
        email: `admin_test_${Date.now()}@attendance.local`,
        passwordHash: "$2a$10$xyz",
        role: "admin",
        isActive: true
      }
    });

    // 2. Test getAdminDashboard
    console.log("--- TEST 1: Admin Dashboard Counts ---");
    const dash = await adminService.getAdminDashboard();
    assert.ok(dash.totalStudents >= 1, "Expected at least 1 student");
    assert.ok(dash.totalTeachers >= 1, "Expected at least 1 teacher");
    assert.ok(dash.totalCourses >= 0, "Expected course count field");
    assert.ok(dash.activeSessions >= 0, "Expected active session count field");
    assert.ok(typeof dash.attendanceToday === "number", "Expected numeric average attendance today");
    assert.ok(dash.manualCorrections >= 0, "Expected manual corrections count field");
    assert.ok(dash.atRiskStudents >= 0, "Expected at-risk student count field");
    logTest("Admin Dashboard Overview Counts", "PASS");

    // 3. Test getAdminRecentActivity
    console.log("\n--- TEST 2: Admin Recent Activity Feed ---");
    const activity = await adminService.getAdminRecentActivity();
    assert.ok(Array.isArray(activity), "Expected activity feed to be an array");
    assert.ok(activity.length <= 20, "Activity feed should be capped at 20 events");
    if (activity.length > 0) {
      const firstEvent = activity[0];
      assert.ok(firstEvent.type, "Activity event should contain a type");
      assert.ok(firstEvent.message, "Activity event should contain a message text");
      assert.ok(firstEvent.createdAt, "Activity event should contain a timestamp");
    }
    logTest("Admin Recent Activity Feed", "PASS");

    // 4. Test Student List and Student Detail
    console.log("\n--- TEST 3: Student Oversight Info ---");
    const studentsList = await adminService.getAdminStudents();
    assert.ok(Array.isArray(studentsList), "Expected students list to be an array");
    const mockStudentItem = studentsList.find(s => s.userId === studentUser.id);
    assert.ok(mockStudentItem, "Expected to find seed student in the list");
    assert.strictEqual(mockStudentItem.name, studentUser.name);
    assert.strictEqual(mockStudentItem.rollNumber, studentUser.student.rollNumber);
    assert.ok(typeof mockStudentItem.overallAttendance === "number");

    const studentDetail = await adminService.getAdminStudentDetail(mockStudentItem.id);
    assert.strictEqual(studentDetail.profile.name, studentUser.name);
    assert.ok(Array.isArray(studentDetail.courses), "Expected courses array");
    assert.ok(studentDetail.riskSummary.status, "Expected risk status");
    logTest("Student Listing and Profile Details", "PASS");

    // 5. Test Teacher List and Teacher Detail
    console.log("\n--- TEST 4: Teacher Oversight Info ---");
    const teachersList = await adminService.getAdminTeachers();
    assert.ok(Array.isArray(teachersList), "Expected teachers list to be an array");
    const mockTeacherItem = teachersList.find(t => t.userId === teacherUser.id);
    assert.ok(mockTeacherItem, "Expected to find seed teacher in list");
    assert.strictEqual(mockTeacherItem.name, teacherUser.name);
    assert.strictEqual(mockTeacherItem.employeeId, teacherUser.teacher.employeeId);

    const teacherDetail = await adminService.getAdminTeacherDetail(mockTeacherItem.id);
    assert.strictEqual(teacherDetail.profile.name, teacherUser.name);
    assert.ok(Array.isArray(teacherDetail.courses), "Expected assigned courses array");
    assert.ok(Array.isArray(teacherDetail.activeSessions), "Expected active sessions array");
    assert.ok(typeof teacherDetail.averageAttendance === "number");
    logTest("Teacher Listing and Profile Details", "PASS");

    // 6. Test toggleUserStatus & Authentication Restriction
    console.log("\n--- TEST 5: User Toggle Status & Login Lockout ---");
    // Ensure we can't deactivate ourselves
    await assert.rejects(
      adminService.toggleUserStatus(adminUser.id, false, adminUser.id),
      /Admins cannot deactivate themselves/,
      "Expected deactivating self to fail"
    );

    // Deactivate mock teacher
    await adminService.toggleUserStatus(teacherUser.id, false, adminUser.id);
    const deactivatedUser = await prisma.user.findUnique({ where: { id: teacherUser.id } });
    assert.strictEqual(deactivatedUser.isActive, false, "User status should be deactivated");

    // Verify login blocks deactivated user with 403 error
    // Note: authService.loginUser needs plain text password, but we don't have seed plain password.
    // So we can mock/simulate calling login or check the deactivation check in login flow.
    // Let's assert authService.loginUser throws on invalid state directly by using mock user where we know password hash.
    const tempUserEmail = `temp_deactive_${Date.now()}@attendance.local`;
    const hashedMockPassword = await bcrypt.hash("password123", 10);
    const tempUser = await prisma.user.create({
      data: {
        name: "Temp User Logintest",
        email: tempUserEmail,
        passwordHash: hashedMockPassword,
        role: "teacher",
        isActive: false
      }
    });

    await assert.rejects(
      authService.loginUser({ email: tempUserEmail, password: "password123" }),
      /Account has been deactivated by administrator/,
      "Expected login to reject deactivated user"
    );

    // Reactivate temp user
    await adminService.toggleUserStatus(tempUser.id, true, adminUser.id);
    const reactivatedUser = await prisma.user.findUnique({ where: { id: tempUser.id } });
    assert.strictEqual(reactivatedUser.isActive, true, "User status should be reactivated");

    // Verify login succeeds for reactivated user (bcrypt compare will run)
    const loginResult = await authService.loginUser({ email: tempUserEmail, password: "password123" });
    assert.ok(loginResult, "Expected login to succeed for reactivated user");

    // Restore seed teacher status
    await adminService.toggleUserStatus(teacherUser.id, true, adminUser.id);

    // Clean up temporary users
    await prisma.user.delete({ where: { id: adminUser.id } });
    await prisma.user.delete({ where: { id: tempUser.id } });

    logTest("User Deactivation & Lockout Validation", "PASS");

    console.log("\n==================================================");
    console.log("             FINAL PASS/FAIL REPORT               ");
    console.log("==================================================");
    results.forEach(r => {
      console.log(`[${r.status}] ${r.name}`);
    });
    console.log("--------------------------------------------------");
    console.log(`TOTAL: ${results.length} | PASSED: ${results.filter(r => r.status === "PASS").length} | FAILED: 0`);
    console.log("==================================================");
    console.log("✓ All foundation verification tests passed successfully!");
  } catch (error) {
    console.error("\n❌ Verification script threw error:", error);
    process.exit(1);
  }
}

runVerification();
