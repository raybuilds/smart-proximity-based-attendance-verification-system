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

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters long"),
  email: z.string().trim().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  role: z.enum(["student", "teacher"], {
    errorMap: () => ({ message: "Role must be either student or teacher" }),
  }),
  rollNumber: z.string().optional(),
  department: z.string().trim().min(1, "Department is required"),
  semester: z.number().optional(),
  section: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.role === "student") {
    if (!data.rollNumber || data.rollNumber.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Roll number is required for students",
        path: ["rollNumber"],
      });
    }
    if (data.semester === undefined || data.semester === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Semester is required for students",
        path: ["semester"],
      });
    }
    if (!data.section || data.section.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Section is required for students",
        path: ["section"],
      });
    }
  }
});

async function register(req, res, next) {
  try {
    console.log("REGISTER INCOMING BODY:", req.body);
    const registrationData = registerSchema.parse(req.body);
    console.log("REGISTER PARSED ZOD DATA:", registrationData);
    const result = await authService.registerUser(registrationData);
    console.log("REGISTER SERVICE RESPONSE SUCCESS:", result.user.id);

    res.status(201).json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    console.error("REGISTER CONTROLLER ERROR:", error);
    if (error.name === "ZodError") {
      console.error("REGISTER ZOD VALIDATION FAILURE:", error.issues);
      error.statusCode = 400;
      error.message = error.issues[0]?.message || "Invalid registration payload";
    }

    next(error);
  }
}

async function getProfile(req, res, next) {
  try {
    const user = await authService.getUserProfile(req.user.sub);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
}

const hotspotSchema = z.object({
  registeredSSID: z.string().trim().min(1, "SSID is required"),
  registeredBSSID: z.string().trim().min(1, "BSSID is required"),
});

async function updateTeacherHotspot(req, res, next) {
  try {
    const data = hotspotSchema.parse(req.body);
    const teacher = await authService.updateTeacherHotspot(req.user.sub, data);
    res.status(200).json({
      success: true,
      teacher,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      error.statusCode = 400;
      error.message = error.issues[0]?.message || "Invalid validation payload";
    }
    next(error);
  }
}

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters long"),
});

async function changePassword(req, res, next) {
  try {
    const data = changePasswordSchema.parse(req.body);
    const user = await authService.changePassword(req.user.sub, data);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      error.statusCode = 400;
      error.message = error.issues[0]?.message || "Invalid validation payload";
    }
    next(error);
  }
}

module.exports = {
  login,
  register,
  getProfile,
  updateTeacherHotspot,
  changePassword,
};
