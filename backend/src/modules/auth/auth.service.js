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
  semester,
  section,
}) {
  console.log("REGISTER SERVICE INCOMING:", { name, email, role, rollNumber, department, semester, section });

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.error("REGISTER SERVICE ERROR: Email already registered:", email);
    const error = new Error("Email is already registered");
    error.statusCode = 400;
    throw error;
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
        return await tx.user.create({
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
                  semester,
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

module.exports = {
  loginUser,
  registerUser,
};
