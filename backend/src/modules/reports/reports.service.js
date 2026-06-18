const { prisma } = require("../../config/database");
const PDFDocument = require("pdfkit");
const { logExport } = require("../../utils/exportAuditLogger");

// In-memory dashboard cache
const dashboardCache = new Map();

function invalidateTeacherDashboardCache(teacherId) {
  const idStr = String(teacherId);
  for (const key of dashboardCache.keys()) {
    if (key.startsWith(`${idStr}:`)) {
      dashboardCache.delete(key);
    }
  }
}

async function getTeacherByUserId(userId) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    include: { user: true },
  });
  if (!teacher) {
    const error = new Error("Teacher profile not found");
    error.statusCode = 404;
    throw error;
  }
  return teacher;
}

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

async function getTeacherDashboard(userId, range = "all") {
  // Validate range
  if (range !== "all" && range !== "7d" && range !== "30d") {
    const error = new Error("Invalid dashboard range.");
    error.statusCode = 400;
    throw error;
  }

  const cacheKey = `${userId}:${range}`;
  const cached = dashboardCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const teacher = await getTeacherByUserId(userId);

  const now = new Date();
  let dateFilter = {};
  let prevDateFilter = null;
  let cutoff = null;
  let prevCutoff = null;

  if (range === "7d") {
    cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    prevCutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    dateFilter = { startedAt: { gte: cutoff } };
    prevDateFilter = { startedAt: { gte: prevCutoff, lt: cutoff } };
  } else if (range === "30d") {
    cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    prevCutoff = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    dateFilter = { startedAt: { gte: cutoff } };
    prevDateFilter = { startedAt: { gte: prevCutoff, lt: cutoff } };
  }

  const courses = await prisma.course.findMany({
    where: { teacherId: teacher.id },
    include: {
      sessions: {
        include: {
          attendanceRecords: true,
        },
      },
    },
  });

  const totalCourses = courses.length;
  const activeCourses = courses.filter((c) => !c.isArchived).length;
  const archivedCourses = courses.filter((c) => c.isArchived).length;

  if (totalCourses === 0) {
    const emptyResponse = {
      totalCourses: 0,
      activeCourses: 0,
      archivedCourses: 0,
      totalSessions: 0,
      totalAttendanceRecords: 0,
      averageAttendancePercentage: 0,
      bestCourse: null,
      worstCourse: null,
    };
    dashboardCache.set(cacheKey, { data: emptyResponse, expiresAt: Date.now() + 60 * 1000 });
    return emptyResponse;
  }

  let totalSessions = 0;
  let totalAttendanceRecords = 0;
  let totalPossibleAll = 0;

  const countCache = {};
  async function cachedStudentCount(sess) {
    const key = `${sess.departmentSnapshot || ""}-${sess.semesterSnapshot || ""}-${sess.sectionSnapshot || ""}`;
    if (countCache[key] === undefined) {
      countCache[key] = await getEligibleStudentCountForSession(sess);
    }
    return countCache[key];
  }

  const courseStats = [];

  for (const course of courses) {
    const rangeSessions = course.sessions.filter((s) => {
      if (range === "7d" || range === "30d") {
        return s.startedAt >= cutoff;
      }
      return true;
    });

    totalSessions += rangeSessions.length;

    let courseRecords = 0;
    let coursePossible = 0;

    for (const session of rangeSessions) {
      const eligibleCount = await cachedStudentCount(session);
      const recordsCount = session.attendanceRecords.length;

      courseRecords += recordsCount;
      coursePossible += eligibleCount;

      totalAttendanceRecords += recordsCount;
      totalPossibleAll += eligibleCount;
    }

    if (rangeSessions.length > 0) {
      const pct = coursePossible === 0 ? 0 : (courseRecords / coursePossible) * 100;
      courseStats.push({
        name: course.name,
        rawPercentage: pct,
        attendancePercentage: Number(pct.toFixed(1)),
      });
    }
  }

  // Sort: descending raw percentage, then alphabetically by name ascending for ties
  courseStats.sort((a, b) => b.rawPercentage - a.rawPercentage || a.name.localeCompare(b.name));

  const averageAttendancePercentage =
    totalPossibleAll === 0 ? 0 : Number(((totalAttendanceRecords / totalPossibleAll) * 100).toFixed(1));

  const bestCourse =
    courseStats.length > 0
      ? { name: courseStats[0].name, attendancePercentage: courseStats[0].attendancePercentage }
      : null;

  const worstCourse =
    courseStats.length > 0
      ? {
          name: courseStats[courseStats.length - 1].name,
          attendancePercentage: courseStats[courseStats.length - 1].attendancePercentage,
        }
      : null;

  const responseData = {
    totalCourses,
    activeCourses,
    archivedCourses,
    totalSessions,
    totalAttendanceRecords,
    averageAttendancePercentage,
    bestCourse,
    worstCourse,
  };

  // Trend indicator calculation for 7d and 30d
  if (range !== "all") {
    let totalRecordsPrev = 0;
    let totalPossiblePrev = 0;

    for (const course of courses) {
      const prevSessions = course.sessions.filter((s) => s.startedAt >= prevCutoff && s.startedAt < cutoff);
      for (const session of prevSessions) {
        const eligibleCount = await cachedStudentCount(session);
        totalRecordsPrev += session.attendanceRecords.length;
        totalPossiblePrev += eligibleCount;
      }
    }

    const previousAverage = totalPossiblePrev === 0 ? 0 : (totalRecordsPrev / totalPossiblePrev) * 100;
    const currentAverage = totalPossibleAll === 0 ? 0 : (totalAttendanceRecords / totalPossibleAll) * 100;
    const diff = currentAverage - previousAverage;

    responseData.attendanceTrend = {
      direction: diff >= 0 ? "up" : "down",
      change: Number(Math.abs(diff).toFixed(1)),
    };
  }

  dashboardCache.set(cacheKey, { data: responseData, expiresAt: Date.now() + 60 * 1000 });
  return responseData;
}

async function getCourseDefaulters(userId, courseId, threshold = 75) {
  const report = await getTeacherCourseStudentsReport(userId, courseId);
  const students = report.students.filter((s) => s.attendancePercentage < threshold);

  // Since reports are already sorted ascending, filter maintains order
  return {
    course: {
      id: report.course.id,
      name: report.course.name,
    },
    threshold,
    students,
  };
}

async function getCourseTrends(userId, courseId) {
  const teacher = await getTeacherByUserId(userId);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    const error = new Error("Course not found");
    error.statusCode = 404;
    throw error;
  }

  if (course.teacherId !== teacher.id) {
    const error = new Error("Access denied.");
    error.statusCode = 403;
    throw error;
  }

  const sessions = await prisma.attendanceSession.findMany({
    where: { courseId },
    include: {
      attendanceRecords: true,
    },
    orderBy: { startedAt: "asc" },
  });

  if (sessions.length === 0) {
    return {
      averageAttendance: 0.0,
      highestAttendance: 0.0,
      lowestAttendance: 0.0,
      data: [],
    };
  }

  const trendData = [];
  let totalPercentage = 0;
  let highestAttendance = -1;
  let lowestAttendance = 101;

  for (const session of sessions) {
    const eligibleCount = await getEligibleStudentCountForSession(session);
    const recordsCount = session.attendanceRecords.length;

    const percentage = eligibleCount === 0 ? 0.0 : Number(((recordsCount / eligibleCount) * 100).toFixed(2));

    totalPercentage += percentage;
    if (percentage > highestAttendance) highestAttendance = percentage;
    if (percentage < lowestAttendance) lowestAttendance = percentage;

    trendData.push({
      sessionId: session.id,
      date: session.startedAt.toISOString().split("T")[0],
      attendancePercentage: percentage,
    });
  }

  const averageAttendance = Number((totalPercentage / sessions.length).toFixed(2));

  return {
    averageAttendance,
    highestAttendance: Number(highestAttendance.toFixed(2)),
    lowestAttendance: Number(lowestAttendance.toFixed(2)),
    data: trendData,
  };
}

async function exportCourseCSV(userId, courseId) {
  const report = await getTeacherCourseStudentsReport(userId, courseId);
  const teacher = await getTeacherByUserId(userId);

  const sanitizedName = report.course.name.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `${sanitizedName}_Report_${dateStr}.csv`;

  const metaRows = [
    `Course,${report.course.name}`,
    `Generated At,${new Date().toISOString().replace("T", " ").substring(0, 19)}`,
    `Teacher,${teacher.user.name}`,
    "",
    "Roll Number,Name,Attended,Total,Percentage",
  ];

  const rows = report.students.map((s) => {
    const safeRoll = `"${s.rollNumber.replace(/"/g, '""')}"`;
    const safeName = `"${s.name.replace(/"/g, '""')}"`;
    return `${safeRoll},${safeName},${s.attendedSessions},${s.totalSessions},${s.attendancePercentage}`;
  });

  const csvContent = [...metaRows, ...rows].join("\n");

  logExport(teacher.id, courseId, "CSV");

  return {
    filename,
    csvContent,
  };
}

async function exportCourseDefaultersCSV(userId, courseId, threshold = 75) {
  const report = await getCourseDefaulters(userId, courseId, threshold);
  const teacher = await getTeacherByUserId(userId);

  const sanitizedName = report.course.name.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `${sanitizedName}_Defaulters_${threshold}_Report_${dateStr}.csv`;

  const metaRows = [
    `Course,${report.course.name}`,
    `Threshold,${threshold}`,
    "",
    "Roll Number,Name,Attendance Percentage",
  ];

  const rows = report.students.map((s) => {
    const safeRoll = `"${s.rollNumber.replace(/"/g, '""')}"`;
    const safeName = `"${s.name.replace(/"/g, '""')}"`;
    return `${safeRoll},${safeName},${s.attendancePercentage}`;
  });

  const csvContent = [...metaRows, ...rows].join("\n");

  logExport(teacher.id, courseId, "DEFAULTER_CSV");

  return {
    filename,
    csvContent,
  };
}

async function exportCoursePDF(userId, courseId, res) {
  const report = await getTeacherCourseStudentsReport(userId, courseId);
  const { course, totalSessions, totalStudents, averageAttendance, students } = report;
  const teacher = await getTeacherByUserId(userId);

  const sanitizedName = course.name.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `${sanitizedName}_Report_${dateStr}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ bufferPages: true, margin: 50 });
  doc.pipe(res);

  // 1. Header Section
  doc.fontSize(20).font("Helvetica-Bold").text("Attendance System Report", { align: "center" });
  doc.moveDown(0.5);

  doc.font("Helvetica").fontSize(11).fillColor("#475569").text(`Teacher: ${teacher.user.name}`);
  doc.text(`Course: ${course.name}`);
  doc.text(`Generated At: ${new Date().toISOString().replace("T", " ").substring(0, 19)}`);
  doc.moveDown(1.5);

  // 2. Summary Section
  doc.fontSize(14).font("Helvetica-Bold").fillColor("#0f172a").text("Attendance Summary");
  doc.moveDown(0.5);

  const highestPct = students.length > 0 ? Math.max(...students.map((s) => s.attendancePercentage)) : 0;
  const lowestPct = students.length > 0 ? Math.min(...students.map((s) => s.attendancePercentage)) : 0;

  doc.font("Helvetica").fontSize(11).fillColor("#1e293b");
  doc.text(`Total Students: ${totalStudents}`);
  doc.text(`Average Attendance: ${averageAttendance}%`);
  doc.text(`Highest Attendance: ${highestPct.toFixed(2)}%`);
  doc.text(`Lowest Attendance: ${lowestPct.toFixed(2)}%`);
  doc.moveDown(1.5);

  // Table header drawing
  const drawTableHeader = (y) => {
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#1e293b");
    doc.text("Roll Number", 50, y, { width: 100 });
    doc.text("Student Name", 150, y, { width: 180 });
    doc.text("Attended", 330, y, { width: 60, align: "right" });
    doc.text("Total", 400, y, { width: 50, align: "right" });
    doc.text("Percentage", 460, y, { width: 100, align: "right" });

    doc.moveTo(50, y + 15).lineTo(560, y + 15).strokeColor("#cbd5e1").lineWidth(1).stroke();
    return y + 25;
  };

  // 3. Student Table Section
  doc.fontSize(14).font("Helvetica-Bold").fillColor("#0f172a").text("Student Attendance Roster");
  doc.moveDown(0.5);

  let currentY = doc.y;
  currentY = drawTableHeader(currentY);

  const rowHeight = 20;
  const pageHeight = doc.page.height;
  const bottomMargin = 80; // Larger bottom margin to prevent footer overlap

  doc.fontSize(10).font("Helvetica");

  for (const s of students) {
    if (currentY + rowHeight > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = drawTableHeader(50);
    }

    doc.fillColor("#334155");
    doc.text(s.rollNumber, 50, currentY, { width: 100 });
    doc.text(s.name, 150, currentY, { width: 180 });
    doc.text(String(s.attendedSessions), 330, currentY, { width: 60, align: "right" });
    doc.text(String(s.totalSessions), 400, currentY, { width: 50, align: "right" });
    doc.text(`${s.attendancePercentage}%`, 460, currentY, { width: 100, align: "right" });

    currentY += rowHeight;
  }

  // 4. Defaulters Section
  // Check if we have enough space for the section header + some content (about 80px)
  if (currentY + 80 > pageHeight - bottomMargin) {
    doc.addPage();
    currentY = 50;
  } else {
    doc.moveDown(2.0);
    currentY = doc.y;
  }

  doc.fontSize(14).font("Helvetica-Bold").fillColor("#991b1b").text("Students Below Threshold (Defaulters < 75%)", 50, currentY);
  currentY = doc.y + 10;

  const defaulterThreshold = 75;
  const defaulters = students.filter((s) => s.attendancePercentage < defaulterThreshold);

  if (defaulters.length === 0) {
    if (currentY + 20 > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = 50;
    }
    doc.fontSize(11).font("Helvetica").fillColor("#475569").text("No defaulters found.", 50, currentY);
  } else {
    // Check if we have space for the header + first row (about 45px)
    if (currentY + 45 > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = 50;
    }
    // Draw Defaulter Table Header
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#991b1b");
    doc.text("Roll Number", 50, currentY, { width: 120 });
    doc.text("Student Name", 170, currentY, { width: 220 });
    doc.text("Percentage", 390, currentY, { width: 170, align: "right" });

    doc.moveTo(50, currentY + 15).lineTo(560, currentY + 15).strokeColor("#fecaca").lineWidth(1).stroke();
    currentY += 25;

    doc.fontSize(10).font("Helvetica");
    for (const d of defaulters) {
      if (currentY + rowHeight > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = 50;
        doc.fontSize(10).font("Helvetica-Bold").fillColor("#991b1b");
        doc.text("Roll Number", 50, currentY, { width: 120 });
        doc.text("Student Name", 170, currentY, { width: 220 });
        doc.text("Percentage", 390, currentY, { width: 170, align: "right" });
        doc.moveTo(50, currentY + 15).lineTo(560, currentY + 15).strokeColor("#fecaca").lineWidth(1).stroke();
        currentY += 25;
      }

      doc.fillColor("#7f1d1d");
      doc.text(d.rollNumber, 50, currentY, { width: 120 });
      doc.text(d.name, 170, currentY, { width: 220 });
      doc.text(`${d.attendancePercentage}%`, 390, currentY, { width: 170, align: "right" });

      currentY += rowHeight;
    }
  }

  // 5. Draw Footer on all pages
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    // Draw subtle line
    doc.moveTo(50, pageHeight - 65).lineTo(560, pageHeight - 65).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
    // Text
    doc.fontSize(9).font("Helvetica").fillColor("#64748b").text(
      `Generated by Attendance System | Page ${i + 1} of ${range.count}`,
      50,
      pageHeight - 55,
      { align: "center", width: doc.page.width - 100 }
    );
  }

  doc.end();

  logExport(teacher.id, courseId, "PDF");
}

async function getTeacherOverview() {
  const totalStudents = await prisma.student.count();

  const totalSessions = await prisma.attendanceSession.count();

  const totalAttendanceRecords = await prisma.attendance.count();

  const possibleAttendance = totalStudents * totalSessions;

  const attendancePercentage =
    possibleAttendance === 0
      ? 0
      : Number(
          (
            (totalAttendanceRecords / possibleAttendance) *
            100
          ).toFixed(1)
        );

  return {
    totalStudents,
    totalSessions,
    totalAttendanceRecords,
    attendancePercentage,
  };
}

async function getStudentReports() {
  const students = await prisma.student.findMany({
    include: {
      user: true,
    },
  });

  const totalSessions =
    await prisma.attendanceSession.count();

  const reports = await Promise.all(
    students.map(async (student) => {
      const attendanceCount =
        await prisma.attendance.count({
          where: {
            studentId: student.userId,
          },
        });

      const attendancePercentage =
        totalSessions === 0
          ? 0
          : Number(
              (
                (attendanceCount / totalSessions) *
                100
              ).toFixed(1)
            );

      return {
        id: student.userId,
        name: student.user.name,
        email: student.user.email,
        rollNumber: student.rollNumber,
        department: student.department,
        semester: student.semester,
        section: student.section,
        presentCount: attendanceCount,
        absentCount:
          totalSessions - attendanceCount,
        attendancePercentage,
      };
    })
  );

  return reports;
}

async function getStudentSelfReport(studentId) {
  const coursesReport = await getStudentCoursesReport(studentId);
  
  let totalPresent = 0;
  let totalSessions = 0;
  
  coursesReport.courses.forEach((c) => {
    totalPresent += c.presentCount;
    totalSessions += c.totalSessions;
  });
  
  const absentCount = totalSessions - totalPresent;
  
  return {
    presentCount: totalPresent,
    absentCount,
    attendancePercentage: coursesReport.overallAttendancePercentage,
    totalSessions,
  };
}

async function getStudentAttendanceHistory(
  studentId
) {
  const records =
    await prisma.attendance.findMany({
      where: {
        studentId,
      },

      include: {
        session: {
          include: {
            course: true,
          },
        },
      },

      orderBy: {
        markedAt: "desc",
      },
    });

  return records.map((record) => ({
    id: record.id,
    sessionId: record.sessionId,
    markedAt: record.markedAt,
    status: record.status,
    verificationMethod: record.verificationMethod,
    courseName: record.session.course?.name || "Not Assigned",
    departmentSnapshot: record.session.departmentSnapshot,
    semesterSnapshot: record.session.semesterSnapshot,
    sectionSnapshot: record.session.sectionSnapshot,
  }));
}

async function getStudentHistoryById(studentId) {
     console.log(
    "FETCHING HISTORY FOR:",
    studentId
  );
    const records =
    await prisma.attendance.findMany({
      where: {
        studentId,
      },

      orderBy: {
        markedAt: "desc",
      },
    });

  return records;
}

async function getTeacherCoursesReport(userId) {
  const teacher = await getTeacherByUserId(userId);

  const courses = await prisma.course.findMany({
    where: { teacherId: teacher.id },
    include: {
      sessions: {
        include: {
          attendanceRecords: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return courses.map((course) => {
    const sessionCount = course.sessions.length;
    let attendanceCount = 0;
    const uniqueStudents = new Set();

    course.sessions.forEach((session) => {
      attendanceCount += session.attendanceRecords.length;
      session.attendanceRecords.forEach((rec) => {
        uniqueStudents.add(rec.studentId);
      });
    });

    return {
      id: course.id,
      name: course.name,
      department: course.department,
      semester: course.semester,
      section: course.section,
      isArchived: course.isArchived,
      archivedAt: course.archivedAt,
      archiveReason: course.archiveReason,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      sessionCount,
      attendanceCount,
      uniqueStudents: uniqueStudents.size,
    };
  });
}

async function getTeacherCourseDetailReport(userId, courseId) {
  const teacher = await getTeacherByUserId(userId);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      sessions: {
        include: {
          attendanceRecords: true,
        },
      },
    },
  });

  if (!course) {
    const error = new Error("Course not found");
    error.statusCode = 404;
    throw error;
  }

  if (course.teacherId !== teacher.id) {
    const error = new Error("You do not have permission to access this course");
    error.statusCode = 403;
    throw error;
  }

  const sessionsConducted = course.sessions.length;
  let attendanceRecordsCount = 0;
  const uniqueStudents = new Set();

  course.sessions.forEach((session) => {
    attendanceRecordsCount += session.attendanceRecords.length;
    session.attendanceRecords.forEach((rec) => {
      uniqueStudents.add(rec.studentId);
    });
  });

  return {
    course: {
      id: course.id,
      name: course.name,
      department: course.department,
      semester: course.semester,
      section: course.section,
      isArchived: course.isArchived,
      archivedAt: course.archivedAt,
      archiveReason: course.archiveReason,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    },
    summary: {
      sessionsConducted,
      attendanceRecords: attendanceRecordsCount,
      uniqueStudents: uniqueStudents.size,
    },
  };
}

async function getTeacherCourseStudentsReport(userId, courseId) {
  const teacher = await getTeacherByUserId(userId);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      sessions: {
        include: {
          attendanceRecords: {
            include: {
              student: {
                include: {
                  student: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!course) {
    const error = new Error("Course not found");
    error.statusCode = 404;
    throw error;
  }

  if (course.teacherId !== teacher.id) {
    const error = new Error("You do not have permission to access this course");
    error.statusCode = 403;
    throw error;
  }

  const sessions = course.sessions;
  const totalSessions = sessions.length;

  // Query all students matching the course's department, semester, and section
  let rosterStudents = [];
  if (course.department && course.semester && course.section) {
    rosterStudents = await prisma.student.findMany({
      where: {
        department: { equals: course.department, mode: "insensitive" },
        semester: course.semester,
        section: { equals: course.section, mode: "insensitive" },
      },
      include: {
        user: true,
      },
    });
  }

  const participantMap = new Map();

  rosterStudents.forEach((student) => {
    participantMap.set(student.userId, {
      studentId: student.userId,
      name: student.user.name,
      rollNumber: student.rollNumber,
    });
  });

  sessions.forEach((session) => {
    session.attendanceRecords.forEach((record) => {
      const studentUser = record.student;
      if (studentUser && !participantMap.has(studentUser.id)) {
        const studentProfile = studentUser.student;
        participantMap.set(studentUser.id, {
          studentId: studentUser.id,
          name: studentUser.name,
          rollNumber: studentProfile ? studentProfile.rollNumber : "N/A",
        });
      }
    });
  });

  const participants = Array.from(participantMap.values());

  const studentsReport = participants.map((participant) => {
    let qrCount = 0;
    let manualCount = 0;
    let absentCount = 0;

    sessions.forEach((session) => {
      const record = session.attendanceRecords.find((r) => r.studentId === participant.studentId);
      if (record) {
        const isManual = record.method === "MANUAL" || record.verificationMethod === "manual" || record.verificationMethod === "MANUAL";
        if (isManual) {
          manualCount++;
        } else {
          qrCount++;
        }
      } else {
        absentCount++;
      }
    });

    const attendedSessions = qrCount + manualCount;
    const attendancePercentage =
      totalSessions === 0
        ? 0.0
        : Number(((attendedSessions / totalSessions) * 100).toFixed(2));

    return {
      studentId: participant.studentId,
      name: participant.name,
      rollNumber: participant.rollNumber,
      attendedSessions,
      totalSessions,
      attendancePercentage,
      presentCount: attendedSessions,
      absentCount,
      qrCount,
      manualCount,
    };
  });

  studentsReport.sort((a, b) => a.attendancePercentage - b.attendancePercentage);

  let averageAttendance = 0.0;
  if (studentsReport.length > 0) {
    const totalPercentage = studentsReport.reduce((acc, s) => acc + s.attendancePercentage, 0);
    averageAttendance = Number((totalPercentage / studentsReport.length).toFixed(2));
  }

  return {
    course: {
      id: course.id,
      name: course.name,
      department: course.department,
      semester: course.semester,
      section: course.section,
      isArchived: course.isArchived,
      archivedAt: course.archivedAt,
      archiveReason: course.archiveReason,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    },
    totalSessions,
    totalStudents: studentsReport.length,
    averageAttendance,
    students: studentsReport,
  };
}

async function getStudentCourseAttendanceHistory(userId, courseId, studentId) {
  const teacher = await getTeacherByUserId(userId);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      sessions: {
        orderBy: { startedAt: "asc" },
        include: {
          attendanceRecords: {
            where: { studentId },
          },
        },
      },
    },
  });

  if (!course) {
    const error = new Error("Course not found");
    error.statusCode = 404;
    throw error;
  }

  if (course.teacherId !== teacher.id) {
    const error = new Error("You do not have permission to access this course");
    error.statusCode = 403;
    throw error;
  }

  // Get student details
  const studentUser = await prisma.user.findUnique({
    where: { id: studentId },
    include: { student: true },
  });

  if (!studentUser) {
    const error = new Error("Student not found");
    error.statusCode = 404;
    throw error;
  }

  const sessions = course.sessions;
  const totalSessions = sessions.length;

  let qrCount = 0;
  let manualCount = 0;
  let absentCount = 0;

  // Compute Last Attended & Streak
  let lastAttendedDate = null;
  let currentAbsenceStreak = 0;
  let foundPresent = false;

  for (let i = sessions.length - 1; i >= 0; i--) {
    const session = sessions[i];
    const record = session.attendanceRecords[0];
    if (record) {
      if (!foundPresent) {
        lastAttendedDate = session.startedAt.toISOString();
        foundPresent = true;
      }
    } else {
      if (!foundPresent) {
        currentAbsenceStreak++;
      }
    }
  }

  if (!foundPresent) {
    currentAbsenceStreak = totalSessions;
  }

  const timelinePromises = sessions.map(async (session) => {
    const record = session.attendanceRecords[0];
    const sessionDate = session.startedAt.toISOString();

    if (record) {
      const isManual = record.method === "MANUAL" || record.verificationMethod === "manual" || record.verificationMethod === "MANUAL";
      if (isManual) {
        manualCount++;
      } else {
        qrCount++;
      }

      return {
        sessionId: session.id,
        attendanceId: record.id,
        sessionDate,
        correctionDate: isManual && record.modifiedAt ? record.modifiedAt.toISOString() : null,
        status: "Present",
        method: isManual ? "MANUAL" : "QR",
        correctionReason: record.correctionReason || null,
        modifiedBy: isManual && record.modifiedByTeacherId ? "You" : null,
        modifiedAt: record.modifiedAt ? record.modifiedAt.toISOString() : null,
      };
    } else {
      absentCount++;
      return {
        sessionId: session.id,
        attendanceId: `session-${session.id}-student-${studentId}`,
        sessionDate,
        correctionDate: null,
        status: "Absent",
        method: null,
        correctionReason: null,
        modifiedBy: null,
        modifiedAt: null,
      };
    }
  });

  const timeline = await Promise.all(timelinePromises);

  const presentCount = qrCount + manualCount;
  const reliabilityPercentage =
    presentCount === 0
      ? null
      : Math.round((qrCount / presentCount) * 100);

  // Correction count is the count of AttendanceCorrection records for that student and sessions within the course
  const sessionIds = sessions.map((s) => s.id);
  const correctionCount = await prisma.attendanceCorrection.count({
    where: {
      studentId,
      sessionId: { in: sessionIds },
    },
  });

  return {
    student: {
      id: studentUser.id,
      name: studentUser.name,
      rollNumber: studentUser.student ? studentUser.student.rollNumber : "N/A",
      department: studentUser.student ? studentUser.student.department : "N/A",
      semester: studentUser.student ? studentUser.student.semester : 0,
      section: studentUser.student ? studentUser.student.section : "N/A",
    },
    course: {
      id: course.id,
      name: course.name,
    },
    summary: {
      totalSessions,
      presentCount,
      absentCount,
      qrCount,
      manualCount,
      attendancePercentage: totalSessions === 0 ? 0.0 : Number(((presentCount / totalSessions) * 100).toFixed(2)),
      reliabilityPercentage,
      hasAttendanceData: presentCount > 0,
      correctionCount,
      lastAttendedDate,
      currentAbsenceStreak,
    },
    timeline,
  };
}

async function correctAttendanceManually(userId, attendanceIdParam, reason) {
  const teacher = await getTeacherByUserId(userId);

  // Validate reason
  const validReasons = ["QR Scan Failed", "Phone Issue", "Network Issue", "Emergency", "Other"];
  if (!validReasons.includes(reason)) {
    const error = new Error(`Invalid correction reason. Must be one of: ${validReasons.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  let sessionId, studentId, recordId;
  const idStr = String(attendanceIdParam);

  if (idStr.startsWith("session-")) {
    const match = idStr.match(/^session-(\d+)-student-(\d+)$/);
    if (!match) {
      const error = new Error("Invalid synthetic attendance ID");
      error.statusCode = 400;
      throw error;
    }
    sessionId = Number(match[1]);
    studentId = Number(match[2]);
  } else {
    recordId = Number(idStr);
    if (isNaN(recordId)) {
      const error = new Error("Invalid attendance ID");
      error.statusCode = 400;
      throw error;
    }

    const record = await prisma.attendance.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      const error = new Error("Attendance record not found");
      error.statusCode = 404;
      throw error;
    }

    sessionId = record.sessionId;
    studentId = record.studentId;
  }

  // Authorize that the teacher owns the course associated with the session
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: { course: true },
  });

  if (!session) {
    const error = new Error("Attendance session not found");
    error.statusCode = 404;
    throw error;
  }

  if (session.course && session.course.teacherId !== teacher.id) {
    const error = new Error("You do not have permission to correct attendance for this course");
    error.statusCode = 403;
    throw error;
  }

  // Check if attendance is already present or manual corrected
  const existingRecord = await prisma.attendance.findUnique({
    where: {
      studentId_sessionId: {
        studentId,
        sessionId,
      },
    },
  });

  if (existingRecord) {
    if (existingRecord.method === "MANUAL" || existingRecord.verificationMethod === "manual" || existingRecord.verificationMethod === "MANUAL") {
      const error = new Error("Attendance record has already been manually corrected");
      error.statusCode = 409;
      throw error;
    }
    if (existingRecord.status === "present" || existingRecord.status === "PRESENT") {
      const error = new Error("Attendance is already marked as present. Only absent records can be corrected.");
      error.statusCode = 400;
      throw error;
    }
  }

  // Perform transaction: update/create attendance record and create AttendanceCorrection audit trail
  const updatedAttendance = await prisma.$transaction(async (tx) => {
    const attendance = await tx.attendance.upsert({
      where: {
        studentId_sessionId: {
          studentId,
          sessionId,
        },
      },
      update: {
        status: "present",
        method: "MANUAL",
        verificationMethod: "manual",
        modifiedByTeacherId: teacher.userId,
        modifiedAt: new Date(),
        correctionReason: reason,
      },
      create: {
        studentId,
        sessionId,
        status: "present",
        method: "MANUAL",
        verificationMethod: "manual",
        modifiedByTeacherId: teacher.userId,
        modifiedAt: new Date(),
        correctionReason: reason,
      },
    });

    await tx.attendanceCorrection.create({
      data: {
        attendanceId: attendance.id,
        sessionId,
        studentId,
        previousMethod: null,
        newMethod: "MANUAL",
        correctionReason: reason,
        modifiedByTeacherId: teacher.userId,
        modifiedAt: new Date(),
      },
    });

    return attendance;
  });

  // Invalidate cache
  invalidateTeacherDashboardCache(teacher.userId);

  return updatedAttendance;
}

async function getStudentCoursesReport(studentUserId) {
  const student = await prisma.student.findUnique({
    where: { userId: studentUserId },
  });

  if (!student) {
    const error = new Error("Student profile not found");
    error.statusCode = 404;
    throw error;
  }

  const rosterCourses = await prisma.course.findMany({
    where: {
      department: { equals: student.department, mode: "insensitive" },
      semester: student.semester,
      section: { equals: student.section, mode: "insensitive" },
      isArchived: false,
    },
    include: {
      sessions: {
        orderBy: { startedAt: "asc" },
        include: {
          attendanceRecords: {
            where: { studentId: studentUserId },
          },
        },
      },
    },
  });

  const attendanceCourses = await prisma.course.findMany({
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
    },
    include: {
      sessions: {
        orderBy: { startedAt: "asc" },
        include: {
          attendanceRecords: {
            where: { studentId: studentUserId },
          },
        },
      },
    },
  });

  const courseMap = new Map();
  rosterCourses.forEach((c) => courseMap.set(c.id, c));
  attendanceCourses.forEach((c) => courseMap.set(c.id, c));
  const courses = Array.from(courseMap.values());

  let totalPresentAcrossCourses = 0;
  let totalSessionsAcrossCourses = 0;

  const courseReports = courses.map((course) => {
    const totalSessions = course.sessions.length;
    let presentCount = 0;
    course.sessions.forEach((session) => {
      if (session.attendanceRecords.length > 0) {
        presentCount++;
      }
    });

    const attendancePercentage = totalSessions === 0 ? 100.0 : Number(((presentCount / totalSessions) * 100).toFixed(1));

    let riskLevel = "atRisk";
    if (attendancePercentage > 85) {
      riskLevel = "safe";
    } else if (attendancePercentage >= 75) {
      riskLevel = "warning";
    }

    const classesNeededFor75 = Math.max(0, (3 * totalSessions) - (4 * presentCount));
    const recoveryTotal = totalSessions + classesNeededFor75;
    const projectedPercentageAfterRecovery = recoveryTotal === 0 ? 100.0 : Math.round(((presentCount + classesNeededFor75) / recoveryTotal) * 100 * 10) / 10;

    totalPresentAcrossCourses += presentCount;
    totalSessionsAcrossCourses += totalSessions;

    return {
      courseId: course.id,
      courseName: course.name,
      courseCode: course.code || "Unknown Course",
      attendancePercentage,
      presentCount,
      totalSessions,
      riskLevel,
      classesNeededFor75,
      projectedPercentageAfterRecovery,
    };
  });

  const overallAttendancePercentage = totalSessionsAcrossCourses === 0
    ? 100.0
    : Math.round((totalPresentAcrossCourses / totalSessionsAcrossCourses) * 100 * 10) / 10;

  const atRiskQuickView = courseReports
    .filter((c) => c.attendancePercentage < 75)
    .map((c) => ({
      courseId: c.courseId,
      courseCode: c.courseCode,
      courseName: c.courseName,
      attendancePercentage: c.attendancePercentage,
      classesNeededFor75: c.classesNeededFor75,
    }));

  return {
    overallAttendancePercentage,
    courses: courseReports,
    atRiskQuickView,
  };
}

async function getStudentCourseDetailReport(studentUserId, courseId) {
  const student = await prisma.student.findUnique({
    where: { userId: studentUserId },
  });

  if (!student) {
    const error = new Error("Student profile not found");
    error.statusCode = 404;
    throw error;
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      sessions: {
        orderBy: { startedAt: "asc" },
        include: {
          attendanceRecords: {
            where: { studentId: studentUserId },
          },
        },
      },
    },
  });

  if (!course) {
    const error = new Error("Course not found");
    error.statusCode = 404;
    throw error;
  }

  const isRosterMatched = course.department && course.semester && course.section &&
    course.department.toLowerCase() === student.department.toLowerCase() &&
    course.semester === student.semester &&
    course.section.toLowerCase() === student.section.toLowerCase();

  const hasRecords = course.sessions.some(s => s.attendanceRecords.length > 0);

  if (!isRosterMatched && !hasRecords) {
    const error = new Error("You do not have access to this course");
    error.statusCode = 403;
    throw error;
  }

  const totalSessions = course.sessions.length;
  let presentCount = 0;
  let qrCount = 0;
  let manualCount = 0;

  course.sessions.forEach((session) => {
    const record = session.attendanceRecords[0];
    if (record) {
      presentCount++;
      const isManual = record.method === "MANUAL" || record.verificationMethod === "manual" || record.verificationMethod === "MANUAL";
      if (isManual) {
        manualCount++;
      } else {
        qrCount++;
      }
    }
  });

  const absentCount = totalSessions - presentCount;
  const attendancePercentage = totalSessions === 0 ? 100.0 : Number(((presentCount / totalSessions) * 100).toFixed(1));

  let currentStreak = 0;
  let bestStreak = 0;
  course.sessions.forEach((session) => {
    const isPresent = session.attendanceRecords.length > 0;
    if (isPresent) {
      currentStreak++;
      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
  });

  let lastAttended = null;
  for (let i = course.sessions.length - 1; i >= 0; i--) {
    if (course.sessions[i].attendanceRecords.length > 0) {
      lastAttended = course.sessions[i].startedAt.toISOString();
      break;
    }
  }

  const classesNeededFor75 = Math.max(0, (3 * totalSessions) - (4 * presentCount));
  const recoveryTotal = totalSessions + classesNeededFor75;
  const projectedPercentageAfterRecovery = recoveryTotal === 0 ? 100.0 : Math.round(((presentCount + classesNeededFor75) / recoveryTotal) * 100 * 10) / 10;

  const newestTenSessions = course.sessions.slice(-10);
  const trendData = newestTenSessions.map((session) => {
    return session.attendanceRecords.length > 0 ? "PRESENT" : "ABSENT";
  });

  const timeline = course.sessions.map((session) => {
    const record = session.attendanceRecords[0];
    const sessionDate = session.startedAt.toISOString();

    if (record) {
      const isManual = record.method === "MANUAL" || record.verificationMethod === "manual" || record.verificationMethod === "MANUAL";
      if (isManual) {
        return {
          sessionId: session.id,
          attendanceId: record.id,
          sessionDate,
          status: "Present",
          method: "MANUAL",
          correctionReason: record.correctionReason || "N/A",
          correctedOn: record.modifiedAt ? record.modifiedAt.toISOString() : record.markedAt.toISOString(),
        };
      } else {
        return {
          sessionId: session.id,
          attendanceId: record.id,
          sessionDate,
          status: "Present",
          method: "QR",
        };
      }
    } else {
      return {
        sessionId: session.id,
        attendanceId: `session-${session.id}-student-${studentUserId}`,
        sessionDate,
        status: "Absent",
      };
    }
  });

  timeline.sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));

  return {
    course: {
      id: course.id,
      name: course.name,
      code: course.code || "Unknown Course",
    },
    attendancePercentage,
    presentCount,
    absentCount,
    totalSessions,
    currentStreak,
    bestStreak,
    lastAttended,
    classesNeededFor75,
    projectedPercentageAfterRecovery,
    trendData,
    timeline,
  };
}

module.exports = {
  getTeacherOverview,
  getStudentReports,
  getStudentSelfReport,
  getStudentAttendanceHistory,
  getStudentHistoryById,
  getTeacherCoursesReport,
  getTeacherCourseDetailReport,
  getTeacherCourseStudentsReport,
  getTeacherDashboard,
  invalidateTeacherDashboardCache,
  getCourseDefaulters,
  getCourseTrends,
  exportCourseCSV,
  exportCourseDefaultersCSV,
  exportCoursePDF,
  getStudentCourseAttendanceHistory,
  correctAttendanceManually,
  // Student report upgrades
  getStudentCoursesReport,
  getStudentCourseDetailReport,
};