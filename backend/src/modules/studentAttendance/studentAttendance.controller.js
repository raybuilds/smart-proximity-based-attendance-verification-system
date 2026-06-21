const { z } = require("zod");

const studentAttendanceService = require("./studentAttendance.service");

const scanSchema = z.object({
  sessionCode: z.string().trim().min(1, "Session code is required"),
  nonce: z.string().trim().min(1, "QR nonce is required"),
  proximityToken: z.string().trim().min(1, "Proximity token is required"),
  ssid: z.string().trim().nullable().optional(),
  bssid: z.string().trim().nullable().optional(),
  rssi: z.number().int().nullable().optional(),
  devicePlatform: z.string().trim().nullable().optional(),
});

async function scanAttendance(req, res, next) {
  try {
    const payload = scanSchema.parse(req.body);
    const result = await studentAttendanceService.markAttendanceFromQr({
      studentId: req.user.sub,
      sessionCode: payload.sessionCode,
      nonce: payload.nonce,
      proximityToken: payload.proximityToken,
      ssid: payload.ssid,
      bssid: payload.bssid,
      rssi: payload.rssi,
      devicePlatform: payload.devicePlatform,
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
