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
          navigation.replace("StartSession");
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
      navigation.replace("StartSession");
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
    backgroundColor: "#f8fafc",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 60,
    backgroundColor: "#f8fafc",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  qrCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 18,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 16,
  },
  qrWrapper: {
    width: 240,
    height: 240,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
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
    marginBottom: 20,
    textAlign: "center",
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
  },
  codeLabel: {
    color: "#64748b",
    fontSize: 14,
    marginBottom: 8,
  },
  codeValue: {
    color: "#0f172a",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 4,
    marginBottom: 12,
  },
  countdownText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
  },
  countdownWarning: {
    color: "#dc2626",
  },
  progressTrack: {
    width: "100%",
    height: 10,
    backgroundColor: "#dbeafe",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#0f172a",
    borderRadius: 999,
  },
  progressBarWarning: {
    backgroundColor: "#dc2626",
  },
  refreshText: {
    marginTop: 10,
    color: "#64748b",
    fontSize: 13,
  },
  infoBox: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
  },
  infoText: {
    color: "#1e293b",
    fontSize: 15,
    marginBottom: 6,
  },
  errorText: {
    marginBottom: 12,
    color: "#dc2626",
    textAlign: "center",
    lineHeight: 20,
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
    borderWidth: 1,
    borderColor: "#0f172a",
    backgroundColor: "transparent",
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
