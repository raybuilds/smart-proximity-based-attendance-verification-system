import api from "./api";

export async function getTeacherOverview(config = {}) {
  const response = await api.get(
    "/reports/teacher/overview",
    config
  );

  return response.data;
}

export async function getStudentReports() {
  const response = await api.get(
    "/reports/teacher/students"
  );

  return response.data;
}

export async function getStudentSelfReport() {
  const response = await api.get(
    "/reports/student/me"
  );

  return response.data;
}

export async function getStudentHistory() {
  const response = await api.get(
    "/reports/student/history"
  );

  return response.data;
}

export async function getTeacherStudentHistory(
  studentId
) {
  const response = await api.get(
    `/reports/teacher/student/${studentId}/history`
  );

  return response.data;
}

export async function getTeacherCoursesReport(config = {}) {
  const response = await api.get("/reports/courses", config);
  return response.data;
}

export async function getTeacherCourseDetailReport(courseId, config = {}) {
  const response = await api.get(`/reports/courses/${courseId}`, config);
  return response.data;
}

export async function getTeacherCourseStudentsReport(courseId) {
  const response = await api.get(`/reports/courses/${courseId}/students`);
  return response.data;
}

// Phase 5 API integrations
export async function getTeacherDashboard(range = "all", config = {}) {
  const response = await api.get(`/reports/dashboard?range=${range}`, config);
  return response.data;
}

export async function getCourseDefaulters(courseId, threshold = 75, config = {}) {
  const response = await api.get(`/reports/courses/${courseId}/defaulters?threshold=${threshold}`, config);
  return response.data;
}

export async function getCourseTrends(courseId) {
  const response = await api.get(`/reports/courses/${courseId}/trends`);
  return response.data;
}

export async function getStudentAttendanceHistoryForCourse(courseId, studentId) {
  const response = await api.get(`/reports/courses/${courseId}/students/${studentId}/history`);
  return response.data;
}

export async function correctAttendanceManually(attendanceId, reason) {
  const response = await api.patch(`/reports/attendance/${attendanceId}/manual`, { reason });
  return response.data;
}

export async function getStudentCourses() {
  const response = await api.get("/reports/student/courses");
  return response.data;
}

export async function getStudentCourseDetail(courseId) {
  const response = await api.get(`/reports/student/courses/${courseId}`);
  return response.data;
}