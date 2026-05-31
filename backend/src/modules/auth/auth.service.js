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
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    const error = new Error("Email is already registered");
    error.statusCode = 400;
    throw error;
  }

  if (role === "student") {
    const existingStudent = await prisma.student.findUnique({
      where: { rollNumber },
    });

    if (existingStudent) {
      const error = new Error("Roll number is already registered");
      error.statusCode = 400;
      throw error;
    }
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  let employeeId = null;
  if (role === "teacher") {
    employeeId = await generateUniqueEmployeeId();
  }

  const newUser = await prisma.$transaction(async (tx) => {
    return tx.user.create({
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
  });

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
}

module.exports = {
  loginUser,
  registerUser,
};
