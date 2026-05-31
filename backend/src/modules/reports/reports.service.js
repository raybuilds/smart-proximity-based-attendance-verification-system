const { prisma } = require("../../config/database");

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
        session: true,
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
    verificationMethod:
      record.verificationMethod,
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

module.exports = {
  getTeacherOverview,
  getStudentReports,
  getStudentSelfReport,
  getStudentAttendanceHistory,
  getStudentHistoryById,
};