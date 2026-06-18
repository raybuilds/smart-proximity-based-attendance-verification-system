const { prisma } = require("../../config/database");
const reportsService = require("../reports/reports.service");

// Helper to count eligible students using session snapshots
async function getEligibleStudentCountForSession(session) {
  if (!session.departmentSnapshot && !session.semesterSnapshot && !session.sectionSnapshot) {
    return prisma.student.count();
  }
  const where = {};
  if (session.departmentSnapshot) {
    where.department = {
      equals: session.departmentSnapshot,
      mode: "insensitive",
    };
  }
  if (session.semesterSnapshot) {
    where.semester = session.semesterSnapshot;
  }
  if (session.sectionSnapshot) {
    where.section = {
      equals: session.sectionSnapshot,
      mode: "insensitive",
    };
  }
  return prisma.student.count({ where });
}

async function getAdminDashboard() {
  const totalStudents = await prisma.student.count();
  const totalTeachers = await prisma.teacher.count();
  const totalCourses = await prisma.course.count();
  const activeCourses = await prisma.course.count({
    where: { isArchived: false }
  });
  const activeSessions = await prisma.attendanceSession.count({
    where: { isActive: true }
  });

  // average attendance percentage across all sessions started today
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const todaySessions = await prisma.attendanceSession.findMany({
    where: {
      startedAt: {
        gte: startOfToday,
        lte: endOfToday
      }
    },
    include: {
      attendanceRecords: true
    }
  });

  let attendanceToday = 0;
  if (todaySessions.length > 0) {
    let totalPctSum = 0;
    for (const session of todaySessions) {
      const eligibleCount = await getEligibleStudentCountForSession(session);
      const recordsCount = session.attendanceRecords.length;
      const pct = eligibleCount === 0 ? 0 : (recordsCount / eligibleCount) * 100;
      totalPctSum += pct;
    }
    attendanceToday = Number((totalPctSum / todaySessions.length).toFixed(1));
  }

  // Count of Attendance records where method === "MANUAL"
  const manualCorrections = await prisma.attendance.count({
    where: { method: "MANUAL" }
  });

  // Students whose overall attendance is below 75%
  const allStudents = await prisma.student.findMany();
  let atRiskStudents = 0;
  for (const student of allStudents) {
    try {
      const report = await reportsService.getStudentCoursesReport(student.userId);
      if (report && report.overallAttendancePercentage < 75.0) {
        atRiskStudents++;
      }
    } catch (e) {
      // ignore failures for newly seeded students with no courses/sessions
    }
  }

  return {
    totalStudents,
    totalTeachers,
    totalCourses,
    activeCourses,
    activeSessions,
    attendanceToday,
    manualCorrections,
    atRiskStudents
  };
}

async function getAdminRecentActivity() {
  const events = [];

  // 1. Fetch Session Starts
  const sessions = await prisma.attendanceSession.findMany({
    take: 20,
    orderBy: { startedAt: "desc" },
    include: { course: true }
  });
  sessions.forEach((s) => {
    events.push({
      type: "SESSION_STARTED",
      message: `${s.course ? s.course.name : "Unknown Course"} session started`,
      createdAt: s.startedAt
    });
  });

  // 2. Fetch Manual Corrections
  const corrections = await prisma.attendance.findMany({
    where: { method: "MANUAL" },
    take: 20,
    orderBy: { modifiedAt: "desc" },
    include: {
      student: true
    }
  });
  corrections.forEach((c) => {
    events.push({
      type: "MANUAL_CORRECTION",
      message: `Attendance corrected for ${c.student ? c.student.name : "Student"}`,
      createdAt: c.modifiedAt || c.markedAt
    });
  });

  // 3. Fetch User registrations
  const users = await prisma.user.findMany({
    take: 20,
    orderBy: { createdAt: "desc" }
  });
  users.forEach((u) => {
    events.push({
      type: "USER_REGISTERED",
      message: `${u.name} (${u.role}) registered`,
      createdAt: u.createdAt
    });
  });

  // Combine, sort desc, limit to 20
  events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return events.slice(0, 20);
}

async function getAdminStudents(filters = {}) {
  const { search, department, semester, section } = filters;

  const where = {};
  if (department) {
    where.department = { equals: department, mode: "insensitive" };
  }
  if (semester) {
    where.semester = Number(semester);
  }
  if (section) {
    where.section = { equals: section, mode: "insensitive" };
  }
  if (search) {
    where.OR = [
      { rollNumber: { contains: search, mode: "insensitive" } },
      {
        user: {
          name: { contains: search, mode: "insensitive" }
        }
      }
    ];
  }

  const students = await prisma.student.findMany({
    where,
    include: {
      user: true
    }
  });

  const list = [];
  for (const student of students) {
    let overallAttendance = 100.0;
    try {
      const report = await reportsService.getStudentCoursesReport(student.userId);
      overallAttendance = report.overallAttendancePercentage;
    } catch (e) {
      // Default to 100% if student profile has no courses
    }

    list.push({
      id: student.id,
      userId: student.userId,
      name: student.user.name,
      rollNumber: student.rollNumber,
      department: student.department,
      semester: student.semester,
      section: student.section,
      overallAttendance,
      isActive: student.user.isActive
    });
  }

  return list;
}

async function getAdminStudentDetail(studentId) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: true }
  });

  if (!student) {
    const error = new Error("Student not found");
    error.statusCode = 404;
    throw error;
  }

  const report = await reportsService.getStudentCoursesReport(student.userId);

  return {
    profile: {
      id: student.id,
      userId: student.userId,
      name: student.user.name,
      email: student.user.email,
      rollNumber: student.rollNumber,
      department: student.department,
      semester: student.semester,
      section: student.section,
      isActive: student.user.isActive
    },
    overallAttendance: report.overallAttendancePercentage,
    courses: report.courses,
    riskSummary: {
      status: report.overallAttendancePercentage < 75 ? "atRisk" : report.overallAttendancePercentage < 85 ? "warning" : "safe",
      atRiskCoursesCount: report.courses.filter((c) => c.riskLevel === "atRisk").length
    }
  };
}

async function getAdminTeachers() {
  const teachers = await prisma.teacher.findMany({
    include: {
      user: true,
      courses: {
        include: {
          sessions: true
        }
      }
    }
  });

  const list = [];
  for (const teacher of teachers) {
    // Unique students in their active courses
    const studentIds = new Set();
    for (const course of teacher.courses) {
      if (!course.isArchived && course.department && course.semester && course.section) {
        const students = await prisma.student.findMany({
          where: {
            department: { equals: course.department, mode: "insensitive" },
            semester: course.semester,
            section: { equals: course.section, mode: "insensitive" },
          }
        });
        students.forEach((s) => studentIds.add(s.userId));
      }
    }

    // Corrections count modified by this teacher
    const correctionsCount = await prisma.attendance.count({
      where: {
        modifiedByTeacherId: teacher.user.id
      }
    });

    list.push({
      id: teacher.id,
      userId: teacher.userId,
      name: teacher.user.name,
      employeeId: teacher.employeeId,
      coursesCount: teacher.courses.length,
      studentsCount: studentIds.size,
      manualCorrections: correctionsCount,
      isActive: teacher.user.isActive
    });
  }

  return list;
}

async function getAdminTeacherDetail(teacherId) {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: {
      user: true,
      courses: {
        include: {
          sessions: {
            include: {
              attendanceRecords: true
            }
          }
        }
      }
    }
  });

  if (!teacher) {
    const error = new Error("Teacher not found");
    error.statusCode = 404;
    throw error;
  }

  const activeSessions = await prisma.attendanceSession.findMany({
    where: {
      teacherId: teacher.user.id,
      isActive: true
    },
    include: {
      course: true
    }
  });

  // Calculate average attendance across all their courses/sessions
  let totalPctSum = 0;
  let sessionsCount = 0;
  for (const course of teacher.courses) {
    for (const session of course.sessions) {
      const eligibleCount = await getEligibleStudentCountForSession(session);
      const recordsCount = session.attendanceRecords.length;
      const pct = eligibleCount === 0 ? 0 : (recordsCount / eligibleCount) * 100;
      totalPctSum += pct;
      sessionsCount++;
    }
  }

  const averageAttendance = sessionsCount === 0 ? 100.0 : Number((totalPctSum / sessionsCount).toFixed(1));

  const manualCorrectionsCount = await prisma.attendance.count({
    where: {
      modifiedByTeacherId: teacher.user.id
    }
  });

  return {
    profile: {
      id: teacher.id,
      userId: teacher.userId,
      name: teacher.user.name,
      email: teacher.user.email,
      employeeId: teacher.employeeId,
      department: teacher.department,
      isActive: teacher.user.isActive
    },
    courses: teacher.courses.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      department: c.department,
      semester: c.semester,
      section: c.section,
      isArchived: c.isArchived
    })),
    activeSessions: activeSessions.map((s) => ({
      id: s.id,
      sessionCode: s.sessionCode,
      courseName: s.course ? s.course.name : "Unknown Course",
      startedAt: s.startedAt
    })),
    averageAttendance,
    manualCorrections: manualCorrectionsCount
  };
}

async function toggleUserStatus(userId, isActive, adminUserId) {
  if (userId === adminUserId) {
    const error = new Error("Admins cannot deactivate themselves");
    error.statusCode = 400;
    throw error;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive }
  });

  return { success: true };
}

module.exports = {
  getAdminDashboard,
  getAdminRecentActivity,
  getAdminStudents,
  getAdminStudentDetail,
  getAdminTeachers,
  getAdminTeacherDetail,
  toggleUserStatus
};
