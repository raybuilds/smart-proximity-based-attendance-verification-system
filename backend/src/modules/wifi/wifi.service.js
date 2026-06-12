const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const { prisma } = require("../../config/database");
const { HTTP_STATUS, WIFI } = require("../../utils/constants");

async function validateWifiProximity({ sessionCode, ssid, bssid, rssi, studentId }) {
  console.log("=================================");
  console.log("SESSION CODE:", sessionCode);
  console.log("SCANNED SSID:", ssid);
  console.log("SCANNED BSSID:", bssid);
  console.log("SCANNED RSSI:", rssi);
  console.log("STUDENT ID:", studentId);

  const session = await prisma.attendanceSession.findUnique({
    where: { sessionCode },
  });

  console.log("SESSION FOUND:", !!session);

  if (session) {
    console.log("SESSION SSID:", session.teacherSSID);
    console.log("SESSION BSSID:", session.teacherBSSID);
    console.log("SESSION ACTIVE:", session.isActive);
  }

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

  if (!session.teacherSSID) {
    const error = new Error(
      "Teacher hotspot is not configured for this session"
    );
    error.statusCode = HTTP_STATUS.BAD_REQUEST;
    throw error;
  }

  // Validate SSID only
  if (session.teacherSSID !== ssid) {
    return {
      success: false,
      message: "Teacher hotspot not detected",
    };
  }

  // Validate proximity using RSSI
  if (rssi < WIFI.MIN_RSSI) {
    return {
      success: false,
      message: "Move closer to teacher hotspot",
    };
  }

  // Fetch active QR code to bind to proximity token
  const activeQr = await prisma.sessionQRCode.findFirst({
    where: {
      sessionId: session.id,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!activeQr) {
    const error = new Error("No active QR code found for this session");
    error.statusCode = HTTP_STATUS.BAD_REQUEST;
    throw error;
  }

  const jti = crypto.randomUUID();
  const jwtSecret = process.env.JWT_SECRET || "replace-with-a-secure-jwt-secret";
  const proximityToken = jwt.sign(
    {
      studentId,
      sessionId: session.id,
      nonce: activeQr.nonce,
      jti,
    },
    jwtSecret,
    { expiresIn: "15s" }
  );

  return {
    success: true,
    message: "Nearby teacher WiFi detected",
    proximityToken,
  };
}

module.exports = {
  validateWifiProximity,
};