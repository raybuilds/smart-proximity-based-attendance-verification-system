const express = require("express");

const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { ROLES } = require("../../utils/constants");
const studentAttendanceController = require("./studentAttendance.controller");

const router = express.Router();

router.use(authenticate, requireRole(ROLES.STUDENT));

router.post("/scan", studentAttendanceController.scanAttendance);

module.exports = router;
