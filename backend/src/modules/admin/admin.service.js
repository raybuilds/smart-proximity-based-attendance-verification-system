const { prisma } = require("../../config/database");
const reportsService = require("../reports/reports.service");

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}


// Helper to count eligible students using session snapshots
async function getEligibleStudentCountForSession(session) {
  if (!session.departmentSnapshot && !session.yearSnapshot && !session.sectionSnapshot) {
    return prisma.student.count();
  }
  const where = {};
  if (session.departmentSnapshot) {
    where.department = {
      equals: session.departmentSnapshot,
      mode: "insensitive",
    };
  }
  if (session.yearSnapshot) {
    where.year = session.yearSnapshot;
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
      const recordsCount = session.attendanceRecords.filter((r) => r.status !== "absent" && r.status !== "ABSENT").length;
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
      let totalSessions = 0;
      report.courses.forEach(c => {
        totalSessions += c.totalSessions;
      });
      if (totalSessions > 0 && report.overallAttendancePercentage < 75.0) {
        atRiskStudents++;
      }
    } catch (e) {
      // ignore
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
  const { search, department, year, section } = filters;

  const where = {};
  if (department) {
    where.department = { equals: department, mode: "insensitive" };
  }
  if (year) {
    where.year = Number(year);
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
      year: student.year,
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
      year: student.year,
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
      if (!course.isArchived && course.department && course.year && course.section) {
        const students = await prisma.student.findMany({
          where: {
            department: { equals: course.department, mode: "insensitive" },
            year: course.year,
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
      registeredSSID: teacher.registeredSSID,
      registeredBSSID: teacher.registeredBSSID,
      isActive: teacher.user.isActive
    },
    courses: teacher.courses.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      department: c.department,
      year: c.year,
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

async function getAdminCourses() {
  const courses = await prisma.course.findMany({
    include: {
      teacher: { include: { user: true } },
      sessions: {
        include: { attendanceRecords: true }
      }
    }
  });

  const list = [];
  for (const course of courses) {
    let studentCount = 0;
    if (course.department && course.year && course.section) {
      studentCount = await prisma.student.count({
        where: {
          department: { equals: course.department, mode: "insensitive" },
          year: course.year,
          section: { equals: course.section, mode: "insensitive" }
        }
      });
    }

    let totalSessions = course.sessions.length;
    let attendancePercentage = 100.0;
    if (totalSessions > 0) {
      let totalRecords = 0;
      let totalPossible = 0;
      for (const s of course.sessions) {
        const eligible = await getEligibleStudentCountForSession(s);
        const presentRecordsCount = s.attendanceRecords.filter((r) => r.status !== "absent" && r.status !== "ABSENT").length;
        totalRecords += presentRecordsCount;
        totalPossible += eligible;
      }
      attendancePercentage = totalPossible === 0 ? 100.0 : Number(((totalRecords / totalPossible) * 100).toFixed(1));
    }

    const activeSessionExists = course.sessions.some(s => s.isActive);

    list.push({
      courseId: course.id,
      courseCode: course.code,
      courseName: course.name,
      teacherName: course.teacher.user.name,
      department: course.department,
      year: course.year,
      section: course.section,
      studentCount,
      attendancePercentage,
      activeSession: activeSessionExists
    });
  }

  return list;
}

async function getAdminCourseDetail(courseId) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      teacher: { include: { user: true } },
      sessions: {
        orderBy: { startedAt: "desc" },
        include: { attendanceRecords: true }
      }
    }
  });

  if (!course) {
    const error = new Error("Course not found");
    error.statusCode = 404;
    throw error;
  }

  const totalSessions = course.sessions.length;

  let studentCount = 0;
  if (course.department && course.year && course.section) {
    studentCount = await prisma.student.count({
      where: {
        department: { equals: course.department, mode: "insensitive" },
        year: course.year,
        section: { equals: course.section, mode: "insensitive" }
      }
    });
  }

  let averageAttendance = 100.0;
  if (totalSessions > 0) {
    let totalRecords = 0;
    let totalPossible = 0;
    for (const s of course.sessions) {
      const eligible = await getEligibleStudentCountForSession(s);
      const presentRecordsCount = s.attendanceRecords.filter((r) => r.status !== "absent" && r.status !== "ABSENT").length;
      totalRecords += presentRecordsCount;
      totalPossible += eligible;
    }
    averageAttendance = totalPossible === 0 ? 100.0 : Number(((totalRecords / totalPossible) * 100).toFixed(1));
  }

  const manualCorrectionsCount = await prisma.attendance.count({
    where: {
      sessionId: { in: course.sessions.map(s => s.id) },
      method: "MANUAL"
    }
  });

  let defaulters = [];
  if (totalSessions > 0 && course.department && course.year && course.section) {
    const students = await prisma.student.findMany({
      where: {
        department: { equals: course.department, mode: "insensitive" },
        year: course.year,
        section: { equals: course.section, mode: "insensitive" }
      },
      include: { user: true }
    });

    for (const student of students) {
      let presentCount = 0;
      course.sessions.forEach(s => {
        const rec = s.attendanceRecords.find(r => r.studentId === student.userId);
        if (rec && rec.status === "present") {
          presentCount++;
        }
      });
      const pct = Number(((presentCount / totalSessions) * 100).toFixed(1));
      if (pct < 75.0) {
        const classesNeededFor75 = Math.max(0, (3 * totalSessions) - (4 * presentCount));
        defaulters.push({
          studentId: student.id,
          name: student.user.name,
          attendancePercentage: pct,
          classesNeededFor75
        });
      }
    }
  }
  defaulters = defaulters.slice(0, 50);

  const corrections = await prisma.attendance.findMany({
    where: {
      sessionId: { in: course.sessions.map(s => s.id) },
      method: "MANUAL"
    },
    take: 20,
    orderBy: { modifiedAt: "desc" },
    include: {
      student: true
    }
  });

  const sessionsData = [];
  const newestSessions = course.sessions.slice(0, 20);
  for (const s of newestSessions) {
    const eligible = await getEligibleStudentCountForSession(s);
    const presentRecordsCount = s.attendanceRecords.filter((r) => r.status !== "absent" && r.status !== "ABSENT").length;
    const pct = eligible === 0 ? 100.0 : Number(((presentRecordsCount / eligible) * 100).toFixed(1));
    sessionsData.push({
      sessionId: s.id,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      attendanceCount: presentRecordsCount,
      attendancePercentage: pct
    });
  }

  return {
    course: {
      id: course.id,
      code: course.code,
      name: course.name,
      department: course.department,
      year: course.year,
      section: course.section,
      isArchived: course.isArchived
    },
    teacher: {
      name: course.teacher.user.name,
      email: course.teacher.user.email
    },
    stats: {
      totalStudents: studentCount,
      totalSessions,
      averageAttendance,
      manualCorrections: manualCorrectionsCount
    },
    sessions: sessionsData,
    defaulters,
    corrections: corrections.map(c => ({
      studentName: c.student.name,
      reason: c.correctionReason,
      correctedOn: c.modifiedAt || c.markedAt
    }))
  };
}

async function getAdminManualCorrections(filters = {}) {
  const { teacherId, courseId, reason, startDate, endDate, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where = {
    method: "MANUAL"
  };

  if (teacherId) {
    where.modifiedByTeacherId = Number(teacherId);
  }
  if (courseId) {
    where.session = { courseId: Number(courseId) };
  }
  if (reason) {
    where.correctionReason = { contains: reason, mode: "insensitive" };
  }
  if (startDate || endDate) {
    where.modifiedAt = {};
    if (startDate) where.modifiedAt.gte = new Date(startDate);
    if (endDate) where.modifiedAt.lte = new Date(endDate);
  }

  const totalRecords = await prisma.attendance.count({ where });
  const totalPages = Math.ceil(totalRecords / limit);

  const items = await prisma.attendance.findMany({
    where,
    skip,
    take: limit,
    orderBy: { modifiedAt: "desc" },
    include: {
      student: true,
      session: { include: { course: true } }
    }
  });

  const itemsMapped = [];
  for (const item of items) {
    let teacherName = "Unknown Teacher";
    if (item.modifiedByTeacherId) {
      const teacherUser = await prisma.user.findUnique({
        where: { id: item.modifiedByTeacherId }
      });
      if (teacherUser) teacherName = teacherUser.name;
    }

    itemsMapped.push({
      student: {
        id: item.studentId,
        name: item.student ? item.student.name : "Unknown Student"
      },
      course: {
        id: item.session.courseId,
        name: item.session.course ? item.session.course.name : "Unknown Course",
        code: item.session.course ? item.session.course.code : null
      },
      teacher: {
        id: item.modifiedByTeacherId,
        name: teacherName
      },
      reason: item.correctionReason,
      correctedOn: item.modifiedAt || item.markedAt
    });
  }

  return {
    items: itemsMapped,
    page: Number(page),
    totalPages,
    totalRecords,
    hasMore: Number(page) < totalPages
  };
}

async function getAdminLiveSessions() {
  const activeSessions = await prisma.attendanceSession.findMany({
    where: { isActive: true },
    include: {
      course: true,
      teacher: true,
      attendanceRecords: true
    }
  });

  const list = [];
  for (const s of activeSessions) {
    const eligibleCount = await getEligibleStudentCountForSession(s);
    const attendanceCount = s.attendanceRecords.length;
    const durationMinutes = Math.floor((new Date() - s.startedAt) / 60000);

    list.push({
      sessionId: s.id,
      courseCode: s.course ? s.course.code : null,
      courseName: s.course ? s.course.name : "Unknown Course",
      teacherName: s.teacher ? s.teacher.name : "Unknown Teacher",
      startedAt: s.startedAt,
      attendanceCount,
      eligibleCount,
      durationMinutes: durationMinutes >= 0 ? durationMinutes : 0
    });
  }

  return list;
}

async function getAdminAtRisk() {
  const students = await prisma.student.findMany({
    include: { user: true }
  });

  const list = [];
  for (const s of students) {
    try {
      const report = await reportsService.getStudentCoursesReport(s.userId);
      let totalSessions = 0;
      let presentCount = 0;
      report.courses.forEach(c => {
        totalSessions += c.totalSessions;
        presentCount += c.presentCount;
      });

      if (totalSessions > 0 && report.overallAttendancePercentage < 75.0) {
        const classesNeededFor75 = Math.max(0, (3 * totalSessions) - (4 * presentCount));
        list.push({
          studentId: s.id,
          name: s.user.name,
          department: s.department,
          year: s.year,
          attendancePercentage: report.overallAttendancePercentage,
          classesNeededFor75
        });
      }
    } catch (e) {
      // ignore
    }
  }

  list.sort((a, b) => a.attendancePercentage - b.attendancePercentage);
  return list;
}

async function getAdminAnalytics() {
  const coursesList = await getAdminCourses();
  const totalCourses = coursesList.length;

  let bestCourse = "N/A";
  let worstCourse = "N/A";

  if (totalCourses > 0) {
    coursesList.sort((a, b) => b.attendancePercentage - a.attendancePercentage);
    bestCourse = `${coursesList[0].courseCode ? coursesList[0].courseCode + " - " : ""}${coursesList[0].courseName} (${coursesList[0].attendancePercentage}%)`;
    worstCourse = `${coursesList[totalCourses - 1].courseCode ? coursesList[totalCourses - 1].courseCode + " - " : ""}${coursesList[totalCourses - 1].courseName} (${coursesList[totalCourses - 1].attendancePercentage}%)`;
  }

  const teachers = await prisma.teacher.findMany({
    include: {
      user: true,
      courses: { include: { sessions: true } }
    }
  });

  let mostActiveTeacher = "N/A";
  if (teachers.length > 0) {
    let maxSessions = -1;
    let bestTeacher = null;
    teachers.forEach(t => {
      let count = 0;
      t.courses.forEach(c => {
        count += c.sessions.length;
      });
      if (count > maxSessions) {
        maxSessions = count;
        bestTeacher = t;
      }
    });
    if (bestTeacher && maxSessions > 0) {
      mostActiveTeacher = `${bestTeacher.user.name} (${maxSessions} sessions)`;
    }
  }

  const students = await prisma.student.findMany();
  const deptAttendanceMap = {};
  for (const s of students) {
    try {
      const report = await reportsService.getStudentCoursesReport(s.userId);
      let totalSessions = 0;
      let presentCount = 0;
      report.courses.forEach(c => {
        totalSessions += c.totalSessions;
        presentCount += c.presentCount;
      });

      if (totalSessions > 0) {
        if (!deptAttendanceMap[s.department]) {
          deptAttendanceMap[s.department] = { present: 0, sessions: 0 };
        }
        deptAttendanceMap[s.department].present += presentCount;
        deptAttendanceMap[s.department].sessions += totalSessions;
      }
    } catch (e) {
      // ignore
    }
  }

  const deptRankings = [];
  Object.keys(deptAttendanceMap).forEach(deptName => {
    const data = deptAttendanceMap[deptName];
    const pct = data.sessions === 0 ? 100.0 : Number(((data.present / data.sessions) * 100).toFixed(1));
    deptRankings.push({ department: deptName, attendancePercentage: pct });
  });

  let highestAttendanceDepartment = "N/A";
  let lowestAttendanceDepartment = "N/A";

  if (deptRankings.length > 0) {
    deptRankings.sort((a, b) => b.attendancePercentage - a.attendancePercentage);
    highestAttendanceDepartment = `${deptRankings[0].department} (${deptRankings[0].attendancePercentage}%)`;
    lowestAttendanceDepartment = `${deptRankings[deptRankings.length - 1].department} (${deptRankings[deptRankings.length - 1].attendancePercentage}%)`;
  }

  const allCorrections = await prisma.attendance.findMany({
    where: { method: "MANUAL" }
  });

  const manualCorrectionBreakdown = {};
  allCorrections.forEach(c => {
    const reason = c.correctionReason || "Other";
    manualCorrectionBreakdown[reason] = (manualCorrectionBreakdown[reason] || 0) + 1;
  });

  const totalAttendance = await prisma.attendance.count();
  if (totalAttendance === 0) {
    bestCourse = "N/A";
    worstCourse = "N/A";
    highestAttendanceDepartment = "N/A";
    lowestAttendanceDepartment = "N/A";
    mostActiveTeacher = "N/A";
  }

  return {
    bestCourse,
    worstCourse,
    mostActiveTeacher,
    highestAttendanceDepartment,
    lowestAttendanceDepartment,
    manualCorrectionBreakdown
  };
}

async function archiveCourse(courseId) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { sessions: true }
  });
  if (!course) {
    throw new AppError("Course not found", 404);
  }
  const activeSessionExists = course.sessions.some(s => s.isActive);
  if (activeSessionExists) {
    throw new AppError(
      "Cannot archive a course with an active attendance session",
      400
    );
  }
  return prisma.course.update({
    where: { id: courseId },
    data: {
      isArchived: true,
      archivedAt: new Date()
    }
  });
}

async function restoreCourse(courseId) {
  const course = await prisma.course.findUnique({
    where: { id: courseId }
  });
  if (!course) {
    throw new AppError("Course not found", 404);
  }
  return prisma.course.update({
    where: { id: courseId },
    data: {
      isArchived: false,
      archivedAt: null
    }
  });
}

async function getArchivedCourses() {
  const courses = await prisma.course.findMany({
    where: { isArchived: true },
    include: {
      teacher: { include: { user: true } },
      sessions: {
        include: { attendanceRecords: true }
      }
    },
    orderBy: { archivedAt: "desc" }
  });

  const list = [];
  for (const course of courses) {
    let totalSessions = course.sessions.length;
    let averageAttendance = 100.0;
    if (totalSessions > 0) {
      let totalRecords = 0;
      let totalPossible = 0;
      for (const s of course.sessions) {
        const eligible = await getEligibleStudentCountForSession(s);
        totalRecords += s.attendanceRecords.length;
        totalPossible += eligible;
      }
      averageAttendance = totalPossible === 0 ? 100.0 : Number(((totalRecords / totalPossible) * 100).toFixed(1));
    }

    const correctionCount = await prisma.attendance.count({
      where: {
        sessionId: { in: course.sessions.map(s => s.id) },
        method: "MANUAL"
      }
    });

    list.push({
      courseId: course.id,
      courseCode: course.code,
      courseName: course.name,
      teacherName: course.teacher.user.name,
      archivedAt: course.archivedAt,
      totalSessions,
      averageAttendance,
      correctionCount
    });
  }
  return list;
}

async function getArchivedCourseDetail(courseId) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      teacher: { include: { user: true } },
      sessions: {
        orderBy: { startedAt: "desc" },
        include: { attendanceRecords: true }
      }
    }
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }
  if (course.isArchived !== true) {
    throw new AppError("Course is not archived", 400);
  }

  const totalSessions = course.sessions.length;

  let studentCount = 0;
  if (course.department && course.year && course.section) {
    studentCount = await prisma.student.count({
      where: {
        department: { equals: course.department, mode: "insensitive" },
        year: course.year,
        section: { equals: course.section, mode: "insensitive" }
      }
    });
  }

  let averageAttendance = 100.0;
  if (totalSessions > 0) {
    let totalRecords = 0;
    let totalPossible = 0;
    for (const s of course.sessions) {
      const eligible = await getEligibleStudentCountForSession(s);
      const presentRecordsCount = s.attendanceRecords.filter((r) => r.status !== "absent" && r.status !== "ABSENT").length;
      totalRecords += presentRecordsCount;
      totalPossible += eligible;
    }
    averageAttendance = totalPossible === 0 ? 100.0 : Number(((totalRecords / totalPossible) * 100).toFixed(1));
  }

  const manualCorrectionsCount = await prisma.attendance.count({
    where: {
      sessionId: { in: course.sessions.map(s => s.id) },
      method: "MANUAL"
    }
  });

  const corrections = await prisma.attendance.findMany({
    where: {
      sessionId: { in: course.sessions.map(s => s.id) },
      method: "MANUAL"
    },
    take: 20,
    orderBy: { modifiedAt: "desc" },
    include: {
      student: true
    }
  });

  const sessionsData = [];
  const newestSessions = course.sessions.slice(0, 20);
  for (const s of newestSessions) {
    const eligible = await getEligibleStudentCountForSession(s);
    const presentRecordsCount = s.attendanceRecords.filter((r) => r.status !== "absent" && r.status !== "ABSENT").length;
    const pct = eligible === 0 ? 100.0 : Number(((presentRecordsCount / eligible) * 100).toFixed(1));
    sessionsData.push({
      sessionId: s.id,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      attendanceCount: presentRecordsCount,
      attendancePercentage: pct
    });
  }

  return {
    course: {
      id: course.id,
      code: course.code,
      name: course.name,
      department: course.department,
      year: course.year,
      section: course.section,
      isArchived: course.isArchived,
      archivedAt: course.archivedAt
    },
    statistics: {
      totalStudents: studentCount,
      totalSessions,
      averageAttendance,
      manualCorrections: manualCorrectionsCount
    },
    recentSessions: sessionsData,
    recentCorrections: corrections.map(c => ({
      studentName: c.student.name,
      reason: c.correctionReason,
      correctedOn: c.modifiedAt || c.markedAt
    }))
  };
}

async function updateTeacherNetwork(teacherId, { registeredSSID, registeredBSSID }) {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId }
  });

  if (!teacher) {
    const error = new Error("Teacher not found");
    error.statusCode = 404;
    throw error;
  }

  return prisma.teacher.update({
    where: { id: teacherId },
    data: {
      registeredSSID: registeredSSID !== undefined ? registeredSSID : undefined,
      registeredBSSID: registeredBSSID !== undefined ? registeredBSSID : undefined
    }
  });
}

async function resetUserPassword(userId, { temporaryPassword }) {
  const bcrypt = require("bcryptjs");
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(temporaryPassword, salt);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      needsPasswordChange: true,
    },
  });

  return {
    id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    needsPasswordChange: updatedUser.needsPasswordChange,
  };
}

module.exports = {
  getAdminDashboard,
  getAdminRecentActivity,
  getAdminStudents,
  getAdminStudentDetail,
  getAdminTeachers,
  getAdminTeacherDetail,
  updateTeacherNetwork,
  toggleUserStatus,
  getAdminCourses,
  getAdminCourseDetail,
  getAdminManualCorrections,
  getAdminLiveSessions,
  getAdminAtRisk,
  getAdminAnalytics,
  archiveCourse,
  restoreCourse,
  getArchivedCourses,
  getArchivedCourseDetail,
  resetUserPassword,
  AppError
};

