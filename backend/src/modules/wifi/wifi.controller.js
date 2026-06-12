const { z } = require("zod");

const wifiService = require("./wifi.service");

const wifiValidationSchema = z.object({
  sessionCode: z.string().trim().min(1, "Session code is required"),
  ssid: z.string().trim().min(1, "SSID is required"),
  bssid: z.string().trim().min(1, "BSSID is required"),
  rssi: z.number().int(),
});

async function validateWifi(req, res, next) {
  console.log("🔥 VALIDATE WIFI CALLED 🔥");

  try {
    console.log("=================================");
    console.log("REQUEST BODY:", req.body);

    const payload = wifiValidationSchema.parse(req.body);

    console.log("PARSED PAYLOAD:", payload);

    const result = await wifiService.validateWifiProximity({
      ...payload,
      studentId: req.user.sub,
    });

    console.log("SERVICE RESULT:", result);

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("WIFI ERROR:", error);

    if (error.name === "ZodError") {
      error.statusCode = 400;
      error.message =
        error.issues[0]?.message || "Invalid WiFi validation payload";
    }

    next(error);
  }
}
module.exports = {
  validateWifi,
};
