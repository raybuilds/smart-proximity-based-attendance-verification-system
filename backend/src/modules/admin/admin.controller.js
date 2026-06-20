const adminService = require("./admin.service");

async function getAdminDashboard(req, res, next) {
  try {
    const data = await adminService.getAdminDashboard();
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

async function getAdminRecentActivity(req, res, next) {
  try {
    const data = await adminService.getAdminRecentActivity();
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

async function getAdminStudents(req, res, next) {
  try {
    const { search, department, semester, section } = req.query;
    const filters = {
      search,
      department,
      semester: semester ? Number(semester) : undefined,
      section
    };
    const data = await adminService.getAdminStudents(filters);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

async function getAdminStudentDetail(req, res, next) {
  try {
    const studentId = Number(req.params.id);
    if (isNaN(studentId)) {
      const error = new Error("Invalid student ID");
      error.statusCode = 400;
      throw error;
    }
    const data = await adminService.getAdminStudentDetail(studentId);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

async function getAdminTeachers(req, res, next) {
  try {
    const data = await adminService.getAdminTeachers();
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

async function getAdminTeacherDetail(req, res, next) {
  try {
    const teacherId = Number(req.params.id);
    if (isNaN(teacherId)) {
      const error = new Error("Invalid teacher ID");
      error.statusCode = 400;
      throw error;
    }
    const data = await adminService.getAdminTeacherDetail(teacherId);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

async function toggleUserStatus(req, res, next) {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) {
      const error = new Error("Invalid user ID");
      error.statusCode = 400;
      throw error;
    }
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      const error = new Error("isActive status must be a boolean");
      error.statusCode = 400;
      throw error;
    }
    const data = await adminService.toggleUserStatus(userId, isActive, req.user.sub);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

async function getAdminCourses(req, res, next) {
  try {
    const data = await adminService.getAdminCourses();
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

async function getAdminCourseDetail(req, res, next) {
  try {
    const courseId = Number(req.params.id);
    if (isNaN(courseId)) {
      const error = new Error("Invalid course ID");
      error.statusCode = 400;
      throw error;
    }
    const data = await adminService.getAdminCourseDetail(courseId);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

async function getAdminManualCorrections(req, res, next) {
  try {
    const { teacherId, courseId, reason, startDate, endDate, page, limit } = req.query;
    const filters = {
      teacherId: teacherId ? Number(teacherId) : undefined,
      courseId: courseId ? Number(courseId) : undefined,
      reason,
      startDate,
      endDate,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined
    };
    const data = await adminService.getAdminManualCorrections(filters);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

async function getAdminLiveSessions(req, res, next) {
  try {
    const data = await adminService.getAdminLiveSessions();
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

async function getAdminAtRisk(req, res, next) {
  try {
    const data = await adminService.getAdminAtRisk();
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

async function getAdminAnalytics(req, res, next) {
  try {
    const data = await adminService.getAdminAnalytics();
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

async function getArchivedCourses(req, res, next) {
  try {
    const data = await adminService.getArchivedCourses();
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

async function getArchivedCourseDetail(req, res, next) {
  try {
    const courseId = Number(req.params.id);
    if (isNaN(courseId)) {
      const error = new Error("Invalid course ID");
      error.statusCode = 400;
      throw error;
    }
    const data = await adminService.getArchivedCourseDetail(courseId);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

async function archiveCourse(req, res, next) {
  try {
    const courseId = Number(req.params.id);
    if (isNaN(courseId)) {
      const error = new Error("Invalid course ID");
      error.statusCode = 400;
      throw error;
    }
    const data = await adminService.archiveCourse(courseId);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

async function restoreCourse(req, res, next) {
  try {
    const courseId = Number(req.params.id);
    if (isNaN(courseId)) {
      const error = new Error("Invalid course ID");
      error.statusCode = 400;
      throw error;
    }
    const data = await adminService.restoreCourse(courseId);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

async function updateTeacherNetwork(req, res, next) {
  try {
    const teacherId = Number(req.params.id);
    if (isNaN(teacherId)) {
      const error = new Error("Invalid teacher ID");
      error.statusCode = 400;
      throw error;
    }
    const { registeredSSID, registeredBSSID } = req.body || {};
    const data = await adminService.updateTeacherNetwork(teacherId, { registeredSSID, registeredBSSID });
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

async function resetUserPassword(req, res, next) {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) {
      const error = new Error("Invalid user ID");
      error.statusCode = 400;
      throw error;
    }
    const { temporaryPassword } = req.body || {};
    if (!temporaryPassword || temporaryPassword.trim().length < 6) {
      const error = new Error("Temporary password must be at least 6 characters");
      error.statusCode = 400;
      throw error;
    }
    const data = await adminService.resetUserPassword(userId, { temporaryPassword });
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAdminDashboard,
  getAdminRecentActivity,
  getAdminStudents,
  getAdminStudentDetail,
  getAdminTeachers,
  getAdminTeacherDetail,
  updateTeacherNetwork,
  toggleUserStatus,
  getAdminCourses,
  getAdminCourseDetail,
  getAdminManualCorrections,
  getAdminLiveSessions,
  getAdminAtRisk,
  getAdminAnalytics,
  getArchivedCourses,
  getArchivedCourseDetail,
  archiveCourse,
  restoreCourse,
  resetUserPassword
};


