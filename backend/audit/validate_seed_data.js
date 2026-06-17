// backend/audit/validate_seed_data.js
// Verification of seed data prior to running the stress tests.
// Validates presence of teachers, students, course, session, and QR nonce in database.

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const auditRunId = process.env.AUDIT_RUN_ID;

async function validateSeed() {
  if (!auditRunId) {
    console.error('Validation failed: AUDIT_RUN_ID is not configured in process.env.');
    process.exit(1);
  }

  console.log(`Starting Database Seed Validation for Audit Run ID: ${auditRunId}...`);

  // Connect with retry logic to allow compute pod recovery
  let retries = 5;
  while (retries > 0) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      break;
    } catch (err) {
      retries--;
      if (retries === 0) {
        console.error('Failed to establish database connection after 5 attempts.');
        throw err;
      }
      console.log(`Database connection failed. Retrying in 3 seconds... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  const manifestPath = path.join(__dirname, 'reports', `audit_seed_manifest_${auditRunId}.json`);
  if (!fs.existsSync(manifestPath)) {
    console.error(`Validation failed: Seed manifest file not found at: ${manifestPath}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  try {
    // 1. Verify Teachers
    const dbTeachers = await prisma.user.findMany({
      where: {
        role: 'teacher',
        email: { contains: auditRunId.toLowerCase() }
      }
    });
    console.log(`- Teachers in Database: ${dbTeachers.length} (Expected: 2)`);
    if (dbTeachers.length !== 2) {
      throw new Error(`Teacher count mismatch. Found ${dbTeachers.length}, expected 2.`);
    }

    // 2. Verify Students
    const dbStudents = await prisma.user.findMany({
      where: {
        role: 'student',
        email: { contains: auditRunId.toLowerCase() }
      }
    });
    console.log(`- Students in Database: ${dbStudents.length} (Expected: 100)`);
    if (dbStudents.length !== 100) {
      throw new Error(`Student count mismatch. Found ${dbStudents.length}, expected 100.`);
    }

    // 3. Verify Course
    const courseName = `LOADTEST_${auditRunId}_COURSE_1`;
    const dbCourse = await prisma.course.findFirst({
      where: { name: courseName }
    });
    if (!dbCourse) {
      throw new Error(`Seeded course "${courseName}" not found in database.`);
    }
    console.log(`- Course in Database: "${dbCourse.name}" (Found)`);

    // 4. Verify Active Session
    const sessionCode = manifest.sessions[0].sessionCode;
    const dbSession = await prisma.attendanceSession.findUnique({
      where: { sessionCode }
    });
    if (!dbSession || !dbSession.isActive) {
      throw new Error(`Active session code "${sessionCode}" not found or inactive in database.`);
    }
    console.log(`- Active Session in Database: "${dbSession.sessionCode}" (Status: Active)`);

    // 5. Verify SessionQRCode
    const dbQrCode = await prisma.sessionQRCode.findFirst({
      where: {
        nonce: manifest.qrNonce,
        sessionId: dbSession.id
      }
    });
    if (!dbQrCode || dbQrCode.expiresAt < new Date()) {
      throw new Error(`Active SessionQRCode with nonce "${manifest.qrNonce}" not found or expired.`);
    }
    console.log(`- SessionQRCode in Database: "${dbQrCode.nonce}" (Status: Valid)`);

    console.log('\nSeed Validation SUCCESS: All database records verified and ready.');
    process.exit(0);

  } catch (error) {
    console.error('\nSeed Validation FAILED:', error.message);
    process.exit(1);
  }
}

validateSeed()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
