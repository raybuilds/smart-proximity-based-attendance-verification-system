const express = require("express");

const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { ROLES } = require("../../utils/constants");
const { exportRateLimiter } = require("../../middleware/rateLimit.middleware");

const reportsController = require("./reports.controller");

const router = express.Router();

router.get("/diagnostic-reports-version", (req, res) => {
  res.json({
    commit: process.env.RENDER_GIT_COMMIT || "unknown",
    reportsRoutesLoaded: true
  });
});

router.use(authenticate);

// Dashboard routes
router.get(
  "/dashboard",
  requireRole(ROLES.TEACHER),
  reportsController.getTeacherDashboard
);

router.get(
  "/teacher/overview",
  requireRole(ROLES.TEACHER),
  reportsController.teacherOverview
);

router.get(
  "/teacher/students",
  requireRole(ROLES.TEACHER),
  reportsController.teacherStudents
);

router.get(
  "/courses",
  requireRole(ROLES.TEACHER),
  reportsController.getTeacherCoursesReport
);

router.get(
  "/courses/:courseId",
  requireRole(ROLES.TEACHER),
  reportsController.getTeacherCourseDetailReport
);

router.get(
  "/courses/:courseId/students",
  requireRole(ROLES.TEACHER),
  reportsController.getTeacherCourseStudentsReport
);

// Phase 5 specific routes
router.get(
  "/courses/:courseId/defaulters",
  requireRole(ROLES.TEACHER),
  reportsController.getCourseDefaulters
);

router.get(
  "/courses/:courseId/trends",
  requireRole(ROLES.TEACHER),
  reportsController.getCourseTrends
);

// Export routes with rate limiting
router.get(
  "/courses/:courseId/export/csv",
  requireRole(ROLES.TEACHER),
  exportRateLimiter,
  reportsController.exportCourseCSV
);

router.get(
  "/courses/:courseId/defaulters/export/csv",
  requireRole(ROLES.TEACHER),
  exportRateLimiter,
  reportsController.exportCourseDefaultersCSV
);

router.get(
  "/courses/:courseId/export/pdf",
  requireRole(ROLES.TEACHER),
  exportRateLimiter,
  reportsController.exportCoursePDF
);

// Student routes
router.get(
  "/student/me",
  reportsController.studentSelfReport
);

router.get(
  "/student/history",
  reportsController.studentHistory
);

router.get(
  "/teacher/student/:studentId/history",
  reportsController.teacherStudentHistory
);

router.get(
  "/courses/:courseId/students/:studentId/history",
  requireRole(ROLES.TEACHER),
  reportsController.getStudentCourseAttendanceHistory
);

router.patch(
  "/attendance/:attendanceId/manual",
  requireRole(ROLES.TEACHER),
  reportsController.correctAttendanceManually
);

module.exports = router;