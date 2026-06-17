const fs = require("fs");
const path = require("path");

function logExport(teacherId, courseId, exportType) {
  try {
    const logDir = path.join(__dirname, "../logs");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFilePath = path.join(logDir, "export-audit.log");
    const entry = {
      teacherId: Number(teacherId),
      courseId: Number(courseId),
      exportType,
      timestamp: new Date().toISOString(),
    };
    fs.appendFileSync(logFilePath, JSON.stringify(entry) + "\n", "utf8");
  } catch (error) {
    console.error("[ERROR] Failed to log export audit entry:", error.message);
  }
}

module.exports = { logExport };
