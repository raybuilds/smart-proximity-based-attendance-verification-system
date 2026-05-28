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

module.exports = {
  loginUser,
};
