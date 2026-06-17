const express = require("express");
const { requireRole } = require("../../middleware/role.middleware");
const { ROLES } = require("../../utils/constants");
const coursesController = require("./courses.controller");

const router = express.Router();

router.use(requireRole(ROLES.TEACHER));

router.post("/", coursesController.createCourse);
router.get("/", coursesController.getCourses);
router.get("/:id", coursesController.getCourseById);
router.put("/:id", coursesController.updateCourse);
router.delete("/:id", coursesController.deleteCourse);
router.post("/:id/unarchive", coursesController.unarchiveCourse);

module.exports = router;
