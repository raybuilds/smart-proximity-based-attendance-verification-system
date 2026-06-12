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
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import { endSession, getActiveSession } from "../services/attendance";
import { getCurrentQR } from "../services/qr";
import EligibilityChips from "../components/EligibilityChips";
import { getSessionEligibility } from "../utils/eligibility";
import { COLORS, TYPOGRAPHY, LAYOUT } from "../utils/theme";

const QR_LIFETIME_SECONDS = 15;

export default function ActiveSessionScreen({ navigation, route }) {
  const [session, setSession] = useState(route.params?.session || null);
  const [isLoading, setIsLoading] = useState(!route.params?.session);
  const [isEnding, setIsEnding] = useState(false);
  const [isRefreshingQr, setIsRefreshingQr] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [qrData, setQrData] = useState(null);
  const [countdown, setCountdown] = useState(QR_LIFETIME_SECONDS);
  const progressAnimation = useRef(new Animated.Value(1)).current;
  const isFetchingQrRef = useRef(false);
  const qrRef = useRef(null);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    async function loadSession() {
      if (session) {
        return;
      }

      try {
        const response = await getActiveSession();

        if (!response.session) {
          navigation.replace("TeacherDashboard");
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
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={true}>
        <View style={styles.card}>
          <Text style={styles.title}>Active Session</Text>
          <Text style={styles.subtitle}>
            Share this session code with students to mark attendance later.
          </Text>

          <View style={styles.qrCard}>
            <View style={styles.courseContainer}>
              <Text style={styles.courseLabel}>Course</Text>
              <Text style={styles.courseValue}>
                {session.course?.name ?? "Not Assigned"}
              </Text>
              <View style={{ marginTop: 8, alignItems: "center" }}>
                <Text style={styles.eligibilityLabel}>Eligible Students:</Text>
                <EligibilityChips eligibility={getSessionEligibility(session)} />
              </View>
            </View>

            <Text style={styles.qrTitle}>Live QR</Text>
            <View style={styles.qrWrapper}>
              {qrData ? (
                <QRCode value={qrPayload} size={220} getRef={(c) => (qrRef.current = c)} />
              ) : (
                <ActivityIndicator size="large" color="#0f172a" />
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
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Status: {session.isActive ? "Active" : "Inactive"}</Text>
            <Text style={styles.infoText}>
              Started: {new Date(session.startedAt).toLocaleString()}
            </Text>
            {qrData ? (
              <Text style={styles.infoText}>
                Expires: {new Date(qrData.expiresAt).toLocaleTimeString()}
              </Text>
            ) : null}
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <Pressable
            style={[styles.secondaryButton, (isSharing || isEnding) && styles.buttonDisabled, { marginBottom: 12 }]}
            onPress={handleShareQr}
            disabled={isSharing || isEnding}
          >
            {isSharing ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.secondaryButtonText}>Share QR</Text>
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
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 60,
    backgroundColor: COLORS.background,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  courseContainer: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: LAYOUT.inputRadius,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  courseLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  courseValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
  },
  eligibilityLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 4,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  qrCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: LAYOUT.cardRadius,
    padding: 20,
    alignItems: "center",
    marginBottom: 18,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
  },
  qrWrapper: {
    width: 240,
    height: 240,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.qrSurface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.qrBorder,
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: TYPOGRAPHY.heading.fontWeight,
    color: COLORS.primary,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 10,
    marginBottom: 20,
    textAlign: "center",
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  codeLabel: {
    color: "#64748b",
    fontSize: 14,
    marginBottom: 8,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  codeValue: {
    color: COLORS.primary,
    fontSize: 32,
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
    height: 10,
    backgroundColor: "#eff6ff",
    borderRadius: 999,
    overflow: "hidden",
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
  infoBox: {
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.cardRadius,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoText: {
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 6,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  errorText: {
    marginBottom: 12,
    color: COLORS.error,
    textAlign: "center",
    lineHeight: 20,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  primaryButton: {
    backgroundColor: COLORS.error,
    borderRadius: LAYOUT.buttonRadius,
    height: LAYOUT.buttonHeight,
    justifyContent: "center",
    alignItems: "center",
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
    backgroundColor: "transparent",
    borderRadius: LAYOUT.buttonRadius,
    height: LAYOUT.buttonHeight,
    justifyContent: "center",
    alignItems: "center",
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
