const { prisma } = require("../config/database");

async function diagnose() {
  console.log("=== RUNNING STUDENT ENROLLED COURSES DIAGNOSIS ===");

  const students = await prisma.student.findMany({
    include: {
      user: true
    }
  });

  for (const student of students) {
    const studentUserId = student.userId;

    // 1. Roster matched courses
    const rosterMatchedCourses = await prisma.course.findMany({
      where: {
        department: { equals: student.department, mode: "insensitive" },
        semester: student.semester,
        section: { equals: student.section, mode: "insensitive" },
        isArchived: false,
      }
    });

    // 2. Attendance history courses
    const attendanceHistoryCourses = await prisma.course.findMany({
      where: {
        sessions: {
          some: {
            attendanceRecords: {
              some: {
                studentId: studentUserId,
              },
            },
          },
        },
        isArchived: false,
      }
    });

    // Only log if the student has attendance records or is Student One
    if (attendanceHistoryCourses.length > 0 || student.user.email === "student@attendance.local") {
      // 3. Merged courses
      const courseMap = new Map();
      rosterMatchedCourses.forEach((c) => courseMap.set(c.id, c));
      attendanceHistoryCourses.forEach((c) => courseMap.set(c.id, c));
      const finalMergedCourses = Array.from(courseMap.values());

      console.log(`\nStudent Profile:`);
      console.log(`- Name: ${student.user.name}`);
      console.log(`- Email: ${student.user.email}`);
      console.log(`- User ID: ${studentUserId}`);
      console.log(`- Department: ${student.department}`);
      console.log(`- Semester: ${student.semester}`);
      console.log(`- Section: ${student.section}`);
      console.log(`- Number of roster matched courses: ${rosterMatchedCourses.length}`);
      console.log(`- Number of attendance-history courses: ${attendanceHistoryCourses.length}`);
      console.log(`- Final merged course count: ${finalMergedCourses.length}`);
    }
  }

  await prisma.$disconnect();
}

diagnose();
