import api from "./api";

export async function getCurrentQR(sessionId) {
  const response = await api.get(`/qr/current/${sessionId}`);
  return response.data;
}
