// backend/audit/seed_audit_data.js
// Seeding script for stress audit run.
// Seeds 2 teachers, 1 course, 1 active session, 1 active SessionQRCode, and 100 students.
// Generates JWTs (User Auth Tokens & Proximity Tokens) for all users and saves them in the seed manifest.

const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const auditRunId = process.env.AUDIT_RUN_ID || 'LOADTEST_DRYRUN';
const jwtSecret = process.env.JWT_SECRET || 'replace-with-a-secure-jwt-secret';

async function seedData() {
  console.log(`Seeding database for Audit Run ID: ${auditRunId}...`);

  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Pre-hashed password for speed
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('LoadTestPass123!', salt);

  const manifest = {
    auditRunId,
    timestamp: new Date().toISOString(),
    qrNonce: `NONCE_${auditRunId}`,
    teachers: [],
    students: [],
    courses: [],
    sessions: []
  };

  try {
    // 1. Seed 2 Teachers
    for (let i = 1; i <= 2; i++) {
      const email = `loadtest_${auditRunId.toLowerCase()}_teacher_0${i}@attendance.local`;
      const name = `Teacher ${i} ${auditRunId}`;
      const employeeId = `EMP_AUDIT_${auditRunId}_${i}`;

      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: 'teacher',
          teacher: {
            create: {
              employeeId,
              department: 'CS'
            }
          }
        },
        include: { teacher: true }
      });

      const token = jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        jwtSecret,
        { expiresIn: '7d' }
      );

      manifest.teachers.push({
        id: user.id,
        teacherProfileId: user.teacher.id,
        email: user.email,
        token
      });
    }

    console.log(`Seeded 2 teachers successfully.`);

    // 2. Seed 1 Course (owned by teacher 1)
    const teacher1 = manifest.teachers[0];
    const course = await prisma.course.create({
      data: {
        name: `LOADTEST_${auditRunId}_COURSE_1`,
        teacherId: teacher1.teacherProfileId,
        department: 'CS',
        year: 6,
        section: 'A'
      }
    });

    manifest.courses.push({
      id: course.id,
      name: course.name
    });

    console.log(`Seeded course successfully.`);

    // 3. Seed 1 Active Session (associated with teacher 1 and course 1)
    const sessionCode = `SESS_${auditRunId.substring(9, 17)}_${auditRunId.substring(18)}`;
    const session = await prisma.attendanceSession.create({
      data: {
        teacherId: teacher1.id,
        courseId: course.id,
        sessionCode,
        isActive: true,
        departmentSnapshot: 'CS',
        yearSnapshot: 6,
        sectionSnapshot: 'A',
        teacherSSID: 'LOADTEST_WIFI',
        teacherBSSID: '00:11:22:33:44:55'
      }
    });

    manifest.sessions.push({
      id: session.id,
      sessionCode: session.sessionCode
    });

    console.log(`Seeded active attendance session successfully: ${sessionCode}`);

    // 4. Seed Active SessionQRCode (linked to session)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // Expires in 24 hours

    const sessionQrCode = await prisma.sessionQRCode.create({
      data: {
        sessionId: session.id,
        nonce: manifest.qrNonce,
        expiresAt
      }
    });

    console.log(`Seeded SessionQRCode successfully with nonce: ${manifest.qrNonce}`);

    // 5. Seed 100 Students (matching course department/year/section)
    for (let i = 1; i <= 100; i++) {
      const email = `loadtest_${auditRunId.toLowerCase()}_student_${String(i).padStart(3, '0')}@attendance.local`;
      const name = `Student ${i} ${auditRunId}`;
      const rollNumber = `ROLL_AUDIT_${auditRunId}_${String(i).padStart(3, '0')}`;

      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: 'student',
          student: {
            create: {
              rollNumber,
              department: 'CS',
              year: 6,
              section: 'A'
            }
          }
        },
        include: { student: true }
      });

      const token = jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        jwtSecret,
        { expiresIn: '7d' }
      );

      // Sign the proximity token bound to this student, session, and QR nonce
      const proximityToken = jwt.sign(
        {
          jti: `JTI_AUDIT_${auditRunId}_STUDENT_${i}`,
          studentId: user.id,
          sessionId: session.id,
          nonce: manifest.qrNonce
        },
        jwtSecret,
        { expiresIn: '1d' }
      );

      manifest.students.push({
        id: user.id,
        studentProfileId: user.student.id,
        email: user.email,
        token,
        proximityToken
      });
    }

    console.log(`Seeded 100 students and signed all proximity tokens successfully.`);

    // 6. Write Manifest Report
    const manifestPath = path.join(reportsDir, `audit_seed_manifest_${auditRunId}.json`);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`Audit seed manifest generated at: ${manifestPath}`);

  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  }
}

seedData()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
