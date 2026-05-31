import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { submitScannedAttendance } from "../services/studentAttendance";
import { getNearbyWifi, validateWifi } from "../services/wifi";

function getSignalLabel(rssi) {
  if (rssi >= -50) {
    return "Excellent";
  }

  if (rssi >= -60) {
    return "Good";
  }

  if (rssi >= -70) {
    return "Fair";
  }

  return "Weak";
}

export default function WifiDetectionScreen({ navigation, route }) {
  const { sessionCode, nonce } = route.params;
  const [detectedWifi, setDetectedWifi] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const signalLabel = useMemo(
    () => (detectedWifi ? getSignalLabel(Number(detectedWifi.level)) : ""),
    [detectedWifi]
  );

  async function handleScanAndValidate() {
    try {
      setIsScanning(true);
      setIsSuccess(false);
      setMessage("");

      const wifiList = await getNearbyWifi();
      const teacherHotspot = wifiList.find(
        (network) => network.SSID === "ATTENDANCE_TEACHER"
      );

      if (!teacherHotspot) {
        setDetectedWifi(null);
        setMessage("Teacher hotspot not detected");
        return;
      }

      setDetectedWifi(teacherHotspot);
      setIsValidating(true);

      const validation = await validateWifi({
        sessionCode,
        ssid: teacherHotspot.SSID,
        bssid: teacherHotspot.BSSID,
        rssi: Number(teacherHotspot.level),
      });

      if (!validation.success) {
        setMessage(validation.message);
        return;
      }

      const attendanceResult = await submitScannedAttendance({
        sessionCode,
        nonce,
      });

      setIsSuccess(true);
      setMessage(attendanceResult.message);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.message ||
          "Could not complete WiFi attendance verification."
      );
    } finally {
      setIsScanning(false);
      setIsValidating(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>WiFi Proximity Check</Text>
        <Text style={styles.subtitle}>
          We will verify that you are close to the teacher hotspot before attendance is accepted.
        </Text>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Session Code</Text>
          <Text style={styles.statusValue}>{sessionCode}</Text>
        </View>

        {detectedWifi ? (
          <View style={styles.hotspotCard}>
            <Text style={styles.hotspotTitle}>Detected Hotspot</Text>
            <Text style={styles.hotspotText}>SSID: {detectedWifi.SSID}</Text>
            <Text style={styles.hotspotText}>BSSID: {detectedWifi.BSSID}</Text>
            <Text style={styles.hotspotText}>
              RSSI: {detectedWifi.level} dBm ({signalLabel})
            </Text>
          </View>
        ) : null}

        {isScanning || isValidating ? (
          <ActivityIndicator size="large" color="#0f172a" style={styles.loader} />
        ) : null}

        {message ? (
          <Text style={[styles.message, isSuccess ? styles.successText : styles.errorText]}>
            {message}
          </Text>
        ) : (
          <Text style={styles.helperText}>
            Scan nearby WiFi and validate that you are close to the teacher hotspot.
          </Text>
        )}

        <Pressable
          style={[
            styles.primaryButton,
            (isScanning || isValidating) && styles.buttonDisabled,
          ]}
          onPress={handleScanAndValidate}
          disabled={isScanning || isValidating}
        >
          <Text style={styles.primaryButtonText}>
            {isSuccess ? "Recheck WiFi" : "Scan Nearby WiFi"}
          </Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#f8fafc",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 24,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 10,
    marginBottom: 20,
    textAlign: "center",
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
  },
  statusCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  statusLabel: {
    color: "#64748b",
    fontSize: 14,
    marginBottom: 6,
  },
  statusValue: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 3,
  },
  hotspotCard: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  hotspotTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  hotspotText: {
    color: "#334155",
    fontSize: 14,
    lineHeight: 22,
  },
  loader: {
    marginBottom: 16,
  },
  helperText: {
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  message: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
    marginBottom: 16,
  },
  successText: {
    color: "#15803d",
  },
  errorText: {
    color: "#dc2626",
  },
  primaryButton: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#0f172a",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
