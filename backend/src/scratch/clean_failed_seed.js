const { PrismaClient } = require("@prisma/client");
const connectionString = "postgresql://neondb_owner:npg_EXGRzWDFK01k@ep-misty-base-aqo6i25n-pooler.c-8.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

async function main() {
  process.env.DATABASE_URL = connectionString;
  const prisma = new PrismaClient();
  try {
    console.log("Emptying incomplete seed records...");
    await prisma.attendanceCorrection.deleteMany({});
    await prisma.attendance.deleteMany({});
    await prisma.usedProximityToken.deleteMany({});
    await prisma.sessionQRCode.deleteMany({});
    await prisma.attendanceSession.deleteMany({});
    await prisma.course.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.teacher.deleteMany({});
    await prisma.user.deleteMany({});
    console.log("Cascade reset complete.");
  } catch (err) {
    console.error("Failed to clean:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
