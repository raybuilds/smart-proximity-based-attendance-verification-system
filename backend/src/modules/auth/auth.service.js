const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { prisma } = require("../../config/database");
const config = require("../../config");

function buildSafeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    needsPasswordChange: user.needsPasswordChange,
    student: user.student,
    teacher: user.teacher,
  };
}

async function generateUniqueEmployeeId() {
  let isUnique = false;
  let employeeId = "";

  while (!isUnique) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
    employeeId = `EMP${randomDigits}`;

    const existing = await prisma.teacher.findUnique({
      where: { employeeId },
    });

    if (!existing) {
      isUnique = true;
    }
  }

  return employeeId;
}

async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      student: true,
      teacher: true,
    },
  });

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  if (user.isActive === false) {
    const error = new Error("Account has been deactivated by administrator");
    error.statusCode = 403;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwtSecret,
    {
      expiresIn: "7d",
    }
  );

  return {
    token,
    user: buildSafeUser(user),
  };
}

async function registerUser({
  name,
  email,
  password,
  role,
  rollNumber,
  department,
  year,
  section,
}) {
  console.log("REGISTER SERVICE INCOMING:", { name, email, role, rollNumber, department, year, section });

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.error("REGISTER SERVICE ERROR: Email already registered:", email);
    const error = new Error("Email is already registered");
    error.statusCode = 400;
    throw error;
  }

  if (role === "admin") {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "admin" },
    });
    if (existingAdmin) {
      console.error("REGISTER SERVICE ERROR: Administrator account already exists.");
      const error = new Error("Administrator account already exists.");
      error.statusCode = 400;
      throw error;
    }
  }

  if (role === "student") {
    const existingStudent = await prisma.student.findUnique({
      where: { rollNumber },
    });

    if (existingStudent) {
      console.error("REGISTER SERVICE ERROR: Roll number already registered:", rollNumber);
      const error = new Error("Roll number is already registered");
      error.statusCode = 400;
      throw error;
    }
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  let employeeId = null;
  if (role === "teacher") {
    try {
      employeeId = await generateUniqueEmployeeId();
      console.log("REGISTER SERVICE: Generated teacher employeeId:", employeeId);
    } catch (err) {
      console.error("REGISTER SERVICE ERROR: Employee ID generation failed:", err);
      throw err;
    }
  }

  try {
    const newUser = await prisma.$transaction(async (tx) => {
      try {
        const userCreated = await tx.user.create({
          data: {
            name,
            email,
            passwordHash,
            role,
            ...(role === "student" && {
              student: {
                create: {
                  rollNumber,
                  department,
                  year,
                  section,
                },
              },
            }),
            ...(role === "teacher" && {
              teacher: {
                create: {
                  employeeId,
                  department,
                },
              },
            }),
          },
          include: {
            student: true,
            teacher: true,
          },
        });

        if (role === "student" && userCreated.student) {
          const { backfillStudentAttendance } = require("../attendance/backfill.service");
          await backfillStudentAttendance(tx, userCreated.student);
        }

        return userCreated;
      } catch (prismaErr) {
        console.error("REGISTER TRANSACTION PRISMA INNER ERROR:", prismaErr);
        throw prismaErr;
      }
    });

    console.log("REGISTER SERVICE: Transaction completed successfully for user:", newUser.id);

    const token = jwt.sign(
      {
        sub: newUser.id,
        email: newUser.email,
        role: newUser.role,
      },
      config.jwtSecret,
      {
        expiresIn: "7d",
      }
    );

    return {
      token,
      user: buildSafeUser(newUser),
    };
  } catch (error) {
    console.error("REGISTER SERVICE TRANSACTION ERROR:", error);
    if (error.code === "P2002") {
      const target = error.meta?.target || [];
      console.error("PRISMA UNIQUE CONSTRAINT VIOLATION DETECTED on fields:", target);
      let errMsg = "Unique constraint violation.";
      if (target.includes("email")) {
        errMsg = "Email is already registered";
      } else if (target.includes("rollNumber")) {
        errMsg = "Roll number is already registered";
      } else if (target.includes("employeeId")) {
        errMsg = "Employee ID is already registered";
      }
      const dbErr = new Error(errMsg);
      dbErr.statusCode = 400;
      throw dbErr;
    }
    throw error;
  }
}

async function getUserProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: true,
      teacher: true,
    },
  });
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  return buildSafeUser(user);
}

async function updateTeacherHotspot(userId, { registeredSSID, registeredBSSID }) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
  });

  if (!teacher) {
    const error = new Error("Teacher profile not found");
    error.statusCode = 404;
    throw error;
  }

  const updatedTeacher = await prisma.teacher.update({
    where: { userId },
    data: {
      registeredSSID: registeredSSID !== undefined ? registeredSSID : undefined,
      registeredBSSID: registeredBSSID !== undefined ? registeredBSSID : undefined,
    },
  });

  return updatedTeacher;
}

async function changePassword(userId, { oldPassword, newPassword }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error("Invalid current password");
    error.statusCode = 400;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      needsPasswordChange: false,
    },
  });

  return buildSafeUser(updatedUser);
}

module.exports = {
  loginUser,
  registerUser,
  getUserProfile,
  updateTeacherHotspot,
  changePassword,
};
