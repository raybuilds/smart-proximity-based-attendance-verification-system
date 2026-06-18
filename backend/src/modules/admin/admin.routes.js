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

router.get("/courses/archived", adminController.getArchivedCourses);
router.get("/courses/archived/:id", adminController.getArchivedCourseDetail);
router.get("/courses", adminController.getAdminCourses);
router.get("/courses/:id", adminController.getAdminCourseDetail);
router.patch("/courses/:id/archive", adminController.archiveCourse);
router.patch("/courses/:id/restore", adminController.restoreCourse);
router.get("/corrections", adminController.getAdminManualCorrections);
router.get("/live-sessions", adminController.getAdminLiveSessions);
router.get("/at-risk", adminController.getAdminAtRisk);
router.get("/analytics", adminController.getAdminAnalytics);

module.exports = router;

