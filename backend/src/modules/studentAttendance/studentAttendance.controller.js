const { z } = require("zod");

const studentAttendanceService = require("./studentAttendance.service");

const scanSchema = z.object({
  sessionCode: z.string().trim().min(1, "Session code is required"),
  nonce: z.string().trim().min(1, "QR nonce is required"),
});

async function scanAttendance(req, res, next) {
  try {
    const payload = scanSchema.parse(req.body);
    const result = await studentAttendanceService.markAttendanceFromQr({
      studentId: req.user.sub,
      sessionCode: payload.sessionCode,
      nonce: payload.nonce,
    });

    res.status(200).json(result);
  } catch (error) {
    if (error.name === "ZodError") {
      error.statusCode = 400;
      error.message = error.issues[0]?.message || "Invalid scan payload";
    }

    next(error);
  }
}

module.exports = {
  scanAttendance,
};
