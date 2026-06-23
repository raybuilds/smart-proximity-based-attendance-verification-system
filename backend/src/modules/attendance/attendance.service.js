const { prisma } = require("../../config/database");
const { HTTP_STATUS, WIFI } = require("../../utils/constants");
const { invalidateTeacherDashboardCache } = require("../reports/reports.service");

function generateSessionCode(length = 6) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";

  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }

  return code;
}

async function generateUniqueSessionCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const sessionCode = generateSessionCode();
    const existingSession = await prisma.attendanceSession.findUnique({
      where: { sessionCode },
    });

    if (!existingSession) {
      return sessionCode;
    }
  }

  const error = new Error("Could not generate a unique session code");
  error.statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  throw error;
}

async function getTeacherActiveSession(teacherId) {
  return prisma.attendanceSession.findFirst({
    where: {
      teacherId,
      isActive: true,
    },
    orderBy: {
      startedAt: "desc",
    },
    include: {
      attendanceRecords: true,
      course: {
        select: {
          id: true,
          name: true,
          department: true,
          year: true,
          section: true,
        },
      },
    },
  });
}

async function startSession(userId, courseId, rssiThreshold) {
  try {
    const createdSession = await prisma.$transaction(async (tx) => {
      // 1. Acquire course lock
      const courseLock = await tx.$queryRaw`SELECT * FROM "Course" WHERE id = ${courseId} FOR UPDATE`;
      const course = courseLock[0];

      if (!course) {
        const error = new Error("Course not found");
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      // 2. Acquire user/teacher lock
      const userLock = await tx.$queryRaw`SELECT * FROM "User" WHERE id = ${userId} FOR UPDATE`;
      const user = userLock[0];

      if (!user) {
        const error = new Error("Teacher profile not found");
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      const teacher = await tx.teacher.findUnique({
        where: { userId },
      });

      if (!teacher) {
        const error = new Error("Teacher profile not found");
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      if (!teacher.registeredSSID) {
        const error = new Error("Please configure your hotspot settings before starting attendance.");
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
      }

      if (course.teacherId !== teacher.id) {
        const error = new Error("You do not have permission to access this course");
        error.statusCode = HTTP_STATUS.FORBIDDEN;
        throw error;
      }

      // Prevent starting sessions for archived courses
      if (course.isArchived) {
        const error = new Error("Archived courses cannot be used to start attendance sessions.");
        error.statusCode = 409;
        throw error;
      }

      // Prevent starting sessions for empty eligibility groups
      if (course.department || course.year || course.section) {
        const where = {};
        if (course.department) {
          where.department = {
            equals: course.department,
            mode: "insensitive",
          };
        }
        if (course.year) {
          where.year = course.year;
        }
        if (course.section) {
          where.section = {
            equals: course.section,
            mode: "insensitive",
          };
        }

        const studentCount = await tx.student.count({ where });

        if (studentCount === 0) {
          const error = new Error("No eligible students exist for this course. Please review the course eligibility settings.");
          error.statusCode = 409;
          throw error;
        }
      }

      const existingCourseActiveSession = await tx.attendanceSession.findFirst({
        where: {
          courseId,
          isActive: true,
        },
      });

      if (existingCourseActiveSession) {
        const error = new Error("An active session already exists for this course.");
        error.statusCode = HTTP_STATUS.CONFLICT;
        throw error;
      }

      const existingActiveSession = await tx.attendanceSession.findFirst({
        where: {
          teacherId: userId,
          isActive: true,
        },
        orderBy: {
          startedAt: "desc",
        },
      });

      if (existingActiveSession) {
        const error = new Error("You already have an active attendance session.");
        error.statusCode = HTTP_STATUS.CONFLICT;
        throw error;
      }

      let sessionCode = null;
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const attemptCode = generateSessionCode();
        const existingSession = await tx.attendanceSession.findUnique({
          where: { sessionCode: attemptCode },
        });

        if (!existingSession) {
          sessionCode = attemptCode;
          break;
        }
      }

      if (!sessionCode) {
        const error = new Error("Could not generate a unique session code");
        error.statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        throw error;
      }

      const created = await tx.attendanceSession.create({
        data: {
          teacherId: userId,
          courseId,
          sessionCode,
          teacherSSID: teacher.registeredSSID,
          teacherBSSID: teacher.registeredBSSID,
          rssiThreshold: rssiThreshold ? parseInt(rssiThreshold, 10) : -70,
          isActive: true,
          departmentSnapshot: course.department,
          yearSnapshot: course.year,
          sectionSnapshot: course.section,
        },
        include: {
          attendanceRecords: true,
          course: {
            select: {
              id: true,
              name: true,
              department: true,
              year: true,
              section: true,
            },
          },
        },
      });

      return created;
    });

    invalidateTeacherDashboardCache(userId);
    return createdSession;
  } catch (error) {
    const isP2002 = error.code === "P2002";
    const isDb23505 = error.code === "23505" || error.parent?.code === "23505";
    
    const message = error.message || "";
    const constraint = error.constraint || error.parent?.constraint || "";

    const matchesCourseConstraint =
      constraint === "one_active_session_per_course" ||
      constraint.includes("one_active_session_per_course") ||
      message.includes("one_active_session_per_course") ||
      (isP2002 && message.includes("one_active_session_per_course")) ||
      (isDb23505 && (
        message.includes("one_active_session_per_course") ||
        constraint.includes("one_active_session_per_course")
      ));

    const matchesTeacherConstraint =
      constraint === "one_active_session_per_teacher" ||
      constraint.includes("one_active_session_per_teacher") ||
      message.includes("one_active_session_per_teacher") ||
      (isP2002 && message.includes("one_active_session_per_teacher")) ||
      (isDb23505 && (
        message.includes("one_active_session_per_teacher") ||
        constraint.includes("one_active_session_per_teacher")
      ));

    if (matchesCourseConstraint) {
      const conflictError = new Error("An active session already exists for this course.");
      conflictError.statusCode = 409;
      throw conflictError;
    }

    if (matchesTeacherConstraint) {
      const conflictError = new Error("You already have an active attendance session.");
      conflictError.statusCode = 409;
      throw conflictError;
    }

    throw error;
  }
}

async function endSession(teacherId) {
  const activeSession = await getTeacherActiveSession(teacherId);

  if (!activeSession) {
    const error = new Error("No active attendance session found");
    error.statusCode = HTTP_STATUS.NOT_FOUND;
    throw error;
  }

  const updatedSession = await prisma.attendanceSession.update({
    where: { id: activeSession.id },
    data: {
      isActive: false,
      endedAt: new Date(),
    },
    include: {
      attendanceRecords: true,
      course: {
        select: {
          id: true,
          name: true,
          department: true,
          year: true,
          section: true,
        },
      },
    },
  });

  invalidateTeacherDashboardCache(teacherId);
  return updatedSession;
}

async function getActiveSessionStats(teacherId) {
  const session = await prisma.attendanceSession.findFirst({
    where: {
      teacherId,
      isActive: true,
    },
    include: {
      course: true,
      attendanceRecords: {
        include: {
          student: {
            include: {
              student: true,
            },
          },
        },
        orderBy: {
          markedAt: "desc",
        },
      },
    },
  });

  if (!session) {
    return {
      attendanceMarked: 0,
      enrolledCount: 0,
      attendancePercentage: 0,
      verificationSummary: {
        Verified: 0,
        Rejected: 0,
        "WiFi Only": 0,
        Pending: 0,
        "BLE Verified": 0,
      },
      recentCheckIns: [],
    };
  }

  // Count eligible students
  let enrolledCount = 0;
  if (!session.departmentSnapshot && !session.yearSnapshot && !session.sectionSnapshot) {
    enrolledCount = await prisma.student.count();
  } else {
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
    enrolledCount = await prisma.student.count({ where });
  }

  const attendanceMarked = session.attendanceRecords.length;
  const attendancePercentage = enrolledCount === 0 ? 0 : Number(((attendanceMarked / enrolledCount) * 100).toFixed(1));

  const recentCheckIns = session.attendanceRecords.map((record) => {
    // Extract HH:MM:SS from markedAt timestamp adjusted for timezone split
    const parts = record.markedAt.toISOString().split("T")[1].split(".")[0].split(":");
    // Simple HH:MM:SS format
    const timestamp = `${parts[0]}:${parts[1]}:${parts[2]}`;

    return {
      rollNumber: record.student.student?.rollNumber || "N/A",
      name: record.student.name,
      timestamp,
    };
  });

  // Compute Network Consistency Stats dynamically
  const bssidCounts = {};
  let validBssidCount = 0;
  let nullBssidCount = 0;
  
  // RSSI statistics calculations
  let totalRssi = 0;
  let rssiCount = 0;
  let strongestRssi = null;
  let weakestRssi = null;

  session.attendanceRecords.forEach((record) => {
    const rawBssid = record.bssid ? record.bssid.trim().toLowerCase() : null;
    const isDummy = !rawBssid || rawBssid === "02:00:00:00:00:00" || rawBssid === "unknown";
    
    if (isDummy) {
      nullBssidCount++;
    } else {
      validBssidCount++;
      bssidCounts[rawBssid] = (bssidCounts[rawBssid] || 0) + 1;
    }

    if (record.rssi !== null && record.rssi !== undefined) {
      totalRssi += record.rssi;
      rssiCount += 1;
      if (strongestRssi === null || record.rssi > strongestRssi) {
        strongestRssi = record.rssi;
      }
      if (weakestRssi === null || record.rssi < weakestRssi) {
        weakestRssi = record.rssi;
      }
    }
  });

  const averageRssi = rssiCount > 0 ? Math.round(totalRssi / rssiCount) : null;
  const rssiVariance = (averageRssi !== null && session.rssiThreshold !== null && session.rssiThreshold !== undefined)
    ? (averageRssi - session.rssiThreshold)
    : null;

  // Find dominant BSSID
  let dominantBssid = null;
  let maxCount = 0;
  Object.entries(bssidCounts).forEach(([bssid, count]) => {
    if (count > maxCount) {
      maxCount = count;
      dominantBssid = bssid;
    }
  });

  // Count mismatches (BSSID is valid but !== dominantBssid)
  let mismatchCount = 0;
  if (dominantBssid) {
    session.attendanceRecords.forEach((record) => {
      const rawBssid = record.bssid ? record.bssid.trim().toLowerCase() : null;
      const isDummy = !rawBssid || rawBssid === "02:00:00:00:00:00" || rawBssid === "unknown";
      if (!isDummy && rawBssid !== dominantBssid) {
        mismatchCount++;
      }
    });
  }

  // Calculate Risk Level
  let riskLevel = "LOW";
  if (attendanceMarked > 0) {
    const mismatchPercentage = (mismatchCount / attendanceMarked) * 100;
    if (mismatchPercentage > 15) {
      riskLevel = "HIGH";
    } else if (mismatchPercentage > 5) {
      riskLevel = "MEDIUM";
    }
  }

  return {
    attendanceMarked,
    enrolledCount,
    attendancePercentage,
    verificationSummary: {
      Verified: attendanceMarked,
      Rejected: 0,
      "WiFi Only": 0,
      Pending: 0,
      "BLE Verified": 0,
    },
    networkConsistency: {
      dominantBssid: dominantBssid ? dominantBssid.toUpperCase() : "N/A",
      validBssidCount,
      nullBssidCount,
      mismatchCount,
      riskLevel,
      expectedRssi: session.rssiThreshold,
      averageRssi,
      strongestRssi,
      weakestRssi,
      rssiVariance,
    },
    recentCheckIns,
  };
}

module.exports = {
  getTeacherActiveSession,
  startSession,
  endSession,
  getActiveSessionStats,
};

