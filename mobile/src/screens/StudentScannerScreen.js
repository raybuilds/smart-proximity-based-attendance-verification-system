import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import jsQR from "jsqr";
import jpeg from "jpeg-js";
import { Buffer } from "buffer";

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

      setIsSuccess(true);
      setMessage("QR scanned successfully");
      navigation.replace("WifiDetection", {
        sessionCode,
        nonce,
      });
    } catch (error) {
      setIsSuccess(false);
      let displayMsg = error.response?.data?.message || error.message || "Could not validate the QR code.";
      if (error instanceof SyntaxError || displayMsg.includes("Invalid QR payload") || displayMsg.includes("JSON")) {
        displayMsg = "Invalid QR code format. Please ensure you are importing a valid Attendance Session QR code.";
      }
      setMessage(displayMsg);
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetScanner() {
    setIsScanned(false);
    setMessage("");
    setIsSuccess(false);
  }

  async function handleImportQr() {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setIsSuccess(false);
        setMessage("Gallery access is required to import QR images.");
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.5,
      });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
        return;
      }

      setIsSubmitting(true);
      setMessage("Decoding QR code from image...");

      const pickedAsset = pickerResult.assets[0];
      const manipResult = await ImageManipulator.manipulateAsync(
        pickedAsset.uri,
        [{ resize: { width: 500 } }],
        { format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      const buffer = Buffer.from(manipResult.base64, "base64");
      const rawImageData = jpeg.decode(buffer, { useTArray: true });
      const code = jsQR(rawImageData.data, rawImageData.width, rawImageData.height);

      if (!code || !code.data) {
        setIsSubmitting(false);
        setIsSuccess(false);
        setMessage("Unable to detect a QR code in the selected image.");
        return;
      }

      // Reset submitting/scanned states temporarily so handleBarcodeScanned can execute
      setIsSubmitting(false);
      setIsScanned(false);

      await handleBarcodeScanned({ data: code.data });
    } catch (error) {
      setIsSubmitting(false);
      setIsSuccess(false);
      setMessage(error.message || "An error occurred while importing the QR code.");
      console.error(error);
    }
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
          <Pressable style={styles.primaryButton} onPress={handleImportQr}>
            <Text style={styles.primaryButtonText}>Import QR From Gallery</Text>
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

        {!isScanned ? (
          <Pressable style={styles.primaryButton} onPress={handleImportQr}>
            <Text style={styles.primaryButtonText}>Import QR From Gallery</Text>
          </Pressable>
        ) : null}

        {isScanned ? (
          <Pressable style={styles.primaryButton} onPress={resetScanner}>
            <Text style={styles.primaryButtonText}>
              {isSuccess ? "Scan Another Code" : "Try Again"}
            </Text>
          </Pressable>
        ) : null}

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
