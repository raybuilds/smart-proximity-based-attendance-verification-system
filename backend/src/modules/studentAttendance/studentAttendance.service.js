const { prisma } = require("../../config/database");
const { HTTP_STATUS } = require("../../utils/constants");

async function markAttendanceFromQr({ studentId, sessionCode, nonce }) {
  const session = await prisma.attendanceSession.findUnique({
    where: { sessionCode },
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

  const existingAttendance = await prisma.attendance.findFirst({
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

  await prisma.attendance.create({
    data: {
      studentId,
      sessionId: session.id,
      status: "present",
      verificationMethod: "qr",
      markedAt: new Date(),
    },
  });

  return {
    success: true,
    message: "Attendance marked successfully",
  };
}

module.exports = {
  markAttendanceFromQr,
};
