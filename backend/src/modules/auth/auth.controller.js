const { z } = require("zod");

const authService = require("./auth.service");

const loginSchema = z.object({
  email: z.string().trim().email("Valid email is required"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long"),
});

async function login(req, res, next) {
  try {
    const credentials = loginSchema.parse(req.body);
    const result = await authService.loginUser(credentials);

    res.status(200).json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      error.statusCode = 400;
      error.message = error.issues[0]?.message || "Invalid login payload";
    }

    next(error);
  }
}

module.exports = {
  login,
};
