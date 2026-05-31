const reportsService = require("./reports.service");

async function teacherOverview(req, res, next) {
  try {
    const data = await reportsService.getTeacherOverview();

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
    const data =
      await reportsService.getStudentReports();

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function studentSelfReport(
  req,
  res,
  next
) {
  try {
    const data =
      await reportsService.getStudentSelfReport(
        req.user.id
      );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function studentHistory(
  req,
  res,
  next
) {
  try {
    const data =
      await reportsService.getStudentAttendanceHistory(
        req.user.id
      );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function teacherStudentHistory(
  req,
  res,
  next
) {
  try {
    const studentId = Number(
      req.params.studentId
    );

    const data =
      await reportsService.getStudentHistoryById(
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

module.exports = {
  teacherOverview,
  teacherStudents,
  studentSelfReport,
  studentHistory,
  teacherStudentHistory,
};