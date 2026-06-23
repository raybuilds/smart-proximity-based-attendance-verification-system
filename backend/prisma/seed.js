const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "rohityadav7122004@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Password@123";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "System Admin",
      passwordHash,
      role: "admin",
    },
    create: {
      name: "System Admin",
      email: adminEmail,
      passwordHash,
      role: "admin",
    },
  });

  await prisma.user.upsert({
    where: { email: "teacher@attendance.local" },
    update: {
      name: "Teacher One",
      passwordHash,
      role: "teacher",
      teacher: {
        upsert: {
          update: {
            employeeId: "EMP001",
            department: "Computer Science",
          },
          create: {
            employeeId: "EMP001",
            department: "Computer Science",
          },
        },
      },
    },
    create: {
      name: "Teacher One",
      email: "teacher@attendance.local",
      passwordHash,
      role: "teacher",
      teacher: {
        create: {
          employeeId: "EMP001",
          department: "Computer Science",
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: "student@attendance.local" },
    update: {
      name: "Student One",
      passwordHash,
      role: "student",
      student: {
        upsert: {
          update: {
            rollNumber: "CSE2026001",
            department: "Computer Science",
            year: 6,
            section: "A",
          },
          create: {
            rollNumber: "CSE2026001",
            department: "Computer Science",
            year: 6,
            section: "A",
          },
        },
      },
    },
    create: {
      name: "Student One",
      email: "student@attendance.local",
      passwordHash,
      role: "student",
      student: {
        create: {
          rollNumber: "CSE2026001",
          department: "Computer Science",
          year: 6,
          section: "A",
        },
      },
    },
  });
}

main()
  .then(async () => {
    console.log("Seed data inserted successfully");
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed", error);
    await prisma.$disconnect();
    process.exit(1);
  });
