const { prisma } = require("../config/database");
const reportsService = require("../modules/reports/reports.service");

async function runVerification() {
  console.log("=== STARTING AUTOMATED VERIFICATION FOR STUDENT ATTENDANCE PORTAL ===");

  let testUser = null;
  let testStudent = null;
  let testTeacher = null;
  let testTeacherUser = null;
  let courseA = null;
  let courseB = null;

  try {
    // 1. Create a dummy student, teacher, and courses
    const timestamp = Date.now();
    
    testUser = await prisma.user.create({
      data: {
        name: `Test Student ${timestamp}`,
        email: `teststudent${timestamp}@example.com`,
        passwordHash: "hash",
        role: "student",
      },
    });

    const testDept = `Dept-${timestamp}`;
    const testSem = 4;
    const testSec = `Sec-${timestamp}`;

    testStudent = await prisma.student.create({
      data: {
        userId: testUser.id,
        rollNumber: `ROLL${timestamp}`,
        department: testDept,
        semester: testSem,
        section: testSec,
      },
    });

    testTeacherUser = await prisma.user.create({
      data: {
        name: `Test Teacher ${timestamp}`,
        email: `testteacher${timestamp}@example.com`,
        passwordHash: "hash",
        role: "teacher",
      },
    });

    testTeacher = await prisma.teacher.create({
      data: {
        userId: testTeacherUser.id,
        employeeId: `EMP${timestamp}`,
        department: testDept,
      },
    });

    // Course A: MTH401 - GEOMETRY (at risk: 5 / 10 = 50%)
    courseA = await prisma.course.create({
      data: {
        name: "GEOMETRY",
        code: "MTH401",
        teacherId: testTeacher.id,
        department: testDept,
        semester: testSem,
        section: testSec,
      },
    });

    // Course B: PHY301 - PHYSICS (safe: 2 / 2 = 100%)
    courseB = await prisma.course.create({
      data: {
        name: "PHYSICS",
        code: "PHY301",
        teacherId: testTeacher.id,
        department: testDept,
        semester: testSem,
        section: testSec,
      },
    });

    console.log("Created test database records successfully.");

    // Create 10 sessions for Course A
    const courseASessions = [];
    for (let i = 0; i < 10; i++) {
      const session = await prisma.attendanceSession.create({
        data: {
          teacherId: testTeacherUser.id,
          sessionCode: `SESS-A-${timestamp}-${i}`,
          courseId: courseA.id,
          departmentSnapshot: testDept,
          semesterSnapshot: testSem,
          sectionSnapshot: testSec,
          isActive: false,
          startedAt: new Date(Date.now() - (10 - i) * 60 * 60 * 1000), // Chronological ordering
        },
      });
      courseASessions.push(session);
    }

    // Create 2 sessions for Course B
    const courseBSessions = [];
    for (let i = 0; i < 2; i++) {
      const session = await prisma.attendanceSession.create({
        data: {
          teacherId: testTeacherUser.id,
          sessionCode: `SESS-B-${timestamp}-${i}`,
          courseId: courseB.id,
          departmentSnapshot: testDept,
          semesterSnapshot: testSem,
          sectionSnapshot: testSec,
          isActive: false,
          startedAt: new Date(Date.now() - (2 - i) * 60 * 60 * 1000),
        },
      });
      courseBSessions.push(session);
    }

    // Mark attendance for student:
    // Course A: 5 presents (4 QR, 1 MANUAL), 5 absents
    // Let's mark presents for indices 0, 2, 4, 6, 8 (alternating to test streaks and trend strip)
    // Index 8 is MANUAL correction
    for (let i = 0; i < 10; i++) {
      if (i % 2 === 0) {
        await prisma.attendance.create({
          data: {
            studentId: testUser.id,
            sessionId: courseASessions[i].id,
            verificationMethod: i === 8 ? "manual" : "qr",
            method: i === 8 ? "MANUAL" : "QR",
            status: "present",
            modifiedByTeacherId: i === 8 ? testTeacherUser.id : null,
            modifiedAt: i === 8 ? new Date() : null,
            correctionReason: i === 8 ? "Phone Issue" : null,
          },
        });
      }
    }

    // Course B: 2 presents (both QR)
    for (let i = 0; i < 2; i++) {
      await prisma.attendance.create({
        data: {
          studentId: testUser.id,
          sessionId: courseBSessions[i].id,
          verificationMethod: "qr",
          method: "QR",
          status: "present",
        },
      });
    }

    console.log("Mocked attendance records successfully.");

    // 2. Run verification on getStudentCoursesReport
    console.log("\n--- Testing getStudentCoursesReport ---");
    const coursesReport = await reportsService.getStudentCoursesReport(testUser.id);
    console.log("Response:", JSON.stringify(coursesReport, null, 2));

    // Assert overallAttendancePercentage calculation (aggregate vs average)
    // Average of 50% and 100% is 75%
    // Aggregate is 7 / 12 = 58.3%
    const expectedOverall = Math.round((7 / 12) * 100 * 10) / 10; // 58.3
    if (coursesReport.overallAttendancePercentage === expectedOverall) {
      console.log("✓ SUCCESS: Overall attendance matches aggregate (58.3%), not average (75.0%)");
    } else {
      console.error(`✗ FAIL: Overall attendance mismatch. Expected ${expectedOverall}%, got ${coursesReport.overallAttendancePercentage}%`);
      process.exit(1);
    }

    // Assert risk level mappings
    const reportA = coursesReport.courses.find(c => c.courseId === courseA.id);
    const reportB = coursesReport.courses.find(c => c.courseId === courseB.id);

    if (reportA.riskLevel === "atRisk") {
      console.log("✓ SUCCESS: Course A risk level correctly resolved to 'atRisk'");
    } else {
      console.error(`✗ FAIL: Course A riskLevel expected 'atRisk', got '${reportA.riskLevel}'`);
      process.exit(1);
    }

    if (reportB.riskLevel === "safe") {
      console.log("✓ SUCCESS: Course B risk level correctly resolved to 'safe'");
    } else {
      console.error(`✗ FAIL: Course B riskLevel expected 'safe', got '${reportB.riskLevel}'`);
      process.exit(1);
    }

    // Assert classesNeededFor75 calculations
    // Course A needs 3*10 - 4*5 = 10 classes
    if (reportA.classesNeededFor75 === 10) {
      console.log("✓ SUCCESS: Course A classesNeededFor75 is 10");
    } else {
      console.error(`✗ FAIL: Course A classesNeededFor75 expected 10, got ${reportA.classesNeededFor75}`);
      process.exit(1);
    }

    // Course B needs 0 classes
    if (reportB.classesNeededFor75 === 0) {
      console.log("✓ SUCCESS: Course B classesNeededFor75 is 0");
    } else {
      console.error(`✗ FAIL: Course B classesNeededFor75 expected 0, got ${reportB.classesNeededFor75}`);
      process.exit(1);
    }

    // Assert projectedPercentageAfterRecovery
    // Course A: (5 + 10) / (10 + 10) = 15 / 20 = 75%
    if (reportA.projectedPercentageAfterRecovery === 75.0) {
      console.log("✓ SUCCESS: Course A projectedPercentageAfterRecovery is 75%");
    } else {
      console.error(`✗ FAIL: Course A projectedPercentageAfterRecovery expected 75, got ${reportA.projectedPercentageAfterRecovery}`);
      process.exit(1);
    }

    // 3. Run verification on getStudentCourseDetailReport
    console.log("\n--- Testing getStudentCourseDetailReport ---");
    const detailReport = await reportsService.getStudentCourseDetailReport(testUser.id, courseA.id);
    console.log("Response summary:", {
      attendancePercentage: detailReport.attendancePercentage,
      presentCount: detailReport.presentCount,
      absentCount: detailReport.absentCount,
      totalSessions: detailReport.totalSessions,
      currentStreak: detailReport.currentStreak,
      bestStreak: detailReport.bestStreak,
      lastAttended: detailReport.lastAttended,
      classesNeededFor75: detailReport.classesNeededFor75,
      projectedPercentageAfterRecovery: detailReport.projectedPercentageAfterRecovery,
      trendData: detailReport.trendData,
    });

    // Assert trendData length and elements (last 10 sessions)
    if (detailReport.trendData.length === 10) {
      console.log("✓ SUCCESS: trendData contains exactly 10 sessions");
    } else {
      console.error(`✗ FAIL: trendData size mismatch. Expected 10, got ${detailReport.trendData.length}`);
      process.exit(1);
    }

    // Check chronological trend data: index 0,2,4,6,8 present, index 1,3,5,7,9 absent
    const expectedTrend = ["PRESENT", "ABSENT", "PRESENT", "ABSENT", "PRESENT", "ABSENT", "PRESENT", "ABSENT", "PRESENT", "ABSENT"];
    if (JSON.stringify(detailReport.trendData) === JSON.stringify(expectedTrend)) {
      console.log("✓ SUCCESS: trendData matches chronological session presence mapping");
    } else {
      console.error(`✗ FAIL: trendData mismatch. Got:`, detailReport.trendData);
      process.exit(1);
    }

    // Assert streaks
    // Presents: 0, 2, 4, 6, 8. They alternate, so currentStreak at the end is 0 (since session 9 is absent), and bestStreak is 1.
    if (detailReport.bestStreak === 1 && detailReport.currentStreak === 0) {
      console.log("✓ SUCCESS: Streaks calculated correctly");
    } else {
      console.error(`✗ FAIL: Streaks mismatch. current: ${detailReport.currentStreak}, best: ${detailReport.bestStreak}`);
      process.exit(1);
    }

    // Assert timeline newest first
    const isSortedNewestFirst = detailReport.timeline.every((val, i, arr) => {
      if (i === 0) return true;
      return new Date(arr[i-1].sessionDate) >= new Date(val.sessionDate);
    });

    if (isSortedNewestFirst) {
      console.log("✓ SUCCESS: Timeline is correctly sorted newest first");
    } else {
      console.error("✗ FAIL: Timeline is not sorted newest first");
      process.exit(1);
    }

    // Assert MANUAL correction timeline details and anonymization
    const manualTimelineItem = detailReport.timeline.find(t => t.method === "MANUAL");
    if (manualTimelineItem) {
      if (manualTimelineItem.correctionReason === "Phone Issue" && manualTimelineItem.correctedOn && !manualTimelineItem.modifiedBy) {
        console.log("✓ SUCCESS: Manual corrections are anonymized and show reason/date properly");
      } else {
        console.error("✗ FAIL: Manual correction timeline details invalid or containing teacher info:", manualTimelineItem);
        process.exit(1);
      }
    } else {
      console.error("✗ FAIL: MANUAL timeline item not found in detail report");
      process.exit(1);
    }

    console.log("\n=== ALL AUTOMATED VERIFICATION CHECKS PASSED ===");

  } catch (error) {
    console.error("Verification script encountered an error:", error);
    process.exit(1);
  } finally {
    console.log("\nCleaning up test records...");
    
    // Clean up in reverse dependency order
    if (testUser) {
      await prisma.attendanceCorrection.deleteMany({
        where: { studentId: testUser.id }
      });
      await prisma.attendance.deleteMany({
        where: { studentId: testUser.id }
      });
    }

    if (courseA) {
      await prisma.attendanceSession.deleteMany({
        where: { courseId: courseA.id }
      });
      await prisma.course.delete({
        where: { id: courseA.id }
      });
    }

    if (courseB) {
      await prisma.attendanceSession.deleteMany({
        where: { courseId: courseB.id }
      });
      await prisma.course.delete({
        where: { id: courseB.id }
      });
    }

    if (testStudent) {
      await prisma.student.delete({
        where: { id: testStudent.id }
      });
    }

    if (testUser) {
      await prisma.user.delete({
        where: { id: testUser.id }
      });
    }

    if (testTeacher) {
      await prisma.teacher.delete({
        where: { id: testTeacher.id }
      });
    }

    if (testTeacherUser) {
      await prisma.user.delete({
        where: { id: testTeacherUser.id }
      });
    }

    console.log("Database cleanup finished.");
  }
}

runVerification();
