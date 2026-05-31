const { prisma } = require("../../config/database");
const { HTTP_STATUS, WIFI } = require("../../utils/constants");

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
    },
  });
}

async function startSession(teacherId) {
  const existingActiveSession = await getTeacherActiveSession(teacherId);

  if (existingActiveSession) {
    const error = new Error("You already have an active attendance session");
    error.statusCode = HTTP_STATUS.CONFLICT;
    throw error;
  }

  const sessionCode = await generateUniqueSessionCode();

  return prisma.attendanceSession.create({
    data: {
      teacherId,
      sessionCode,
      teacherSSID: WIFI.DEMO_SSID,
      teacherBSSID: WIFI.DEMO_BSSID,
      isActive: true,
    },
    include: {
      attendanceRecords: true,
    },
  });
}

async function endSession(teacherId) {
  const activeSession = await getTeacherActiveSession(teacherId);

  if (!activeSession) {
    const error = new Error("No active attendance session found");
    error.statusCode = HTTP_STATUS.NOT_FOUND;
    throw error;
  }

  return prisma.attendanceSession.update({
    where: { id: activeSession.id },
    data: {
      isActive: false,
      endedAt: new Date(),
    },
    include: {
      attendanceRecords: true,
    },
  });
}

module.exports = {
  getTeacherActiveSession,
  startSession,
  endSession,
};
