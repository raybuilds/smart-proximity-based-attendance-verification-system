const express = require("express");
const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { ROLES } = require("../../utils/constants");
const adminController = require("./admin.controller");

const router = express.Router();

// Apply authentication and admin role check to all routes
router.use(authenticate, requireRole(ROLES.ADMIN));

router.get("/dashboard", adminController.getAdminDashboard);
router.get("/recent-activity", adminController.getAdminRecentActivity);
router.get("/students", adminController.getAdminStudents);
router.get("/students/:id", adminController.getAdminStudentDetail);
router.get("/teachers", adminController.getAdminTeachers);
router.get("/teachers/:id", adminController.getAdminTeacherDetail);
router.patch("/users/:id/status", adminController.toggleUserStatus);

module.exports = router;
