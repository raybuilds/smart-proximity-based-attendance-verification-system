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
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BUTTON_VARIANTS, BADGES, LAYOUT, FONTS } from "../utils/theme";
import { Wifi, Info, Shield, CheckCircle, XCircle, ChevronLeft } from "lucide-react-native";

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

      if (!validation.success || !validation.proximityToken) {
        setMessage(validation.message || "WiFi validation failed");
        return;
      }

      const attendanceResult = await submitScannedAttendance({
        sessionCode,
        nonce,
        proximityToken: validation.proximityToken,
      });

      setIsSuccess(true);
      setMessage(attendanceResult.message);
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message || "";
      if (errMsg.toLowerCase().includes("already marked")) {
        setMessage("Attendance already marked for this session.");
      } else {
        setMessage(errMsg || "Could not complete WiFi attendance verification.");
      }
    } finally {
      setIsScanning(false);
      setIsValidating(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Shield size={24} color={COLORS.primary} style={styles.headerIcon} />
          <Text style={styles.title}>WiFi Proximity Check</Text>
        </View>
        <Text style={styles.subtitle}>
          We will verify that you are close to the teacher hotspot before attendance is accepted.
        </Text>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Session Code</Text>
          <Text style={styles.statusValue}>{sessionCode}</Text>
        </View>

        {detectedWifi ? (
          <View style={styles.hotspotCard}>
            <View style={styles.hotspotHeader}>
              <Wifi size={16} color={COLORS.primary} style={styles.hotspotIcon} />
              <Text style={styles.hotspotTitle}>Detected Hotspot</Text>
            </View>
            <View style={styles.hotspotDetailGrid}>
              <Text style={styles.hotspotText}>SSID: <Text style={styles.boldText}>{detectedWifi.SSID}</Text></Text>
              <Text style={styles.hotspotText}>BSSID: <Text style={styles.boldText}>{detectedWifi.BSSID}</Text></Text>
              <Text style={styles.hotspotText}>
                RSSI: <Text style={styles.boldText}>{detectedWifi.level} dBm</Text> ({signalLabel})
              </Text>
            </View>
          </View>
        ) : null}

        {isScanning || isValidating ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
        ) : null}

        {message ? (
          <View style={[styles.messageBox, isSuccess ? styles.successBox : styles.errorBox]}>
            {isSuccess ? (
              <CheckCircle size={16} color={COLORS.success} style={styles.feedbackIcon} />
            ) : (
              <XCircle size={16} color={COLORS.error} style={styles.feedbackIcon} />
            )}
            <Text style={[styles.messageText, isSuccess ? styles.successText : styles.errorText]}>
              {message}
            </Text>
          </View>
        ) : (
          <View style={styles.helperBox}>
            <Info size={16} color={COLORS.textSecondary} style={styles.feedbackIcon} />
            <Text style={styles.helperText}>
              Scan nearby WiFi and validate that you are close to the teacher hotspot.
            </Text>
          </View>
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
          <ChevronLeft size={16} color={COLORS.primary} />
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
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  headerIcon: {
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.screenTitle,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primary,
    fontFamily: FONTS.heading,
    textAlign: "center",
  },
  subtitle: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.body,
    lineHeight: 22,
    fontFamily: FONTS.body,
  },
  statusCard: {
    backgroundColor: COLORS.infoLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(42, 95, 139, 0.15)",
  },
  statusLabel: {
    color: COLORS.info,
    fontSize: TYPOGRAPHY.sizes.metadata,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statusValue: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.cardMetric,
    fontWeight: TYPOGRAPHY.weights.extrabold,
    letterSpacing: 3,
    fontFamily: FONTS.body,
  },
  hotspotCard: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.md,
    padding: SPACING.base,
    marginBottom: SPACING.base,
  },
  hotspotHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  hotspotIcon: {
    marginRight: SPACING.xs,
  },
  hotspotTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontFamily: FONTS.heading,
  },
  hotspotDetailGrid: {
    gap: 2,
  },
  hotspotText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.body,
    lineHeight: 22,
    fontFamily: FONTS.body,
  },
  boldText: {
    color: COLORS.text,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  loader: {
    marginBottom: SPACING.base,
  },
  helperBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.base,
  },
  helperText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.body,
    lineHeight: 20,
    fontFamily: FONTS.body,
  },
  messageBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.base,
  },
  successBox: {
    backgroundColor: COLORS.successLight,
    borderColor: "rgba(45, 106, 79, 0.15)",
  },
  errorBox: {
    backgroundColor: COLORS.errorLight,
    borderColor: "rgba(176, 58, 46, 0.15)",
  },
  feedbackIcon: {
    marginRight: SPACING.sm,
  },
  messageText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semibold,
    lineHeight: 20,
    fontFamily: FONTS.body,
  },
  successText: {
    color: COLORS.success,
  },
  errorText: {
    color: COLORS.error,
  },
  primaryButton: {
    ...BUTTON_VARIANTS.primary,
    height: 48,
    ...SHADOWS.xs,
  },
  primaryButtonText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  secondaryButton: {
    ...BUTTON_VARIANTS.outline,
    marginTop: SPACING.sm,
    height: 48,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
