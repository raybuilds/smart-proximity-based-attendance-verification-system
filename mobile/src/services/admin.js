import api from "./api";

export async function getAdminDashboard() {
  const response = await api.get("/admin/dashboard");
  return response.data;
}

export async function getAdminRecentActivity() {
  const response = await api.get("/admin/recent-activity");
  return response.data;
}

export async function getAdminStudents(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.append("search", filters.search);
  if (filters.department) params.append("department", filters.department);
  if (filters.year) params.append("year", filters.year.toString());
  if (filters.section) params.append("section", filters.section);

  const queryString = params.toString();
  const url = queryString ? `/admin/students?${queryString}` : "/admin/students";
  const response = await api.get(url);
  return response.data;
}

export async function getAdminStudentDetail(studentId) {
  const response = await api.get(`/admin/students/${studentId}`);
  return response.data;
}

export async function getAdminTeachers() {
  const response = await api.get("/admin/teachers");
  return response.data;
}

export async function getAdminTeacherDetail(teacherId) {
  const response = await api.get(`/admin/teachers/${teacherId}`);
  return response.data;
}

export async function toggleUserStatus(userId, isActive) {
  const response = await api.patch(`/admin/users/${userId}/status`, { isActive });
  return response.data;
}

export async function getAdminCourses() {
  const response = await api.get("/admin/courses");
  return response.data;
}

export async function getAdminCourseDetail(courseId) {
  const response = await api.get(`/admin/courses/${courseId}`);
  return response.data;
}

export async function getAdminManualCorrections(filters = {}) {
  const params = new URLSearchParams();
  if (filters.teacherId) params.append("teacherId", filters.teacherId.toString());
  if (filters.courseId) params.append("courseId", filters.courseId.toString());
  if (filters.reason) params.append("reason", filters.reason);
  if (filters.startDate) params.append("startDate", filters.startDate);
  if (filters.endDate) params.append("endDate", filters.endDate);
  if (filters.page) params.append("page", filters.page.toString());
  if (filters.limit) params.append("limit", filters.limit.toString());

  const queryString = params.toString();
  const url = queryString ? `/admin/corrections?${queryString}` : "/admin/corrections";
  const response = await api.get(url);
  return response.data;
}

export async function getAdminLiveSessions() {
  const response = await api.get("/admin/live-sessions");
  return response.data;
}

export async function getAdminAtRisk() {
  const response = await api.get("/admin/at-risk");
  return response.data;
}

export async function getAdminAnalytics() {
  const response = await api.get("/admin/analytics");
  return response.data;
}

export async function getArchivedCourses() {
  const response = await api.get("/admin/courses/archived");
  return response.data;
}

export async function getArchivedCourseDetail(courseId) {
  const response = await api.get(`/admin/courses/archived/${courseId}`);
  return response.data;
}

export async function archiveCourse(courseId) {
  const response = await api.patch(`/admin/courses/${courseId}/archive`);
  return response.data;
}

export async function restoreCourse(courseId) {
  const response = await api.patch(`/admin/courses/${courseId}/restore`);
  return response.data;
}

export async function resetUserPassword(userId, temporaryPassword) {
  const response = await api.post(`/admin/users/${userId}/reset-password`, { temporaryPassword });
  return response.data;
}


