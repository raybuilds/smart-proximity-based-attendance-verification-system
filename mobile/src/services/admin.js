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
  if (filters.semester) params.append("semester", filters.semester.toString());
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
