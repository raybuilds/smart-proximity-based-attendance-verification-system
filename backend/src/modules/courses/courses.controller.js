const coursesService = require("./courses.service");
const { createCourseSchema, updateCourseSchema } = require("./courses.validation");
const { HTTP_STATUS } = require("../../utils/constants");

async function createCourse(req, res, next) {
  try {
    const payload = createCourseSchema.parse(req.body || {});
    const course = await coursesService.createCourse(req.user.sub, payload);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      course,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      error.message = error.issues[0]?.message || "Invalid input parameters";
    }
    next(error);
  }
}

async function getCourses(req, res, next) {
  try {
    const includeArchived = req.query.includeArchived === "true";
    const courses = await coursesService.getCourses(req.user.sub, includeArchived);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      courses,
    });
  } catch (error) {
    next(error);
  }
}

async function getCourseById(req, res, next) {
  try {
    const courseId = parseInt(req.params.id, 10);
    if (isNaN(courseId)) {
      const error = new Error("Invalid course ID");
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    const course = await coursesService.getCourseById(req.user.sub, courseId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      course,
    });
  } catch (error) {
    next(error);
  }
}

async function updateCourse(req, res, next) {
  try {
    const courseId = parseInt(req.params.id, 10);
    if (isNaN(courseId)) {
      const error = new Error("Invalid course ID");
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    const payload = updateCourseSchema.parse(req.body || {});
    const course = await coursesService.updateCourse(req.user.sub, courseId, payload);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      course,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      error.message = error.issues[0]?.message || "Invalid input parameters";
    }
    next(error);
  }
}

async function deleteCourse(req, res, next) {
  try {
    const courseId = parseInt(req.params.id, 10);
    if (isNaN(courseId)) {
      const error = new Error("Invalid course ID");
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    const course = await coursesService.deleteCourse(req.user.sub, courseId, req.body || {});

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Course archived successfully",
      course,
    });
  } catch (error) {
    next(error);
  }
}

async function unarchiveCourse(req, res, next) {
  try {
    const courseId = parseInt(req.params.id, 10);
    if (isNaN(courseId)) {
      const error = new Error("Invalid course ID");
      error.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw error;
    }

    const course = await coursesService.unarchiveCourse(req.user.sub, courseId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Course unarchived successfully",
      course,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  unarchiveCourse,
};
