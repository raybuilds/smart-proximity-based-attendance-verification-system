const crypto = require("crypto");

const { prisma } = require("../../config/database");
const { HTTP_STATUS, QR } = require("../../utils/constants");

function generateNonce(length = QR.NONCE_LENGTH) {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let nonce = "";

  while (nonce.length < length) {
    const randomBytes = crypto.randomBytes(length);

    for (const byte of randomBytes) {
      if (nonce.length >= length) {
        break;
      }

      nonce += charset[byte % charset.length];
    }
  }

  return nonce;
}

async function generateUniqueNonce() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const nonce = generateNonce();
    const existingQr = await prisma.sessionQRCode.findUnique({
      where: { nonce },
    });

    if (!existingQr) {
      return nonce;
    }
  }

  const error = new Error("Could not generate a unique QR nonce");
  error.statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  throw error;
}

async function getTeacherOwnedActiveSession(sessionId, teacherId) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      qrCodes: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!session) {
    const error = new Error("Attendance session not found");
    error.statusCode = HTTP_STATUS.NOT_FOUND;
    throw error;
  }

  if (session.teacherId !== teacherId) {
    const error = new Error("You are not authorized to access this session");
    error.statusCode = HTTP_STATUS.FORBIDDEN;
    throw error;
  }

  if (!session.isActive) {
    const error = new Error("Attendance session is no longer active");
    error.statusCode = HTTP_STATUS.BAD_REQUEST;
    throw error;
  }

  return session;
}

async function createFreshQr(sessionId) {
  const nonce = await generateUniqueNonce();
  const expiresAt = new Date(Date.now() + QR.EXPIRY_MS);

  await prisma.sessionQRCode.updateMany({
    where: {
      sessionId,
      expiresAt: {
        gt: new Date(),
      },
    },
    data: {
      expiresAt: new Date(),
    },
  });

  return prisma.sessionQRCode.create({
    data: {
      sessionId,
      nonce,
      expiresAt,
    },
  });
}

async function getCurrentQrForSession(sessionId, teacherId) {
  const session = await getTeacherOwnedActiveSession(sessionId, teacherId);
  const now = new Date();

  const currentQr = await prisma.sessionQRCode.findFirst({
    where: {
      sessionId: session.id,
      expiresAt: {
        gt: now,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (currentQr) {
    return currentQr;
  }

  return createFreshQr(session.id);
}

module.exports = {
  getCurrentQrForSession,
};
