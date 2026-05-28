const express = require("express");

const { authenticate } = require("../middleware/auth.middleware");
const authRoutes = require("../modules/auth/auth.routes");
const healthRoutes = require("../modules/health/health.routes");

const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Attendance System API Running",
  });
});

router.get("/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Mobile connection successful",
  });
});

router.get("/protected", authenticate, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Protected route accessed successfully",
    user: req.user,
  });
});

router.use("/auth", authRoutes);
router.use("/health", healthRoutes);

module.exports = router;
