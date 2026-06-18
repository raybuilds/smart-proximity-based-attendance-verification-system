const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const INDIAN_FIRST_NAMES = [
  "Aarav", "Aditya", "Amit", "Ananya", "Anjali", "Arjun", "Deepak", "Divya", "Gaurav", "Harsh",
  "Isha", "Karan", "Kavita", "Manish", "Neha", "Pooja", "Pranav", "Priya", "Rahul", "Rohan",
  "Sanjay", "Shalini", "Sneha", "Sunita", "Tarun", "Varun", "Vijay", "Vikram", "Yash", "Riya",
  "Aakash", "Abhishek", "Alok", "Anil", "Arvind", "Dinesh", "Kunal", "Manoj", "Nikhil", "Pankaj",
  "Rajesh", "Sandeep", "Siddharth", "Vivek", "Aarti", "Jyoti", "Kiran", "Meera", "Nisha", "Preeti",
  "Rajni", "Rekha", "Ritu", "Seema", "Swati", "Abhay", "Anupam", "Bhupendra", "Devendra", "Girish",
  "Himanshu", "Jitendra", "Lokesh", "Mohit", "Naveen", "Piyush", "Rakesh", "Saurabh", "Umesh", "Yogesh"
];

const INDIAN_LAST_NAMES = [
  "Sharma", "Verma", "Singh", "Gupta", "Mishra", "Khan", "Tiwari", "Agarwal", "Kumar", "Patel",
  "Joshi", "Mehta", "Chawla", "Bansal", "Goel", "Rao", "Reddy", "Nair", "Pillai", "Das",
  "Sen", "Mukherjee", "Chatterjee", "Banerjee", "Bose", "Choudhury", "Roy", "Dutta", "Sarkar", "Garg"
];

function generateRealisticName() {
  const first = INDIAN_FIRST_NAMES[Math.floor(Math.random() * INDIAN_FIRST_NAMES.length)];
  const last = INDIAN_LAST_NAMES[Math.floor(Math.random() * INDIAN_LAST_NAMES.length)];
  return `${first} ${last}`;
}

async function main() {
  console.log("=== RESETTING DATABASE FOR PROFESSIONAL DEMO DATA ===");

  // Safe dependency deletion
  await prisma.attendanceCorrection.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.usedProximityToken.deleteMany();
  await prisma.sessionQRCode.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.course.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.user.deleteMany({
    where: {
      NOT: {
        email: "admin@attendance.local"
      }
    }
  });

  console.log("Database reset complete.");

  const passwordHash = await bcrypt.hash("Password@123", 10);

  // Preserve or create Admin User
  await prisma.user.upsert({
    where: { email: "admin@attendance.local" },
    update: { passwordHash },
    create: {
      name: "System Admin",
      email: "admin@attendance.local",
      passwordHash,
      role: "admin"
    }
  });

  console.log("Seeding Teachers...");

  const teacherNames = [
    "Dr. Sharma",
    "Prof. Verma",
    "Dr. Singh",
    "Prof. Gupta",
    "Dr. Mishra",
    "Dr. Khan",
    "Prof. Tiwari",
    "Dr. Agarwal"
  ];

  const teachers = [];
  for (let i = 0; i < teacherNames.length; i++) {
    const isFirst = i === 0;
    const email = isFirst ? "teacher@attendance.local" : `teacher${i+1}@attendance.local`;
    const employeeId = `TCH00${i+1}`;
    
    const user = await prisma.user.create({
      data: {
        name: teacherNames[i],
        email,
        passwordHash,
        role: "teacher",
        teacher: {
          create: {
            employeeId,
            department: i % 2 === 0 ? "Computer Science" : "Information Technology"
          }
        }
      },
      include: { teacher: true }
    });
    teachers.push(user);
  }

  console.log(`Successfully seeded ${teachers.length} teachers.`);

  console.log("Seeding Students...");
  const students = [];

  // Seed the mandatory verify student user
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

  for (let s = 1; s < 80; s++) {
    const name = generateRealisticName();
    const email = `student${s+1}@attendance.local`;
    const rollNumber = `${departments[s % departments.length]}2026${String(s+1).padStart(3, "0")}`;
    const department = departments[s % departments.length];
    const semester = semesters[s % semesters.length];
    const section = sections[Math.floor(s / 2) % sections.length];

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "student",
        student: {
          create: {
            rollNumber,
            department,
            semester,
            section
          }
        }
      },
      include: { student: true }
    });
    students.push(user);
  }

  console.log(`Successfully seeded ${students.length} students.`);

  console.log("Seeding Courses...");

  const courseList = [
    { code: "CS401", name: "Operating Systems", dept: "CSE", sem: 4, sec: "A" },
    { code: "CS402", name: "DBMS", dept: "CSE", sem: 4, sec: "B" },
    { code: "CS403", name: "Computer Networks", dept: "CS", sem: 6, sec: "A" },
    { code: "CS404", name: "Software Engineering", dept: "CS", sem: 6, sec: "B" },
    { code: "CS405", name: "Compiler Design", dept: "CSE", sem: 6, sec: "A" },
    { code: "IT401", name: "Cloud Computing", dept: "IT", sem: 6, sec: "A" },
    { code: "IT402", name: "Information Security", dept: "IT", sem: 6, sec: "B" },
    { code: "IT403", name: "Data Warehousing", dept: "IT", sem: 4, sec: "A" },
    { code: "MTH401", name: "Discrete Mathematics", dept: "CSE", sem: 4, sec: "B" },
    { code: "MTH402", name: "Probability & Statistics", dept: "CS", sem: 4, sec: "A" },
    { code: "CS406", name: "Artificial Intelligence", dept: "CSE", sem: 6, sec: "B" },
    { code: "CS407", name: "Machine Learning", dept: "CS", sem: 6, sec: "A" },
    { code: "CS408", name: "Object Oriented Design", dept: "CSE", sem: 4, sec: "A" },
    { code: "CS409", name: "Computer Graphics", dept: "CS", sem: 4, sec: "B" },
    { code: "IT404", name: "Mobile Development", dept: "IT", sem: 4, sec: "B" }
  ];

  const courses = [];
  for (let i = 0; i < courseList.length; i++) {
    const cInfo = courseList[i];
    // Deterministically assign the first 4 active courses to primary demo teacher (teachers[0])
    // The rest are distributed across other teachers (teachers[1] to teachers[7])
    const teacher = i < 4 ? teachers[0] : teachers[1 + ((i - 4) % (teachers.length - 1))];
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

  // Generate 3 Archived Courses
  const archivedCourseData = [
    { code: "CS301", name: "Computer Organization", dept: "CSE", sem: 4, sec: "A" },
    { code: "CS302", name: "Data Structures", dept: "CS", sem: 4, sec: "B" },
    { code: "IT301", name: "Web Programming", dept: "IT", sem: 4, sec: "A" }
  ];

  const archivedCourses = [];
  for (let i = 0; i < archivedCourseData.length; i++) {
    const cInfo = archivedCourseData[i];
    // Exclude primary teacher from archived courses to keep active courses clean
    const teacher = teachers[1 + (i % (teachers.length - 1))];
    const course = await prisma.course.create({
      data: {
        code: cInfo.code,
        name: cInfo.name,
        department: cInfo.dept,
        semester: cInfo.sem,
        section: cInfo.sec,
        teacherId: teacher.teacher.id,
        isArchived: true,
        archivedAt: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) // 6 months ago
      }
    });
    archivedCourses.push(course);
  }

  console.log(`Successfully seeded ${courses.length} active and ${archivedCourses.length} archived courses.`);

  console.log("Seeding Sessions & Attendance Records...");

  let totalSessionsSeeded = 0;
  const allCorrections = [];

  // Define student attendance profile buckets
  const excellentStudents = students.slice(0, 20); // 90%-100%
  const averageStudents = students.slice(20, 70);  // 75%-89%
  const atRiskStudents = students.slice(70, 80);   // 40%-74%

  // Ensure seedStudentUser is at risk in Discrete Math (MTH401 / code CSE)
  // seedStudentUser (Rahul Kumar) is at index 0. We will override his attendance specifically.

  const activeCoursesCombined = [...courses, ...archivedCourses];

  for (const course of activeCoursesCombined) {
    let numSessions = 10;
    if (course.isArchived) {
      numSessions = 12;
    } else {
      // Deterministically set session count to ensure the primary teacher has exactly 32 completed sessions
      if (course.code === "CS401") numSessions = 8;
      else if (course.code === "CS402") numSessions = 8;
      else if (course.code === "CS403") numSessions = 8;
      else if (course.code === "CS404") numSessions = 8;
      else numSessions = 10;
    }

    const eligibleStudents = students.filter(
      st =>
        st.student.department.toLowerCase() === course.department.toLowerCase() &&
        st.student.semester === course.semester &&
        st.student.section.toLowerCase() === course.section.toLowerCase()
    );

    if (eligibleStudents.length === 0) continue;

    const sessions = [];
    for (let s = 0; s < numSessions; s++) {
      const startedAt = new Date(
        Date.now() - (course.isArchived ? 180 : 30 - s) * 24 * 60 * 60 * 1000 + s * 60 * 60 * 1000
      );
      const endedAt = new Date(startedAt.getTime() + 60 * 60 * 1000);

      // Find teacher user ID for the course
      const courseTeacher = teachers.find(t => t.teacher.id === course.teacherId);

      const session = await prisma.attendanceSession.create({
        data: {
          sessionCode: `SESS_${course.code}_${s+1}_${Date.now()}`,
          courseId: course.id,
          teacherId: courseTeacher.id,
          isActive: false,
          startedAt,
          endedAt,
          departmentSnapshot: course.department,
          semesterSnapshot: course.semester,
          sectionSnapshot: course.section
        }
      });
      sessions.push(session);
      totalSessionsSeeded++;
    }

    // Now seed attendance records for each session based on student categories
    for (const student of eligibleStudents) {
      // Determine probability of presence
      let presenceProbability = 0.8;
      if (excellentStudents.some(es => es.id === student.id)) {
        presenceProbability = 0.95;
      } else if (atRiskStudents.some(as => as.id === student.id)) {
        presenceProbability = 0.55;
      }

      // Rahul Kumar specific override to ensure exactly 72% attendance in some course
      if (student.id === seedStudentUser.id && course.code === "CS405") {
        presenceProbability = 0.72;
      }

      for (let sIdx = 0; sIdx < sessions.length; sIdx++) {
        // Use deterministic hash-based presence check instead of Math.random()
        const seedValue = (student.id * 17 + sessions[sIdx].id * 31) % 100;
        const isPresent = seedValue < (presenceProbability * 100);
        
        if (isPresent) {
          await prisma.attendance.create({
            data: {
              studentId: student.id,
              sessionId: sessions[sIdx].id,
              status: "present",
              method: "QR",
              verificationMethod: "proximity",
              markedAt: sessions[sIdx].startedAt
            }
          });
        }
      }
    }
  }

  // Create exactly 1 active session on an active course
  const firstActiveCourse = courses[0];
  const activeCourseTeacher = teachers.find(t => t.teacher.id === firstActiveCourse.teacherId);
  const activeSession = await prisma.attendanceSession.create({
    data: {
      sessionCode: `LIVE_DEMO_${firstActiveCourse.code}_${Date.now()}`,
      courseId: firstActiveCourse.id,
      teacherId: activeCourseTeacher.id,
      isActive: true,
      startedAt: new Date(Date.now() - 8 * 60 * 1000), // started 8 mins ago
      departmentSnapshot: firstActiveCourse.department,
      semesterSnapshot: firstActiveCourse.semester,
      sectionSnapshot: firstActiveCourse.section
    }
  });
  console.log(`Created exactly 1 active session: ID ${activeSession.id}`);

  console.log("Generating 30 Manual Corrections...");
  const correctionReasons = ["Phone Issue", "Network Issue", "QR Scan Failed", "Emergency", "Other"];
  
  // Pick some sessions and students to add manual corrections
  const sessionsList = await prisma.attendanceSession.findMany({
    where: { isActive: false }
  });

  let correctionsCount = 0;
  for (let c = 0; c < 30; c++) {
    const session = sessionsList[c % sessionsList.length];
    const course = await prisma.course.findUnique({ where: { id: session.courseId } });
    const eligibleStudents = students.filter(
      st =>
        st.student.department.toLowerCase() === course.department.toLowerCase() &&
        st.student.semester === course.semester &&
        st.student.section.toLowerCase() === course.section.toLowerCase()
    );

    if (eligibleStudents.length === 0) continue;

    const student = eligibleStudents[c % eligibleStudents.length];
    // Assign exactly 7 corrections to the primary demo teacher (teachers[0])
    // The other 23 are mapped across other teachers
    const teacher = c < 7 ? teachers[0] : teachers[1 + ((c - 7) % (teachers.length - 1))];
    const reason = correctionReasons[c % correctionReasons.length];

    // Ensure attendance record exists (upsert)
    const attRecord = await prisma.attendance.upsert({
      where: {
        studentId_sessionId: {
          studentId: student.id,
          sessionId: session.id
        }
      },
      update: {
        method: "MANUAL",
        verificationMethod: "manual_input",
        correctionReason: reason,
        modifiedByTeacherId: teacher.id,
        modifiedAt: new Date(session.startedAt.getTime() + 15 * 60 * 1000)
      },
      create: {
        studentId: student.id,
        sessionId: session.id,
        status: "present",
        method: "MANUAL",
        verificationMethod: "manual_input",
        correctionReason: reason,
        modifiedByTeacherId: teacher.id,
        markedAt: session.startedAt,
        modifiedAt: new Date(session.startedAt.getTime() + 15 * 60 * 1000)
      }
    });

    // Seed correction log record
    await prisma.attendanceCorrection.create({
      data: {
        attendanceId: attRecord.id,
        sessionId: session.id,
        studentId: student.id,
        previousMethod: "QR",
        newMethod: "MANUAL",
        correctionReason: reason,
        modifiedByTeacherId: teacher.id
      }
    });

    correctionsCount++;
  }

  console.log(`Seeded ${correctionsCount} manual corrections.`);
  console.log("=== SEEDING COMPLETED SUCCESSFULLY ===");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
