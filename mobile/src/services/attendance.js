import api from "./api";

export async function startSession(courseId) {
  const response = await api.post("/attendance/session/start", { courseId });
  return response.data;
}

export async function endSession() {
  const response = await api.post("/attendance/session/end");
  return response.data;
}

export async function getActiveSession(config = {}) {
  const response = await api.get("/attendance/session/active", config);
  return response.data;
}
