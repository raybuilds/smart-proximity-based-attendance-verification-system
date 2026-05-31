import api from "./api";

export async function getTeacherOverview() {
  const response = await api.get(
    "/reports/teacher/overview"
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