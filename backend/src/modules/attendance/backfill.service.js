const { prisma } = require("../../config/database");

/**
 * Runs a transactional historical backfill of ABSENT records for a student when
 * they are added to a course or register.
 *
 * @param {object} tx - Prisma transaction client context
 * @param {object} student - Student database object { userId, department, year, section }
 */
async function backfillStudentAttendance(tx, student) {
  if (!student.department || !student.year || !student.section) {
    return;
  }

  // Find all historical AttendanceSessions for courses where the student matches the criteria
  // either from current course rules or snapshot rules
  const matchingSessions = await tx.attendanceSession.findMany({
    where: {
      OR: [
        // Snapshot matches
        {
          departmentSnapshot: { equals: student.department, mode: "insensitive" },
          yearSnapshot: student.year,
          sectionSnapshot: { equals: student.section, mode: "insensitive" },
        },
        // Legacy/course matches when snapshots are null
        {
          departmentSnapshot: null,
          yearSnapshot: null,
          sectionSnapshot: null,
          course: {
            department: { equals: student.department, mode: "insensitive" },
            year: student.year,
            section: { equals: student.section, mode: "insensitive" },
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  if (matchingSessions.length === 0) {
    return;
  }

  const sessionIds = matchingSessions.map((s) => s.id);

  // Find existing attendance records to prevent duplicates
  const existingRecords = await tx.attendance.findMany({
    where: {
      studentId: student.userId,
      sessionId: { in: sessionIds },
    },
    select: {
      sessionId: true,
    },
  });

  const existingSessionIds = new Set(existingRecords.map((r) => r.sessionId));
  const missingSessionIds = sessionIds.filter((sid) => !existingSessionIds.has(sid));

  if (missingSessionIds.length === 0) {
    return;
  }

  // Transactionally create ABSENT records for all missing sessions
  await tx.attendance.createMany({
    data: missingSessionIds.map((sid) => ({
      studentId: student.userId,
      sessionId: sid,
      status: "absent",
      verificationMethod: "AUTO_ABSENT",
      method: "AUTO_ABSENT",
    })),
    skipDuplicates: true,
  });
}

/**
 * Runs a backfill for all students in a course when the course eligibility details are modified.
 *
 * @param {object} tx - Prisma transaction client context
 * @param {number} courseId - ID of the course
 * @param {object} newRules - { department, year, section }
 */
async function backfillCourseStudents(tx, courseId, newRules) {
  if (!newRules.department || !newRules.year || !newRules.section) {
    return;
  }

  // Find all students matching the new course criteria
  const matchingStudents = await tx.student.findMany({
    where: {
      department: { equals: newRules.department, mode: "insensitive" },
      year: newRules.year,
      section: { equals: newRules.section, mode: "insensitive" },
    },
  });

  if (matchingStudents.length === 0) {
    return;
  }

  // Find all historical AttendanceSessions for this course
  const courseSessions = await tx.attendanceSession.findMany({
    where: {
      courseId,
    },
    select: {
      id: true,
    },
  });

  if (courseSessions.length === 0) {
    return;
  }

  const sessionIds = courseSessions.map((s) => s.id);

  for (const student of matchingStudents) {
    const existingRecords = await tx.attendance.findMany({
      where: {
        studentId: student.userId,
        sessionId: { in: sessionIds },
      },
      select: {
        sessionId: true,
      },
    });

    const existingSessionIds = new Set(existingRecords.map((r) => r.sessionId));
    const missingSessionIds = sessionIds.filter((sid) => !existingSessionIds.has(sid));

    if (missingSessionIds.length > 0) {
      await tx.attendance.createMany({
        data: missingSessionIds.map((sid) => ({
          studentId: student.userId,
          sessionId: sid,
          status: "absent",
          verificationMethod: "AUTO_ABSENT",
          method: "AUTO_ABSENT",
        })),
        skipDuplicates: true,
      });
    }
  }
}

module.exports = {
  backfillStudentAttendance,
  backfillCourseStudents,
};
