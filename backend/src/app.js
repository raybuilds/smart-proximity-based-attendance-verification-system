const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const morgan = require("morgan");

dotenv.config();

const appConfig = require("./config");
const apiRoutes = require("./routes");
const { connectDatabase, disconnectDatabase } = require("./config/database");
const { APP } = require("./utils/constants");
const logger = require("./utils/logger");
const {
  notFoundMiddleware,
  errorMiddleware,
} = require("./middleware/error.middleware");

const app = express();
let server;

app.use(helmet());
app.use(cors());
app.use(morgan(appConfig.isDevelopment ? "dev" : "combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Attendance System API Running",
  });
});

app.use(APP.API_PREFIX, apiRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

async function startServer() {
  logger.info("Loading environment variables");
  await connectDatabase();
  logger.success("Prisma client initialized");

  server = app.listen(appConfig.port, () => {
    logger.success(`Backend server running at http://localhost:${appConfig.port}`);
    logger.info("Database status: connected");
  });
}

async function shutdown(signal) {
  logger.info(`${signal} received. Shutting down gracefully...`);

  if (server) {
    server.close(async () => {
      logger.info("HTTP server closed");
      await disconnectDatabase();
      process.exit(0);
    });
    return;
  }

  await disconnectDatabase();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer().catch(async (error) => {
  logger.error("Server startup failed", error.message);
  await disconnectDatabase();
  process.exit(1);
});
