import api from "./api";

export async function getCourses(includeArchived = false) {
  const response = await api.get(`/courses${includeArchived ? "?includeArchived=true" : ""}`);
  return response.data;
}

export async function createCourse(data) {
  const response = await api.post("/courses", data);
  return response.data;
}

export async function deleteCourse(courseId, archiveReason = null) {
  const response = await api.delete(`/courses/${courseId}`, {
    data: { archiveReason },
  });
  return response.data;
}

export async function getCourseById(courseId) {
  const response = await api.get(`/courses/${courseId}`);
  return response.data;
}

export async function updateCourse(courseId, data) {
  const response = await api.put(`/courses/${courseId}`, data);
  return response.data;
}

export async function unarchiveCourse(courseId) {
  const response = await api.post(`/courses/${courseId}/unarchive`);
  return response.data;
}
