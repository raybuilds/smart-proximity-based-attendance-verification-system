const jwt = require("jsonwebtoken");
const { prisma } = require("../../config/database");
const { HTTP_STATUS } = require("../../utils/constants");
const { logger } = require("../../utils/logger");
const { invalidateTeacherDashboardCache } = require("../reports/reports.service");

function logEligibilityAudit({ studentId, courseId, sessionId, reason }) {
  const auditLog = {
    studentId,
    courseId,
    sessionId,
    reason,
    timestamp: new Date().toISOString(),
  };
  
  const logMsg = "[ELIGIBILITY AUDIT LOG]: " + JSON.stringify(auditLog);
  console.log(logMsg);
  
  if (logger && typeof logger.warn === "function") {
    logger.warn(logMsg);
  }
}

function getSessionRules(session) {
  // Priority 1: Snapshots
  if (
    session.departmentSnapshot !== null ||
    session.yearSnapshot !== null ||
    session.sectionSnapshot !== null
  ) {
    return {
      department: session.departmentSnapshot,
      year: session.yearSnapshot,
      section: session.sectionSnapshot,
    };
  }

  // Priority 2: Fallback to current course rules
  if (session.course) {
    return {
      department: session.course.department,
      year: session.course.year,
      section: session.course.section,
    };
  }

  // Priority 3: No rules
  return {
    department: null,
    year: null,
    section: null,
  };
}

function validateCourseEligibility(student, session) {
  const rules = getSessionRules(session);

  // If no eligibility rules are set, anyone is allowed (legacy course / no rules)
  if (!rules.department && !rules.year && !rules.section) {
    return true;
  }

  // If student record itself is missing (null/undefined) or missing schema values, reject
  if (
    !student ||
    !student.department ||
    student.year === null ||
    student.year === undefined ||
    !student.section
  ) {
    logEligibilityAudit({
      studentId: student?.userId || null,
      courseId: session.courseId,
      sessionId: session.id,
      reason: "Academic profile incomplete",
    });
    
    const error = new Error("Your academic profile is incomplete. Please contact your instructor.");
    error.statusCode = 403;
    throw error;
  }

  // Check Department (Case-Insensitive)
  if (rules.department) {
    const studentDept = student.department.trim().toUpperCase();
    const courseDept = rules.department.trim().toUpperCase();
    if (studentDept !== courseDept) {
      logEligibilityAudit({
        studentId: student.userId,
        courseId: session.courseId,
        sessionId: session.id,
        reason: "Department mismatch",
      });
      
      const error = new Error("You are not eligible to mark attendance for this course. Please contact your instructor if you believe this is incorrect.");
      error.statusCode = 403;
      throw error;
    }
  }

  // Check Year
  if (rules.year) {
    if (student.year !== rules.year) {
      logEligibilityAudit({
        studentId: student.userId,
        courseId: session.courseId,
        sessionId: session.id,
        reason: "Year mismatch",
      });
      
      const error = new Error("You are not eligible to mark attendance for this course. Please contact your instructor if you believe this is incorrect.");
      error.statusCode = 403;
      throw error;
    }
  }

  // Check Section (Case-Insensitive)
  if (rules.section) {
    const studentSec = student.section.trim().toUpperCase();
    const courseSec = rules.section.trim().toUpperCase();
    if (studentSec !== courseSec) {
      logEligibilityAudit({
        studentId: student.userId,
        courseId: session.courseId,
        sessionId: session.id,
        reason: "Section mismatch",
      });
      
      const error = new Error("You are not eligible to mark attendance for this course. Please contact your instructor if you believe this is incorrect.");
      error.statusCode = 403;
      throw error;
    }
  }

  return true;
}

async function markAttendanceFromQr({ studentId, sessionCode, nonce, proximityToken, ssid, bssid, rssi, devicePlatform }) {
  const session = await prisma.attendanceSession.findUnique({
    where: { sessionCode },
    include: {
      course: true,
    },
  });

  if (!session) {
    const error = new Error("Attendance session not found");
    error.statusCode = HTTP_STATUS.NOT_FOUND;
    throw error;
  }

  if (!session.isActive) {
    const error = new Error("Attendance session is no longer active");
    error.statusCode = HTTP_STATUS.BAD_REQUEST;
    throw error;
  }

  // Verify proximity token signature and retrieve claims
  let decoded;
  try {
    decoded = jwt.verify(proximityToken, process.env.JWT_SECRET || "replace-with-a-secure-jwt-secret");
  } catch (err) {
    const error = new Error("Invalid or expired proximity token");
    error.statusCode = HTTP_STATUS.BAD_REQUEST;
    throw error;
  }

  const { jti, studentId: tokenStudentId, sessionId: tokenSessionId, nonce: tokenNonce } = decoded;
  console.log('Decoded token JTI (in service):', jti);

  // Enforce identity binding
  if (tokenStudentId !== studentId) {
    const error = new Error("Proximity token student mismatch");
    error.statusCode = HTTP_STATUS.BAD_REQUEST;
    throw error;
  }

  // Enforce session binding
  if (tokenSessionId !== session.id) {
    const error = new Error("Proximity token session mismatch");
    error.statusCode = HTTP_STATUS.BAD_REQUEST;
    throw error;
  }

  // Enforce nonce binding
  if (tokenNonce !== nonce) {
    const error = new Error("Proximity token QR nonce mismatch");
    error.statusCode = HTTP_STATUS.BAD_REQUEST;
    throw error;
  }

  const validQr = await prisma.sessionQRCode.findFirst({
    where: {
      nonce,
      sessionId: session.id,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!validQr) {
    const error = new Error("QR code expired or invalid");
    error.statusCode = HTTP_STATUS.BAD_REQUEST;
    throw error;
  }

  const student = await prisma.student.findUnique({
    where: { userId: studentId },
  });

  // Perform eligibility checks
  validateCourseEligibility(student, session);

  // Execute token consumption and attendance marking in an atomic transaction
  const attendanceRecord = await prisma.$transaction(async (tx) => {
    // 1. Replay protection - consume token inside transaction
    try {
      console.log('Inserting UsedProximityToken with JTI:', jti);
      await tx.usedProximityToken.create({
        data: {
          jti,
          expiresAt: new Date(decoded.exp * 1000)
        }
      });
    } catch (err) {
      if (err.code === "P2002") {
        const error = new Error("Proximity token already used");
        error.statusCode = HTTP_STATUS.CONFLICT;
        throw error;
      }
      throw err;
    }

    // 2. Check for duplicate attendance inside transaction
    const existingAttendance = await tx.attendance.findFirst({
      where: {
        studentId,
        sessionId: session.id,
      },
    });

    if (existingAttendance) {
      const error = new Error("Attendance already marked");
      error.statusCode = HTTP_STATUS.CONFLICT;
      throw error;
    }

    // 3. Create attendance record
    return tx.attendance.create({
      data: {
        studentId,
        sessionId: session.id,
        status: "present",
        verificationMethod: "qr",
        markedAt: new Date(),
        ssid,
        bssid,
        rssi,
        devicePlatform,
      },
    });
  });

  invalidateTeacherDashboardCache(session.teacherId);

  return {
    success: true,
    message: "Attendance marked successfully",
    attendance: attendanceRecord,
  };
}

async function updateAttendanceStatus(userId, attendanceId, status) {
  const teacher = await prisma.teacher.findUnique({ where: { userId } });
  if (!teacher) throw new Error("Teacher profile not found");
  
  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: { session: true }
  });
  if (!attendance) throw new Error("Attendance record not found");
  
  if (attendance.session.teacherId !== teacher.userId) {
    const error = new Error("Access denied.");
    error.statusCode = 403;
    throw error;
  }

  const updated = await prisma.attendance.update({
    where: { id: attendanceId },
    data: { status }
  });

  invalidateTeacherDashboardCache(teacher.userId);
  return updated;
}

async function deleteAttendanceRecord(userId, attendanceId) {
  const teacher = await prisma.teacher.findUnique({ where: { userId } });
  if (!teacher) throw new Error("Teacher profile not found");
  
  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: { session: true }
  });
  if (!attendance) throw new Error("Attendance record not found");
  
  if (attendance.session.teacherId !== teacher.userId) {
    const error = new Error("Access denied.");
    error.statusCode = 403;
    throw error;
  }

  await prisma.attendance.delete({
    where: { id: attendanceId }
  });

  invalidateTeacherDashboardCache(teacher.userId);
}

module.exports = {
  markAttendanceFromQr,
  validateCourseEligibility,
  updateAttendanceStatus,
  deleteAttendanceRecord,
};

// Prune expired proximity tokens every 5 minutes to avoid DB growth
setInterval(async () => {
  try {
    const result = await prisma.usedProximityToken.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
    if (result.count > 0) {
      console.log(`[PRUNE]: Cleaned up ${result.count} expired proximity tokens.`);
    }
  } catch (err) {
    console.error("[PRUNE ERROR]: Failed to prune used proximity tokens:", err);
  }
}, 300000); // 5 minutes

