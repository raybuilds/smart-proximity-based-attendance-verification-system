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
import {
  Camera,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react-native";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BUTTON_VARIANTS, BADGES, LAYOUT, FONTS } from "../utils/theme";

export default function StudentScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanned, setIsScanned] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [explanationDismissed, setExplanationDismissed] = useState(false);

  useEffect(() => {
    async function checkAcknowledge() {
      try {
        const value = await AsyncStorage.getItem("location_explanation_acknowledged");
        if (value === "true") {
          setExplanationDismissed(true);
        }
      } catch (e) {
        // Fallback
      }
    }
    checkAcknowledge();
  }, []);

  async function acknowledgeExplanation() {
    try {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      await AsyncStorage.setItem("location_explanation_acknowledged", "true");
      setExplanationDismissed(true);
      if (!permission) {
        requestPermission();
      }
    } catch (e) {
      setExplanationDismissed(true);
    }
  }

  useEffect(() => {
    if (explanationDismissed && !permission) {
      requestPermission();
    }
  }, [permission, requestPermission, explanationDismissed]);

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
      setMessage("QR verified successfully.");
      navigation.replace("WifiDetection", {
        sessionCode,
        nonce,
      });
    } catch (error) {
      setIsSuccess(false);
      let displayMsg = error.response?.data?.message || error.message || "Verification failed.";
      if (error instanceof SyntaxError || displayMsg.includes("Invalid QR payload") || displayMsg.includes("JSON")) {
        displayMsg = "Invalid attendance QR code.";
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
    if (isSubmitting || isScanned) {
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setIsSuccess(false);
        setMessage("Gallery access denied.");
        return;
      }

      setIsScanned(true);

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.5,
      });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
        setIsScanned(false);
        return;
      }

      setIsSubmitting(true);
      setMessage("Decoding QR...");

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
        setIsScanned(false);
        setMessage("No QR code found in selected image.");
        return;
      }

      setIsSubmitting(false);
      setIsScanned(false);

      await handleBarcodeScanned({ data: code.data });
    } catch (error) {
      setIsSubmitting(false);
      setIsSuccess(false);
      setIsScanned(false);
      setMessage("Failed to decode image.");
      console.error(error);
    }
  }

  if (!explanationDismissed) {
    return (
      <View style={styles.centeredContainer}>
        <View style={styles.permissionCard}>
          <View style={styles.alertIconWrap}>
            <AlertTriangle size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.permissionTitle}>WiFi Verification Notice</Text>
          <Text style={styles.permissionSubtitle}>
            Android requires Location permission to access nearby WiFi network information.{"\n\n"}
            Digital Proximity Attendance does NOT store or track your location.{"\n\n"}
            The permission is used only to verify proximity to the classroom network.
          </Text>
          <Pressable style={styles.primaryButton} onPress={acknowledgeExplanation}>
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Pressable>
          <Pressable
            style={styles.outlineButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.outlineButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centeredContainer}>
        <View style={styles.permissionCard}>
          <View style={styles.alertIconWrap}>
            <AlertTriangle size={32} color={COLORS.warning} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionSubtitle}>
            Allow camera access to scan live attendance QR codes.
          </Text>
          <Pressable style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Grant Permission</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, (isSubmitting || isScanned) && styles.buttonDisabled]}
            onPress={handleImportQr}
            disabled={isSubmitting || isScanned}
          >
            <Text style={styles.secondaryButtonText}>Import QR From Gallery</Text>
          </Pressable>
          <Pressable
            style={styles.outlineButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.outlineButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Dynamic Notification Banner Overlay */}
      {message ? (
        <View style={[styles.feedbackBox, isSuccess ? BADGES.success : BADGES.danger]}>
          {isSuccess ? (
            <CheckCircle size={16} color={COLORS.success} style={styles.feedbackIcon} />
          ) : (
            <XCircle size={16} color={COLORS.error} style={styles.feedbackIcon} />
          )}
          <Text style={[styles.messageText, { color: isSuccess ? COLORS.success : COLORS.error }]}>
            {message}
          </Text>
        </View>
      ) : (
        <View style={styles.instructionBanner}>
          <Text style={styles.instructionText}>
            Point camera at QR code. Attendance will mark automatically.
          </Text>
        </View>
      )}

      {/* Dominant Camera Viewport (75% height) */}
      <View style={styles.scannerViewport}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={isScanned ? undefined : handleBarcodeScanned}
        />
        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>
      </View>

      {/* Minimal Footer Deck */}
      <View style={styles.footerDeck}>
        {isSubmitting && !message ? (
          <ActivityIndicator color={COLORS.primary} style={styles.footerLoader} />
        ) : null}

        {!isScanned ? (
          <Pressable
            style={[styles.secondaryButton, (isSubmitting || isScanned) && styles.buttonDisabled]}
            onPress={handleImportQr}
            disabled={isSubmitting || isScanned}
          >
            <Text style={styles.secondaryButtonText}>Import QR Code</Text>
          </Pressable>
        ) : null}

        {isScanned ? (
          <Pressable style={styles.primaryButton} onPress={resetScanner}>
            <Text style={styles.primaryButtonText}>
              {isSuccess ? "Scan Another" : "Try Again"}
            </Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.outlineButton} onPress={() => navigation.goBack()}>
          <Text style={styles.outlineButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.base,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  permissionCard: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    ...SHADOWS.md,
  },
  alertIconWrap: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.warningLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.base,
    borderWidth: 1,
    borderColor: "rgba(193, 127, 36, 0.15)",
  },
  permissionTitle: {
    fontSize: TYPOGRAPHY.sizes.screenTitle - 2,
    fontFamily: FONTS.heading,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  permissionSubtitle: {
    color: COLORS.textSecondary,
    textAlign: "center",
    fontSize: TYPOGRAPHY.sizes.body,
    lineHeight: 20,
    fontFamily: FONTS.body,
    marginBottom: SPACING.lg,
  },
  instructionBanner: {
    backgroundColor: COLORS.primaryLight,
    borderColor: "rgba(45, 106, 79, 0.15)",
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  instructionText: {
    color: COLORS.primary,
    textAlign: "center",
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: "600",
    fontFamily: FONTS.body,
  },
  feedbackBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  feedbackIcon: {
    marginRight: SPACING.sm,
  },
  messageText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: "600",
    fontFamily: FONTS.body,
  },
  scannerViewport: {
    flex: 75, // Occupies ~75% of available height
    overflow: "hidden",
    borderRadius: RADIUS.lg,
    backgroundColor: "#000000",
    position: "relative",
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  scanFrame: {
    width: 250,
    height: 250,
    backgroundColor: "transparent",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: COLORS.primaryLight,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: RADIUS.xs,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: RADIUS.xs,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: RADIUS.xs,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: RADIUS.xs,
  },
  footerDeck: {
    flex: 25, // Bottom utilities deck
    justifyContent: "center",
    alignItems: "center",
    paddingTop: SPACING.sm,
  },
  footerLoader: {
    marginBottom: SPACING.xs,
  },
  primaryButton: {
    ...BUTTON_VARIANTS.primary,
    width: "100%",
    height: 48,
  },
  primaryButtonText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "700",
    fontFamily: FONTS.body,
  },
  secondaryButton: {
    ...BUTTON_VARIANTS.secondary,
    width: "100%",
    height: 48,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "700",
    fontFamily: FONTS.body,
  },
  outlineButton: {
    ...BUTTON_VARIANTS.outline,
    width: "100%",
    height: 44,
    marginTop: SPACING.xs,
  },
  outlineButtonText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "700",
    fontFamily: FONTS.body,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
