const healthService = require("./health.service");

async function getHealthStatus(req, res, next) {
  try {
    const database = await healthService.getDatabaseHealth();
    const isConnected = database === "connected";

    res.status(isConnected ? 200 : 503).json({
      success: isConnected,
      status: isConnected ? "OK" : "SERVICE_UNAVAILABLE",
      database,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getHealthStatus,
};
