const { prisma } = require("../config/database");
const reportsService = require("../modules/reports/reports.service");
const assert = require("assert");
const { Writable } = require("stream");

async function runStressTest() {
  console.log("=== STARTING STRESS TEST: LARGE DATASET PDF GENERATION (100, 300, 500 students) ===\n");
  
  const teacherUser = await prisma.user.findUnique({
    where: { email: "teacher@attendance.local" },
    include: { teacher: true }
  });
  if (!teacherUser || !teacherUser.teacher) {
    throw new Error("Seed teacher not found");
  }
  const teacherUserId = teacherUser.id;
  let course = await prisma.course.findFirst({
    where: { teacherId: teacherUser.teacher.id }
  });
  let createdTempCourse = false;
  if (!course) {
    course = await prisma.course.create({
      data: {
        name: "STRESS_TEMP_COURSE",
        teacherId: teacherUser.teacher.id,
        department: "CSE",
        semester: 5,
        section: "A"
      }
    });
    createdTempCourse = true;
  }

  try {
    const sizes = [100, 300, 500];
    
    for (const size of sizes) {
      console.log(`--- Testing ${size} students roster ---`);
      
      // Mock getTeacherCourseStudentsReport
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
      
      // Add some defaulters
      const defaulterCount = Math.floor(size * 0.15); // 15% defaulters
      for (let i = size + 1; i <= size + defaulterCount; i++) {
        mockStudents.push({
          rollNumber: `ROLL_${String(i).padStart(4, "0")}`,
          name: `Mock Student ${i}`,
          attendedSessions: 4,
          totalSessions: 10,
          attendancePercentage: 40.0,
        });
      }

      const totalExpected = size + defaulterCount;

      // We override prisma.course.findUnique for the mock
      const originalFindUnique = prisma.course.findUnique;
      
      const mockSessions = [{
        id: 999,
        sessionCode: "STRESS_SESS",
        isActive: false,
        startedAt: new Date(),
        attendanceRecords: mockStudents.map((s, idx) => ({
          student: {
            id: 5000 + idx,
            name: s.name,
            student: {
              rollNumber: s.rollNumber,
            }
          }
        }))
      }];

      prisma.course.findUnique = async (args) => {
        if (args.where && args.where.id === course.id) {
          return {
            id: course.id,
            name: `Stress_Test_${size}_Course`,
            teacherId: teacherUser.teacher.id,
            sessions: mockSessions
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

      const PDFDocument = require("pdfkit");
      const originalAddPage = PDFDocument.prototype.addPage;
      let pageCount = 1;
      PDFDocument.prototype.addPage = function(...args) {
        pageCount++;
        return originalAddPage.apply(this, args);
      };

      const startTime = Date.now();
      await reportsService.exportCoursePDF(teacherUserId, course.id, mockPdfStream);
      await finishPromise;
      const duration = Date.now() - startTime;

      // Restore mocks
      prisma.course.findUnique = originalFindUnique;
      PDFDocument.prototype.addPage = originalAddPage;

      console.log(`[PASS] Generated PDF for ${totalExpected} total students`);
      console.log(`- Page Count: ${pageCount}`);
      console.log(`- Bytes Compiled: ${bytesWritten} bytes`);
      console.log(`- Execution Time: ${duration} ms`);

      assert.ok(pageCount > 1, "Should span multiple pages");
      assert.ok(bytesWritten > 10000, "Should contain PDF data");
      console.log("");
    }

    console.log("=== STRESS TEST COMPLETED SUCCESSFULLY ===");
  } finally {
    if (createdTempCourse) {
      await prisma.course.delete({ where: { id: course.id } }).catch(() => {});
    }
  }
}

runStressTest()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("❌ Stress test failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
