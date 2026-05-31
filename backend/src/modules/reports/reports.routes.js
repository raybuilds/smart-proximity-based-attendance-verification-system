const express = require("express");

const { authenticate } = require("../../middleware/auth.middleware");
const { requireRole } = require("../../middleware/role.middleware");
const { ROLES } = require("../../utils/constants");

const reportsController = require("./reports.controller");

const router = express.Router();

router.use(authenticate);

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
  "/teacher/history-test",
  (req, res) => {
    res.json({
      success: true,
      message: "History route loaded",
    });
  }
);

module.exports = router;