import api from "./api";

export async function startSession() {
  const response = await api.post("/attendance/session/start");
  return response.data;
}

export async function endSession() {
  const response = await api.post("/attendance/session/end");
  return response.data;
}

export async function getActiveSession() {
  const response = await api.get("/attendance/session/active");
  return response.data;
}
