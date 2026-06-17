const { PrismaClient } = require("@prisma/client");

const connectionString = "postgresql://neondb_owner:npg_EXGRzWDFK01k@ep-misty-base-aqo6i25n-pooler.c-8.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
process.env.DATABASE_URL = connectionString;

async function testConnection() {
  console.log("=== Testing Connection to Neon Database with Prisma (Pooled) ===");
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log("Connected successfully!");
    const res = await prisma.$queryRaw`SELECT NOW()`;
    console.log("Current Time from DB:", res);
  } catch (err) {
    console.error("Connection failed:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
