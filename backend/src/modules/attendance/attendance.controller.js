const attendanceService = require("./attendance.service");
const {
  startSessionSchema,
  endSessionSchema,
} = require("./attendance.validation");

async function startSession(req, res, next) {
  try {
    const payload = startSessionSchema.parse(req.body || {});
    const session = await attendanceService.startSession(req.user.sub, payload.courseId, payload.rssiThreshold);

    res.status(201).json({
      success: true,
      session,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      error.statusCode = 400;
      error.message = error.issues[0]?.message || "Invalid payload";
    }
    next(error);
  }
}

async function endSession(req, res, next) {
  try {
    endSessionSchema.parse(req.body || {});
    const session = await attendanceService.endSession(req.user.sub);

    res.status(200).json({
      success: true,
      session,
    });
  } catch (error) {
    next(error);
  }
}

async function getActiveSession(req, res, next) {
  try {
    const session = await attendanceService.getTeacherActiveSession(req.user.sub);

    res.status(200).json({
      success: true,
      session,
    });
  } catch (error) {
    next(error);
  }
}

async function getActiveSessionStats(req, res, next) {
  try {
    const stats = await attendanceService.getActiveSessionStats(req.user.sub);
    res.status(200).json({
      success: true,
      ...stats,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  startSession,
  endSession,
  getActiveSession,
  getActiveSessionStats,
};
