const { prisma } = require("../config/database");

async function run() {
  const studentId = 317;
  const user = await prisma.user.findUnique({
    where: { id: studentId },
    include: { student: true }
  });

  if (!user || !user.student) {
    console.log(`User ${studentId} not found or not student.`);
    await prisma.$disconnect();
    return;
  }

  console.log(`Student Profile: ${user.name}`);
  console.log(JSON.stringify(user.student, null, 2));

  // Find courses matching student's exact department, semester, section
  const rosterCourses = await prisma.course.findMany({
    where: {
      department: user.student.department,
      semester: user.student.semester,
      section: user.student.section,
    }
  });

  console.log(`\nRoster Matched Courses (${rosterCourses.length}):`);
  console.log(JSON.stringify(rosterCourses, null, 2));

  // Find all attendance records for this student
  const attendances = await prisma.attendance.findMany({
    where: { studentId },
    include: {
      session: {
        include: {
          course: true
        }
      }
    }
  });

  console.log(`\nAttendance Records (${attendances.length}):`);
  attendances.forEach(a => {
    console.log(`- Attendance ID ${a.id}, session ID ${a.sessionId}, course: ${a.session.course ? a.session.course.name : "none"} (ID: ${a.session.courseId}), status: ${a.status}`);
  });

  await prisma.$disconnect();
}

run();
