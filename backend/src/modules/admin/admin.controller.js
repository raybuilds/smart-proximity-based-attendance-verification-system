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

module.exports = {
  getAdminDashboard,
  getAdminRecentActivity,
  getAdminStudents,
  getAdminStudentDetail,
  getAdminTeachers,
  getAdminTeacherDetail,
  toggleUserStatus
};
