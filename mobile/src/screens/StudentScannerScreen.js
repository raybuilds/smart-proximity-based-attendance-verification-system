import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

import { submitScannedAttendance } from "../services/studentAttendance";

export default function StudentScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanned, setIsScanned] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  async function handleBarcodeScanned({ data }) {
    if (isSubmitting || isScanned) {
      return;
    }

    try {
      setIsSubmitting(true);
      setIsScanned(true);
      setMessage("");

      const parsedPayload = JSON.parse(data);
      const sessionCode = parsedPayload.sessionCode;
      const nonce = parsedPayload.nonce;

      if (!sessionCode || !nonce) {
        throw new Error("Invalid QR payload");
      }

      const response = await submitScannedAttendance({
        sessionCode,
        nonce,
      });

      setIsSuccess(true);
      setMessage(response.message);
    } catch (error) {
      setIsSuccess(false);
      setMessage(
        error.response?.data?.message ||
          error.message ||
          "Could not validate the QR code."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetScanner() {
    setIsScanned(false);
    setMessage("");
    setIsSuccess(false);
  }

  if (!permission) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centeredContainer}>
        <View style={styles.card}>
          <Text style={styles.title}>Camera Access Needed</Text>
          <Text style={styles.subtitle}>
            Allow camera access to scan your teacher&apos;s live attendance QR.
          </Text>
          <Pressable style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Grant Permission</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>Scan Attendance QR</Text>
        <Text style={styles.subtitle}>
          Align the live QR code inside the frame to mark your attendance.
        </Text>
      </View>

      <View style={styles.scannerCard}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={isScanned ? undefined : handleBarcodeScanned}
        />
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
        </View>
      </View>

      <View style={styles.footerCard}>
        {isSubmitting ? <ActivityIndicator color="#0f172a" /> : null}
        {message ? (
          <Text
            style={[styles.messageText, isSuccess ? styles.successText : styles.errorText]}
          >
            {message}
          </Text>
        ) : (
          <Text style={styles.helperText}>
            Point your camera at the teacher&apos;s live QR code.
          </Text>
        )}

        <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </Pressable>

        {isScanned ? (
          <Pressable style={styles.primaryButton} onPress={resetScanner}>
            <Text style={styles.primaryButtonText}>
              {isSuccess ? "Scan Another Code" : "Try Again"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 20,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 24,
  },
  card: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 24,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  headerCard: {
    marginTop: 16,
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 10,
    color: "#475569",
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
  },
  scannerCard: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 18,
    backgroundColor: "#0f172a",
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.15)",
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: "#ffffff",
    borderRadius: 24,
    backgroundColor: "transparent",
  },
  footerCard: {
    marginTop: 18,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  helperText: {
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 14,
  },
  messageText: {
    textAlign: "center",
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 14,
    fontSize: 15,
    fontWeight: "600",
  },
  successText: {
    color: "#15803d",
  },
  errorText: {
    color: "#dc2626",
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 12,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#0f172a",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700",
  },
});
