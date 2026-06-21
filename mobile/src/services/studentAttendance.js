import api from "./api";

export async function submitScannedAttendance({ sessionCode, nonce, proximityToken, ssid, bssid, rssi, devicePlatform }) {
  const response = await api.post("/student-attendance/scan", {
    sessionCode,
    nonce,
    proximityToken,
    ssid,
    bssid,
    rssi,
    devicePlatform,
  });

  return response.data;
}
