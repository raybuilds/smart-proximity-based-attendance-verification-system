import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { endSession, getActiveSession } from "../services/attendance";
import { getCurrentQR } from "../services/qr";
import EligibilityChips from "../components/EligibilityChips";
import { getSessionEligibility } from "../utils/eligibility";
import { COLORS, TYPOGRAPHY, LAYOUT } from "../utils/theme";

const QR_LIFETIME_SECONDS = 25;

export default function ActiveSessionScreen({ navigation, route }) {
  console.log('[ActiveSession] mounted');
  const [session, setSession] = useState(route.params?.session || null);
  const [qrData, setQrData] = useState(null);
  const [countdown, setCountdown] = useState(QR_LIFETIME_SECONDS);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(!session);
  const [isRefreshingQr, setIsRefreshingQr] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const isFetchingQrRef = useRef(false);
  const qrRef = useRef(null);
  const progressAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    async function loadSession() {
      if (session) return;

      try {
        setIsLoading(true);
        const response = await getActiveSession();
        if (!response.session) {
          console.log('[ActiveSession] navigating', 'TeacherDashboard');
          navigation.replace('TeacherDashboard');
          return;
        }
        setSession(response.session);
      } catch (error) {
        setErrorMessage(
          error.response?.data?.message ||
            "Could not load the active attendance session."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, [navigation, session]);

  async function fetchQrCode(targetSessionId, options = {}) {
    const { silent = false } = options;

    if (isFetchingQrRef.current) {
      return;
    }

    try {
      isFetchingQrRef.current = true;
      setIsRefreshingQr(true);
      if (!silent) {
        setCountdown(QR_LIFETIME_SECONDS);
      }

      setErrorMessage("");
      const response = await getCurrentQR(targetSessionId);
      const secondsRemaining = Math.max(
        1,
        Math.ceil((new Date(response.qr.expiresAt).getTime() - Date.now()) / 1000)
      );

      setQrData(response.qr);
      setCountdown(secondsRemaining);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          "Could not load the rotating QR code. Please try again."
      );
    } finally {
      isFetchingQrRef.current = false;
      setIsRefreshingQr(false);
    }
  }

  useEffect(() => {
    return () => {
      console.log('[ActiveSession] unmounted');
    };
  }, []);

  useEffect(() => {
    if (!session?.id) {
      return;
    }

    fetchQrCode(session.id);
  }, [session?.id]);

  useEffect(() => {
    if (!qrData?.expiresAt || !session?.id) {
      return;
    }

    const tick = () => {
      const remainingSeconds = Math.max(
        0,
        Math.ceil((new Date(qrData.expiresAt).getTime() - Date.now()) / 1000)
      );

      setCountdown(remainingSeconds);

      if (remainingSeconds <= 0) {
        fetchQrCode(session.id, { silent: true });
      }
    };

    tick();
    const intervalId = setInterval(tick, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [qrData?.expiresAt, session?.id]);

  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: countdown / QR_LIFETIME_SECONDS,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [countdown, progressAnimation]);

  async function handleEndSession() {
    try {
      setIsEnding(true);
      setErrorMessage("");
      await endSession();
      navigation.replace("TeacherDashboard");
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Could not end the attendance session."
      );
    } finally {
      setIsEnding(false);
    }
  }

  async function handleShareQr() {
    if (isSharing || !qrRef.current) {
      return;
    }

    try {
      setIsSharing(true);
      setErrorMessage("");

      qrRef.current.toDataURL(async (dataURL) => {
        try {
          const tempFilePath = `${FileSystem.cacheDirectory}session_qr.png`;
          await FileSystem.writeAsStringAsync(tempFilePath, dataURL, {
            encoding: FileSystem.EncodingType.Base64,
          });

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(tempFilePath, {
              mimeType: "image/png",
              dialogTitle: "Share Session QR",
              UTI: "public.png",
            });
          } else {
            setErrorMessage("Sharing is not available on this device.");
          }
        } catch (error) {
          setErrorMessage("Failed to generate and share QR code.");
          console.error(error);
        } finally {
          setIsSharing(false);
        }
      });
    } catch (error) {
      setErrorMessage("Could not capture the QR code image.");
      setIsSharing(false);
      console.error(error);
    }
  }

  const qrPayload = useMemo(() => {
    if (!session?.id || !qrData?.nonce) {
      return "";
    }

    return JSON.stringify({
      sessionId: session.id,
      sessionCode: session.sessionCode,
      nonce: qrData.nonce,
    });
  }, [qrData?.nonce, session?.id, session?.sessionCode]);

  const progressWidth = progressAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const isExpiryWarning = countdown <= 5;

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={styles.errorText}>No active session found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{session.course?.name ?? "Active Session"}</Text>
        <Text style={styles.subtitle}>
          Section {session.course?.section ?? "N/A"}
        </Text>

        <View style={styles.qrWrapper}>
          {qrData ? (
            <QRCode value={qrPayload} size={280} getRef={(c) => (qrRef.current = c)} />
          ) : (
            <ActivityIndicator size="large" color={COLORS.primary} />
          )}
        </View>

        <Text style={styles.codeLabel}>Session Code</Text>
        <Text style={styles.codeValue}>{session.sessionCode}</Text>

        <Text
          style={[
            styles.countdownText,
            isExpiryWarning && styles.countdownWarning,
          ]}
        >
          Refreshing in {countdown}s
        </Text>

        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressBar,
              isExpiryWarning && styles.progressBarWarning,
              { width: progressWidth },
            ]}
          />
        </View>

        {isRefreshingQr ? (
          <Text style={styles.refreshText}>Refreshing QR...</Text>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.secondaryButton, (isSharing || isEnding) && styles.buttonDisabled, { marginBottom: 12 }]}
            onPress={handleShareQr}
            disabled={isSharing || isEnding}
          >
            {isSharing ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <Text style={styles.secondaryButtonText}>Share QR Code</Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.primaryButton, (isEnding || isSharing) && styles.buttonDisabled]}
            onPress={handleEndSession}
            disabled={isEnding || isSharing}
          >
            {isEnding ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>End Session</Text>
            )}

          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    backgroundColor: COLORS.background,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: COLORS.background,
  },
  qrWrapper: {
    width: 320,
    height: 320,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.qrSurface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.qrBorder,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: {
    fontSize: 26,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: TYPOGRAPHY.heading.fontWeight,
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  codeLabel: {
    color: "#64748b",
    fontSize: 14,
    marginBottom: 4,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  codeValue: {
    color: COLORS.primary,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 4,
    marginBottom: 12,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
  },
  countdownText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  countdownWarning: {
    color: COLORS.error,
  },
  progressTrack: {
    width: "100%",
    height: 8,
    backgroundColor: "#eff6ff",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressBar: {
    height: "100%",
    backgroundColor: COLORS.timerActive,
    borderRadius: 999,
  },
  progressBarWarning: {
    backgroundColor: COLORS.error,
  },
  refreshText: {
    marginTop: 10,
    color: "#64748b",
    fontSize: 13,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  errorText: {
    marginVertical: 12,
    color: COLORS.error,
    textAlign: "center",
    lineHeight: 20,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  buttonContainer: {
    width: "100%",
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: COLORS.error,
    borderRadius: LAYOUT.buttonRadius,
    height: LAYOUT.buttonHeight,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.buttonRadius,
    height: LAYOUT.buttonHeight,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "700",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
