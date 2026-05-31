import api from "./api";

export async function submitScannedAttendance({ sessionCode, nonce }) {
  const response = await api.post("/student-attendance/scan", {
    sessionCode,
    nonce,
  });

  return response.data;
}
