const reportsService = require("./reports.service");

async function teacherOverview(req, res, next) {
  try {
    const data = await reportsService.getTeacherOverview(req.user.sub);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function teacherStudents(req, res, next) {
  try {
    const data = await reportsService.getStudentReports();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function studentSelfReport(req, res, next) {
  try {
    const data = await reportsService.getStudentSelfReport(req.user.sub);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function studentHistory(req, res, next) {
  try {
    const data = await reportsService.getStudentAttendanceHistory(req.user.sub);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function teacherStudentHistory(req, res, next) {
  try {
    const studentId = Number(req.params.studentId);
    const data = await reportsService.getStudentHistoryById(studentId);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function getTeacherCoursesReport(req, res, next) {
  try {
    const data = await reportsService.getTeacherCoursesReport(req.user.sub);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function getTeacherCourseDetailReport(req, res, next) {
  try {
    const courseId = Number(req.params.courseId);
    if (isNaN(courseId)) {
      const error = new Error("Invalid course ID");
      error.statusCode = 400;
      throw error;
    }

    const data = await reportsService.getTeacherCourseDetailReport(req.user.sub, courseId);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function getTeacherCourseStudentsReport(req, res, next) {
  try {
    const courseId = Number(req.params.courseId);
    if (isNaN(courseId)) {
      const error = new Error("Invalid course ID");
      error.statusCode = 400;
      throw error;
    }

    const data = await reportsService.getTeacherCourseStudentsReport(req.user.sub, courseId);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

// New route handlers for Phase 5
async function getTeacherDashboard(req, res, next) {
  try {
    const range = req.query.range || "all";
    const data = await reportsService.getTeacherDashboard(req.user.sub, range);
    res.status(200).json({
      success: true,
      data,
      dashboard: data,
    });
  } catch (error) {
    next(error);
  }
}

async function getCourseDefaulters(req, res, next) {
  try {
    const courseId = Number(req.params.courseId);
    if (isNaN(courseId)) {
      const error = new Error("Invalid course ID");
      error.statusCode = 400;
      throw error;
    }

    const thresholdVal = req.query.threshold !== undefined ? Number(req.query.threshold) : 75;
    if (isNaN(thresholdVal) || thresholdVal < 1 || thresholdVal > 100) {
      return res.status(400).json({
        success: false,
        message: "Threshold must be between 1 and 100.",
      });
    }

    const data = await reportsService.getCourseDefaulters(req.user.sub, courseId, thresholdVal);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}


async function exportCourseCSV(req, res, next) {
  try {
    const courseId = Number(req.params.courseId);
    if (isNaN(courseId)) {
      const error = new Error("Invalid course ID");
      error.statusCode = 400;
      throw error;
    }

    const result = await reportsService.exportCourseCSV(req.user.sub, courseId);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    res.status(200).send(result.csvContent);
  } catch (error) {
    next(error);
  }
}

async function exportCourseDefaultersCSV(req, res, next) {
  try {
    const courseId = Number(req.params.courseId);
    if (isNaN(courseId)) {
      const error = new Error("Invalid course ID");
      error.statusCode = 400;
      throw error;
    }

    const thresholdVal = req.query.threshold !== undefined ? Number(req.query.threshold) : 75;
    if (isNaN(thresholdVal) || thresholdVal < 1 || thresholdVal > 100) {
      return res.status(400).json({
        success: false,
        message: "Threshold must be between 1 and 100.",
      });
    }

    const result = await reportsService.exportCourseDefaultersCSV(req.user.sub, courseId, thresholdVal);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    res.status(200).send(result.csvContent);
  } catch (error) {
    next(error);
  }
}

async function exportCoursePDF(req, res, next) {
  try {
    const courseId = Number(req.params.courseId);
    if (isNaN(courseId)) {
      const error = new Error("Invalid course ID");
      error.statusCode = 400;
      throw error;
    }

    await reportsService.exportCoursePDF(req.user.sub, courseId, res);
  } catch (error) {
    next(error);
  }
}

async function getStudentCourseAttendanceHistory(req, res, next) {
  try {
    const courseId = Number(req.params.courseId);
    const studentId = Number(req.params.studentId);
    if (isNaN(courseId) || isNaN(studentId)) {
      const error = new Error("Invalid course ID or student ID");
      error.statusCode = 400;
      throw error;
    }

    const data = await reportsService.getStudentCourseAttendanceHistory(
      req.user.sub,
      courseId,
      studentId
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function correctAttendanceManually(req, res, next) {
  try {
    const { attendanceId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      const error = new Error("Correction reason is required");
      error.statusCode = 400;
      throw error;
    }

    const data = await reportsService.correctAttendanceManually(
      req.user.sub,
      attendanceId,
      reason
    );

    res.status(200).json({
      success: true,
      message: "Attendance corrected successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function getStudentCoursesReport(req, res, next) {
  try {
    const data = await reportsService.getStudentCoursesReport(req.user.sub);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function getStudentCourseDetailReport(req, res, next) {
  try {
    const courseId = Number(req.params.courseId);
    if (isNaN(courseId)) {
      const error = new Error("Invalid course ID");
      error.statusCode = 400;
      throw error;
    }

    const data = await reportsService.getStudentCourseDetailReport(req.user.sub, courseId);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  teacherOverview,
  teacherStudents,
  studentSelfReport,
  studentHistory,
  teacherStudentHistory,
  getTeacherCoursesReport,
  getTeacherCourseDetailReport,
  getTeacherCourseStudentsReport,
  // New handlers
  getTeacherDashboard,
  getCourseDefaulters,
  exportCourseCSV,
  exportCourseDefaultersCSV,
  exportCoursePDF,
  getStudentCourseAttendanceHistory,
  correctAttendanceManually,
  // Student report handlers
  getStudentCoursesReport,
  getStudentCourseDetailReport,
};