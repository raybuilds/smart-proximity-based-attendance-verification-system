const healthService = require("./health.service");

async function getHealthStatus(req, res, next) {
  try {
    const database = await healthService.getDatabaseHealth();
    const isConnected = database === "connected";
    const memoryUsage = process.memoryUsage();

    res.status(isConnected ? 200 : 500).json({
      success: isConnected,
      pid: process.pid,
      uptime: Math.floor(process.uptime()),
      database,
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

async function getReadinessStatus(req, res, next) {
  try {
    const database = await healthService.getDatabaseHealth();
    const isConnected = database === "connected";

    if (!isConnected) {
      return res.status(503).json({
        ready: false,
      });
    }

    res.status(200).json({
      ready: true,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getHealthStatus,
  getReadinessStatus,
};
