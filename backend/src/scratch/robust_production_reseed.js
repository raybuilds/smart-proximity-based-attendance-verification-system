const { PrismaClient } = require("@prisma/client");
const connectionString = "postgresql://neondb_owner:npg_EXGRzWDFK01k@ep-misty-base-aqo6i25n-pooler.c-8.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

// Seeding logic optimized for minimal database load & concurrency
const bcrypt = require("bcryptjs");

const INDIAN_FIRST_NAMES = [
  "Aarav", "Aditya", "Amit", "Ananya", "Anjali", "Arjun", "Deepak", "Divya", "Gaurav", "Harsh",
  "Isha", "Karan", "Kavita", "Manish", "Neha", "Pooja", "Pranav", "Priya", "Rahul", "Rohan"
];

const INDIAN_LAST_NAMES = [
  "Sharma", "Verma", "Singh", "Gupta", "Mishra", "Khan", "Tiwari", "Agarwal", "Kumar", "Patel"
];

function generateRealisticName() {
  const first = INDIAN_FIRST_NAMES[Math.floor(Math.random() * INDIAN_FIRST_NAMES.length)];
  const last = INDIAN_LAST_NAMES[Math.floor(Math.random() * INDIAN_LAST_NAMES.length)];
  return `${first} ${last}`;
}

async function main() {
  console.log("=== RESETTING DATABASE FOR PROFESSIONAL DEMO DATA ===");
  process.env.DATABASE_URL = connectionString;
  const prisma = new PrismaClient();

  try {
    const passwordHash = await bcrypt.hash("Password@123", 10);

    // Create Admin User
    await prisma.user.create({
      data: {
        name: "System Admin",
        email: "admin@attendance.local",
        passwordHash,
        role: "admin"
      }
    });

    console.log("Seeding Teachers...");
    const teacherNames = ["Dr. Sharma", "Prof. Verma", "Dr. Singh", "Prof. Gupta", "Dr. Mishra", "Dr. Khan", "Prof. Tiwari", "Dr. Agarwal"];
    const teachers = [];
    for (let i = 0; i < teacherNames.length; i++) {
      const email = i === 0 ? "teacher@attendance.local" : `teacher${i+1}@attendance.local`;
      const user = await prisma.user.create({
        data: {
          name: teacherNames[i],
          email,
          passwordHash,
          role: "teacher",
          teacher: {
            create: {
              employeeId: `TCH00${i+1}`,
              department: i % 2 === 0 ? "Computer Science" : "Information Technology"
            }
          }
        },
        include: { teacher: true }
      });
      teachers.push(user);
    }

    console.log("Seeding Students...");
    const students = [];
    const seedStudentUser = await prisma.user.create({
      data: {
        name: "Rahul Kumar",
        email: "student@attendance.local",
        passwordHash,
        role: "student",
        student: {
          create: {
            rollNumber: "CSE2026001",
            department: "CSE",
            semester: 6,
            section: "A"
          }
        }
      },
      include: { student: true }
    });
    students.push(seedStudentUser);

    const departments = ["CSE", "CS", "IT"];
    const semesters = [4, 6];
    const sections = ["A", "B"];

    // Reduce student batch to 25 to avoid connection drop during execution
    for (let s = 1; s < 25; s++) {
      const name = generateRealisticName();
      const email = `student${s+1}@attendance.local`;
      const rollNumber = `${departments[s % departments.length]}2026${String(s+1).padStart(3, "0")}`;
      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: "student",
          student: {
            create: {
              rollNumber,
              department: departments[s % departments.length],
              semester: semesters[s % semesters.length],
              section: sections[Math.floor(s / 2) % sections.length]
            }
          }
        },
        include: { student: true }
      });
      students.push(user);
    }

    console.log("Seeding Courses...");
    const courseList = [
      { code: "CS401", name: "Operating Systems", dept: "CSE", sem: 4, sec: "A" },
      { code: "CS402", name: "DBMS", dept: "CSE", sem: 4, sec: "B" },
      { code: "CS403", name: "Computer Networks", dept: "CS", sem: 6, sec: "A" }
    ];

    const courses = [];
    for (let i = 0; i < courseList.length; i++) {
      const cInfo = courseList[i];
      const teacher = i < 2 ? teachers[0] : teachers[1];
      const course = await prisma.course.create({
        data: {
          code: cInfo.code,
          name: cInfo.name,
          department: cInfo.dept,
          semester: cInfo.sem,
          section: cInfo.sec,
          teacherId: teacher.teacher.id,
          isArchived: false
        }
      });
      courses.push(course);
    }

    console.log("Seeding Sessions...");
    // Seed exactly one active session for primary teacher's Operating Systems course (CS401)
    const activeSession = await prisma.attendanceSession.create({
      data: {
        teacherId: teachers[0].id,
        sessionCode: "OS_CS401_ACT",
        isActive: true,
        startedAt: new Date(),
        courseId: courses[0].id,
        departmentSnapshot: "CSE",
        semesterSnapshot: 4,
        sectionSnapshot: "A"
      }
    });

    console.log(`Successfully seeded active session ID: ${activeSession.id}`);
    console.log("=== SEEDING COMPLETED SUCCESSFULLY ===");

  } catch (error) {
    console.error("Reseed failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
