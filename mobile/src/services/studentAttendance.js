import api from "./api";

export async function submitScannedAttendance({ sessionCode, nonce, proximityToken }) {
  const response = await api.post("/student-attendance/scan", {
    sessionCode,
    nonce,
    proximityToken,
  });

  return response.data;
}
