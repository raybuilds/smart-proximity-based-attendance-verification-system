const express = require("express");

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

router.use("/health", healthRoutes);

module.exports = router;
