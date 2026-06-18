const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const morgan = require("morgan");

dotenv.config();

const appConfig = require("./config");
const apiRoutes = require("./routes");
const { connectDatabase, disconnectDatabase, prisma } = require("./config/database");
const { APP } = require("./utils/constants");
const logger = require("./utils/logger");
const {
  notFoundMiddleware,
  errorMiddleware,
} = require("./middleware/error.middleware");

const app = express();
let server;

// Record start time for uptime diagnostics
const startTime = Date.now();

app.use(helmet());
app.use(cors());
app.use(morgan(appConfig.isDevelopment ? "dev" : "combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Baseline connection test route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Attendance System API Running",
  });
});

// GET /health monitoring route
app.get("/health", (req, res) => {
  res.redirect("/api/health");
});

app.get("/ready", (req, res) => {
  res.redirect("/api/health/ready");
});

app.use(APP.API_PREFIX, apiRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

const activeConnections = new Set();

async function startServer() {
  logger.info(`Starting process (PID: ${process.pid})`);
  logger.info("Loading environment variables");
  await connectDatabase();
  logger.success("Prisma client initialized");

  server = app.listen(appConfig.port, () => {
    console.log("\n[BOOT]");
    console.log(`PID: ${process.pid}`);
    console.log(`PORT: ${appConfig.port}`);
    console.log(`ENV: ${appConfig.nodeEnv}`);
    console.log("DATABASE: connected\n");
  });

  server.on("connection", (socket) => {
    activeConnections.add(socket);
    socket.on("close", () => {
      activeConnections.delete(socket);
    });
  });
}

async function shutdown(signal) {
  logger.info(`Shutdown signal [${signal}] received at ${new Date().toISOString()} (PID: ${process.pid})`);

  if (server) {
    logger.info(`Destroying ${activeConnections.size} active keep-alive socket connections...`);
    for (const socket of activeConnections) {
      socket.destroy();
    }
    activeConnections.clear();

    logger.info("Stopping HTTP server from accepting new requests...");
    server.close(async () => {
      logger.info("HTTP server closed cleanly.");
      await disconnectDatabase();
      logger.info("Shutdown sequence complete.");
      process.exit(0);
    });
    return;
  }

  await disconnectDatabase();
  logger.info("Shutdown sequence complete.");
  process.exit(0);
}

// Graceful termination listeners
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Global unhandled crash protection
process.on("uncaughtException", async (error) => {
  logger.error(`UNCAUGHT EXCEPTION detected at ${new Date().toISOString()} (PID: ${process.pid})`);
  console.error(error.stack || error);
  
  // Attempt to cleanup database connection before exiting
  try {
    await disconnectDatabase();
  } catch (e) {
    logger.error("Failed to disconnect database during uncaughtException cleanup", e.message);
  }
  process.exit(1);
});

process.on("unhandledRejection", async (reason, promise) => {
  logger.error(`UNHANDLED PROMISE REJECTION detected at ${new Date().toISOString()} (PID: ${process.pid})`);
  console.error("Reason:", reason);
  
  try {
    await disconnectDatabase();
  } catch (e) {
    logger.error("Failed to disconnect database during unhandledRejection cleanup", e.message);
  }
  process.exit(1);
});

startServer().catch(async (error) => {
  logger.error("Server startup failed", error.message);
  await disconnectDatabase();
  process.exit(1);
});
