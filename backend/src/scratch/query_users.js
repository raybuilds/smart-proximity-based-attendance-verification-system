const { prisma } = require("../config/database");

async function queryUsers() {
  try {
    const users = await prisma.user.findMany({
      include: {
        student: true,
        teacher: true
      }
    });
    console.log("=== Users in Database ===");
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("Database query failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

queryUsers();
