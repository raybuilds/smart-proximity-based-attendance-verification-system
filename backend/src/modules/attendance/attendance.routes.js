const express = require("express");

const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { ROLES } = require("../../utils/constants");
const attendanceController = require("./attendance.controller");

const router = express.Router();

router.use(authenticate, requireRole(ROLES.TEACHER));

router.post("/session/start", attendanceController.startSession);
router.post("/session/end", attendanceController.endSession);
router.get("/session/active", attendanceController.getActiveSession);

module.exports = router;
