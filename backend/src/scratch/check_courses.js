const { prisma } = require("../config/database");

async function check() {
  const courses = await prisma.course.findMany();
  console.log("=== All Courses in DB ===");
  console.log(JSON.stringify(courses, null, 2));
  
  await prisma.$disconnect();
}

check();
