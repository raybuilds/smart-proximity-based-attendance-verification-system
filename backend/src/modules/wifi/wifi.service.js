const { prisma } = require("../../config/database");
const { HTTP_STATUS, WIFI } = require("../../utils/constants");

async function validateWifiProximity({ sessionCode, ssid, bssid, rssi }) {
  console.log("=================================");
  console.log("SESSION CODE:", sessionCode);
  console.log("SCANNED SSID:", ssid);
  console.log("SCANNED BSSID:", bssid);
  console.log("SCANNED RSSI:", rssi);

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

  return {
    success: true,
    message: "Nearby teacher WiFi detected",
  };
}

module.exports = {
  validateWifiProximity,
};