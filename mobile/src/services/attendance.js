import api from "./api";

export async function startSession(courseId, rssiThreshold) {
  const response = await api.post("/attendance/session/start", { courseId, rssiThreshold });
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

export async function getActiveSessionStats() {
  const response = await api.get("/attendance/active/stats");
  return response.data;
}
