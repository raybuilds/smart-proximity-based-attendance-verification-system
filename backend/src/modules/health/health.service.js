const { prisma } = require("../../config/database");

async function getDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return "connected";
  } catch (error) {
    return "disconnected";
  }
}

module.exports = {
  getDatabaseHealth,
};
