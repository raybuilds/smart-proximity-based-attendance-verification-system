const attendanceService = require("./attendance.service");
const {
  startSessionSchema,
  endSessionSchema,
} = require("./attendance.validation");

async function startSession(req, res, next) {
  try {
    startSessionSchema.parse(req.body || {});
    const session = await attendanceService.startSession(req.user.sub);

    res.status(201).json({
      success: true,
      session,
    });
  } catch (error) {
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

module.exports = {
  startSession,
  endSession,
  getActiveSession,
};
