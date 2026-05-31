import * as Location from "expo-location";
import WifiManager from "react-native-wifi-reborn";

import api from "./api";

export async function getNearbyWifi() {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== "granted") {
    throw new Error("Location permission is required to scan nearby WiFi");
  }

  await WifiManager.reScanAndLoadWifiList();
  const wifiList = await WifiManager.loadWifiList();

  return Array.isArray(wifiList) ? wifiList : [];
}

export async function validateWifi({ sessionCode, ssid, bssid, rssi }) {
  const response = await api.post("/wifi/validate", {
    sessionCode,
    ssid,
    bssid,
    rssi,
  });

  return response.data;
}
