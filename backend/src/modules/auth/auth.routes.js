const express = require("express");

const authController = require("./auth.controller");

const { authenticate } = require("../../middleware/auth.middleware");

const router = express.Router();

router.post("/login", authController.login);
router.post("/register", authController.register);
router.get("/profile", authenticate, authController.getProfile);
router.put("/teacher/hotspot", authenticate, authController.updateTeacherHotspot);

router.post("/change-password", authenticate, authController.changePassword);

module.exports = router;
