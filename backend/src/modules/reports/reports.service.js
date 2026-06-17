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
  const totalSessions =
    await prisma.attendanceSession.count();

  const presentCount =
    await prisma.attendance.count({
      where: {
        studentId,
      },
    });

  const absentCount =
    totalSessions - presentCount;

  const attendancePercentage =
    totalSessions === 0
      ? 0
      : Number(
          (
            (presentCount / totalSessions) *
            100
          ).toFixed(1)
        );

  return {
    presentCount,
    absentCount,
    attendancePercentage,
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

  const participantMap = new Map();
  const attendanceCounts = {};

  sessions.forEach((session) => {
    session.attendanceRecords.forEach((record) => {
      const studentUser = record.student;
      if (studentUser) {
        const studentProfile = studentUser.student;
        if (!participantMap.has(studentUser.id)) {
          participantMap.set(studentUser.id, {
            studentId: studentUser.id,
            name: studentUser.name,
            rollNumber: studentProfile ? studentProfile.rollNumber : "N/A",
          });
        }
        attendanceCounts[studentUser.id] = (attendanceCounts[studentUser.id] || 0) + 1;
      }
    });
  });

  const participants = Array.from(participantMap.values());

  const studentsReport = participants.map((participant) => {
    const attendedSessions = attendanceCounts[participant.studentId] || 0;
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

module.exports = {
  getTeacherOverview,
  getStudentReports,
  getStudentSelfReport,
  getStudentAttendanceHistory,
  getStudentHistoryById,
  getTeacherCoursesReport,
  getTeacherCourseDetailReport,
  getTeacherCourseStudentsReport,
  // New service methods
  getTeacherDashboard,
  invalidateTeacherDashboardCache,
  getCourseDefaulters,
  getCourseTrends,
  exportCourseCSV,
  exportCourseDefaultersCSV,
  exportCoursePDF,
};