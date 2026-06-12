const { PrismaClient } = require("@prisma/client");
const logger = require("../utils/logger");

const globalForPrisma = global;
const MAX_CONNECTION_RETRIES = 10;
const RETRY_DELAY_MS = 3000;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

async function connectDatabase() {
  // Startup diagnostics for DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  const urlExists = !!dbUrl && dbUrl.trim().length > 0;
  logger.info(`DATABASE_URL exists: ${urlExists}`);
  if (urlExists) {
    try {
      const parsed = new URL(dbUrl);
      const hostname = parsed.hostname;
      const pathname = parsed.pathname.replace(/^\//, "");
      logger.info(`DATABASE_URL hostname: ${hostname}`);
      logger.info(`DATABASE_URL database name: ${pathname}`);
    } catch (e) {
      logger.error('Failed to parse DATABASE_URL', e.message);
    }
  }
  for (let attempt = 1; attempt <= MAX_CONNECTION_RETRIES; attempt += 1) {
    try {
      logger.info(
        `Connecting to PostgreSQL with Prisma (attempt ${attempt}/${MAX_CONNECTION_RETRIES})`
      );
      await prisma.$connect();
      logger.success("Database connection established successfully");
      return prisma;
    } catch (error) {
      logger.error("Failed to connect to PostgreSQL via Prisma", error.message);

      if (attempt === MAX_CONNECTION_RETRIES) {
        logger.error(
          `Database unavailable after ${MAX_CONNECTION_RETRIES} retry attempts. Backend will exit.`
        );
        process.exit(1);
      }

      logger.info(`Retrying database connection in ${RETRY_DELAY_MS / 1000} seconds`);
      await new Promise((resolve) => {
        setTimeout(resolve, RETRY_DELAY_MS);
      });
    }
  }
}

async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    logger.success("Database connection closed gracefully");
  } catch (error) {
    logger.error("Failed to disconnect Prisma cleanly", error.message);
  }
}

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
};
