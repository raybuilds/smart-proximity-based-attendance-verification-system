const { prisma } = require("../config/database");
const authService = require("../modules/auth/auth.service");

async function run() {
  console.log("=== CHECKING SEEDED USERS IN DATABASE ===");

  const users = await prisma.user.findMany({
    include: {
      teacher: true,
      student: true
    }
  });

  console.log(`Total users in DB: ${users.length}`);
  for (const u of users) {
    console.log(`- Email: ${u.email} | Role: ${u.role} | Name: ${u.name} | isActive: ${u.isActive} | hasTeacherProfile: ${!!u.teacher} | hasStudentProfile: ${!!u.student}`);
  }

  const teacherEmail = "teacher@attendance.local";
  const teacher = users.find(u => u.email === teacherEmail);
  if (teacher) {
    console.log(`\nTeacher ${teacherEmail} exists.`);
    console.log(`- Password Hash: ${teacher.passwordHash}`);
    console.log(`- isActive: ${teacher.isActive}`);
    try {
      const loginRes = await authService.loginUser({
        email: teacherEmail,
        password: "Password@123"
      });
      console.log(`- loginUser() status: SUCCESS. Token generated.`);
    } catch (err) {
      console.log(`- loginUser() status: FAILED (${err.message})`);
    }
  } else {
    console.log(`\nTeacher ${teacherEmail} DOES NOT exist.`);
  }

  const adminEmail = "admin@attendance.local";
  const admin = users.find(u => u.email === adminEmail);
  if (admin) {
    console.log(`\nAdmin ${adminEmail} exists.`);
    try {
      const loginRes = await authService.loginUser({
        email: adminEmail,
        password: "Password@123"
      });
      console.log(`- Admin loginUser() status: SUCCESS.`);
    } catch (err) {
      console.log(`- Admin loginUser() status: FAILED (${err.message})`);
    }
  }

  await prisma.$disconnect();
}

run();
