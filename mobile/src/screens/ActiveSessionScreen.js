import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
import { useFocusEffect } from "@react-navigation/native";
import {
  Clock,
  QrCode,
  StopCircle,
  Share2,
  AlertCircle,
  Users,
  CheckCircle,
  Activity,
  Wifi,
} from "lucide-react-native";

import { endSession, getActiveSession, getActiveSessionStats } from "../services/attendance";
import { getCurrentQR } from "../services/qr";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BUTTON_VARIANTS, BADGES, LAYOUT, FONTS } from "../utils/theme";

const QR_LIFETIME_SECONDS = 30;

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

  // Stats state
  const [stats, setStats] = useState({
    markedCount: 0,
    expectedCount: 0,
    verifiedCount: 0,
    recentCheckIns: [],
    networkConsistency: null,
  });

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

  // Focus-dependent live stats polling
  useFocusEffect(
    useCallback(() => {
      if (!session?.id) return;

      async function fetchStats() {
        try {
          const data = await getActiveSessionStats();
          if (data) {
            setStats({
              markedCount: data.attendanceMarked || 0,
              expectedCount: data.enrolledCount || 0,
              verifiedCount: data.verificationSummary?.Verified || 0,
              recentCheckIns: data.recentCheckIns || [],
              networkConsistency: data.networkConsistency || null,
            });
          }
        } catch (err) {
          console.error("Error polling stats:", err);
        }
      }

      fetchStats();
      const interval = setInterval(fetchStats, 5000);

      return () => {
        clearInterval(interval);
      };
    }, [session?.id])
  );

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
        <ActivityIndicator size="large" color={COLORS.primary} />
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
        
        {/* Live Session Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroTitleGroup}>
              <Text style={styles.heroCourseName}>{session.course?.name ?? "Live Attendance Session"}</Text>
              <Text style={styles.heroCourseCode}>
                Section {session.course?.section ?? "N/A"} • Code: {session.sessionCode}
              </Text>
            </View>
            <View style={[styles.liveBadge, BADGES.success]}>
              <View style={styles.pulseDot} />
              <Text style={[styles.liveBadgeText, { color: COLORS.success }]}>ACTIVE</Text>
            </View>
          </View>
          <View style={styles.dividerLine} />
          <View style={styles.heroRatioRow}>
            <View style={styles.heroRatioCol}>
              <Clock size={16} color={COLORS.warning} style={styles.heroRatioIcon} />
              <Text style={styles.heroRatioValue}>{countdown}s</Text>
              <Text style={styles.heroRatioLabel}>Next QR Rotation</Text>
            </View>
          </View>
        </View>

        {/* Live Attendance Dashboard Section */}
        <View style={styles.dashboardGrid}>
          {/* Card 1: Attendance Marked */}
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Users size={16} color={COLORS.primary} />
              <Text style={styles.statTitle}>Marked</Text>
            </View>
            <Text style={styles.statValue}>
              {stats.markedCount} <Text style={styles.statTotal}>/ {stats.expectedCount}</Text>
            </Text>
            <Text style={styles.statSubText}>Students present</Text>
          </View>

          {/* Card 2: Verification Status */}
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <CheckCircle size={16} color={COLORS.success} />
              <Text style={styles.statTitle}>Verified</Text>
            </View>
            <Text style={[styles.statValue, { color: COLORS.success }]}>
              {stats.verifiedCount}
            </Text>
            <Text style={styles.statSubText}>Network validated</Text>
          </View>
        </View>

        {/* Network Consistency Audit Card */}
        {stats.networkConsistency ? (
          <View style={styles.feedCard}>
            <View style={styles.feedHeader}>
              <Wifi size={16} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.feedTitle}>Network Consistency Audit</Text>
              <View style={[
                styles.riskBadge,
                stats.networkConsistency.riskLevel === "HIGH" ? BADGES.error :
                stats.networkConsistency.riskLevel === "MEDIUM" ? BADGES.warning : BADGES.success,
                { marginLeft: "auto", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }
              ]}>
                <Text style={styles.riskBadgeText}>
                  {stats.networkConsistency.riskLevel} RISK
                </Text>
              </View>
            </View>
            <View style={styles.dividerLine} />
            <View style={styles.consistencyGrid}>
              <View style={styles.consistencyItem}>
                <Text style={styles.consistencyLabel}>Dominant BSSID</Text>
                <Text style={styles.consistencyValue}>{stats.networkConsistency.dominantBssid}</Text>
              </View>
              <View style={styles.consistencyItem}>
                <Text style={styles.consistencyLabel}>Mismatches</Text>
                <Text style={[styles.consistencyValue, stats.networkConsistency.mismatchCount > 0 && { color: COLORS.error }]}>
                  {stats.networkConsistency.mismatchCount}
                </Text>
              </View>
              <View style={styles.consistencyItem}>
                <Text style={styles.consistencyLabel}>Missing BSSID</Text>
                <Text style={styles.consistencyValue}>{stats.networkConsistency.nullBssidCount}</Text>
              </View>
              <View style={styles.consistencyItem}>
                <Text style={styles.consistencyLabel}>Valid BSSID</Text>
                <Text style={styles.consistencyValue}>{stats.networkConsistency.validBssidCount}</Text>
              </View>
            </View>

            <View style={[styles.dividerLine, { marginVertical: SPACING.md }]} />
            <Text style={[styles.feedTitle, { fontSize: TYPOGRAPHY.sizes.body, marginBottom: SPACING.xs }]}>Signal Calibration Reference</Text>
            
            <View style={styles.consistencyGrid}>
              <View style={styles.consistencyItem}>
                <Text style={styles.consistencyLabel}>Expected Signal</Text>
                <Text style={styles.consistencyValue}>
                  {stats.networkConsistency.expectedRssi !== null && stats.networkConsistency.expectedRssi !== undefined ? `${stats.networkConsistency.expectedRssi} dBm` : "N/A"}
                </Text>
              </View>
              <View style={styles.consistencyItem}>
                <Text style={styles.consistencyLabel}>Avg Observed</Text>
                <Text style={styles.consistencyValue}>
                  {stats.networkConsistency.averageRssi !== null && stats.networkConsistency.averageRssi !== undefined ? `${stats.networkConsistency.averageRssi} dBm` : "N/A"}
                </Text>
              </View>
              <View style={styles.consistencyItem}>
                <Text style={styles.consistencyLabel}>Strongest / Weakest</Text>
                <Text style={styles.consistencyValue}>
                  {stats.networkConsistency.strongestRssi !== null && stats.networkConsistency.strongestRssi !== undefined ? `${stats.networkConsistency.strongestRssi}` : "N/A"} / {stats.networkConsistency.weakestRssi !== null && stats.networkConsistency.weakestRssi !== undefined ? `${stats.networkConsistency.weakestRssi}` : "N/A"}
                </Text>
              </View>
              <View style={styles.consistencyItem}>
                <Text style={styles.consistencyLabel}>Signal Variance</Text>
                <Text style={[
                  styles.consistencyValue,
                  (stats.networkConsistency.rssiVariance !== null && stats.networkConsistency.rssiVariance !== undefined && stats.networkConsistency.rssiVariance > 0) ? { color: COLORS.success } :
                  (stats.networkConsistency.rssiVariance !== null && stats.networkConsistency.rssiVariance !== undefined && stats.networkConsistency.rssiVariance < 0) ? { color: COLORS.error } : null
                ]}>
                  {stats.networkConsistency.rssiVariance !== null && stats.networkConsistency.rssiVariance !== undefined ? (stats.networkConsistency.rssiVariance >= 0 ? `+${stats.networkConsistency.rssiVariance} dB` : `${stats.networkConsistency.rssiVariance} dB`) : "N/A"}
                </Text>
              </View>
            </View>

            <Text style={styles.consistencySubtext}>
              Note: Network consistency and signal calibration metrics are advisory only. BSSID or RSSI variance does not block attendance check-ins.
            </Text>
          </View>
        ) : null}

        {/* Card 3: Recent Check-ins */}
        <View style={styles.feedCard}>
          <View style={styles.feedHeader}>
            <Activity size={16} color={COLORS.primary} />
            <Text style={styles.feedTitle}>Live Check-in Feed</Text>
          </View>
          <View style={styles.dividerLine} />
          {stats.recentCheckIns.length === 0 ? (
            <Text style={styles.feedEmptyText}>Waiting for check-ins...</Text>
          ) : (
            stats.recentCheckIns.map((checkIn, index) => {
              return (
                <View key={checkIn.id || index.toString()} style={styles.feedRow}>
                  <View style={styles.feedStudentInfo}>
                    <Text style={styles.feedRollNumber}>{checkIn.rollNumber || "N/A"}</Text>
                    <Text style={styles.feedStudentName} numberOfLines={1}>
                      {checkIn.name || "Unknown"}
                    </Text>
                  </View>
                  <Text style={styles.feedTime}>{checkIn.timestamp || "N/A"}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* QR Code Container */}
        <View style={styles.qrCard}>
          <View style={styles.qrWrapper}>
            {qrData ? (
              <QRCode value={qrPayload} size={240} getRef={(c) => (qrRef.current = c)} />
            ) : (
              <ActivityIndicator size="large" color={COLORS.primary} />
            )}
          </View>
          
          <Text style={styles.codeLabel}>Rotation Verification Code</Text>
          <Text style={styles.codeValue}>{session.sessionCode}</Text>

          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                isExpiryWarning && styles.progressBarWarning,
                { width: progressWidth },
              ]}
            />
          </View>
          <Text style={[styles.countdownText, isExpiryWarning && styles.countdownWarning]}>
            QR refreshes automatically in {countdown} seconds
          </Text>
        </View>

        {isRefreshingQr ? (
          <Text style={styles.refreshText}>Generating rotating token...</Text>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.secondaryButton, (isSharing || isEnding) && styles.buttonDisabled]}
            onPress={handleShareQr}
            disabled={isSharing || isEnding}
          >
            {isSharing ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <>
                <Share2 size={18} color={COLORS.primary} style={styles.btnIcon} />
                <Text style={styles.secondaryButtonText}>Share QR Code</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.primaryButton, (isEnding || isSharing) && styles.buttonDisabled]}
            onPress={handleEndSession}
            disabled={isEnding || isSharing}
          >
            {isEnding ? (
              <ActivityIndicator color={COLORS.textInverse} />
            ) : (
              <>
                <StopCircle size={18} color={COLORS.textInverse} style={styles.btnIcon} />
                <Text style={styles.primaryButtonText}>Stop Attendance Session</Text>
              </>
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
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.base,
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.base,
    ...SHADOWS.sm,
  },
  heroHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroTitleGroup: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  heroCourseName: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontFamily: FONTS.heading,
    fontWeight: "bold",
    color: COLORS.text,
  },
  heroCourseCode: {
    fontSize: TYPOGRAPHY.sizes.metadata,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.success,
    marginRight: 4,
  },
  liveBadgeText: {
    fontSize: TYPOGRAPHY.sizes.micro,
    fontFamily: FONTS.body,
    fontWeight: "bold",
  },
  dividerLine: {
    height: 1,
    backgroundColor: COLORS.borderSubtle,
    marginVertical: SPACING.sm,
  },
  heroRatioRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  heroRatioCol: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  heroRatioIcon: {
    marginRight: SPACING.xs,
  },
  heroRatioValue: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: FONTS.body,
  },
  heroRatioLabel: {
    fontSize: TYPOGRAPHY.sizes.micro,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    marginLeft: 4,
  },
  qrCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.base,
    ...SHADOWS.sm,
  },
  qrWrapper: {
    width: 260,
    height: 260,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: SPACING.sm,
    ...SHADOWS.xs,
  },
  codeLabel: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.label,
    fontFamily: FONTS.body,
    marginTop: SPACING.xs,
  },
  codeValue: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sizes.cardMetric + 6,
    fontWeight: "800",
    letterSpacing: 4,
    marginBottom: SPACING.xs,
    fontFamily: FONTS.heading,
  },
  countdownText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.metadata,
    fontFamily: FONTS.body,
  },
  countdownWarning: {
    color: COLORS.error,
    fontWeight: "600",
  },
  progressTrack: {
    width: "80%",
    height: 6,
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: RADIUS.full,
    overflow: "hidden",
    marginVertical: SPACING.sm,
  },
  progressBar: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  progressBarWarning: {
    backgroundColor: COLORS.error,
  },
  refreshText: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.metadata,
    fontFamily: FONTS.body,
    marginBottom: SPACING.xs,
  },
  errorText: {
    marginVertical: SPACING.xs,
    color: COLORS.error,
    textAlign: "center",
    lineHeight: 20,
    fontFamily: FONTS.body,
  },
  buttonContainer: {
    width: "100%",
    marginBottom: SPACING.base,
  },
  primaryButton: {
    ...BUTTON_VARIANTS.danger,
    width: "100%",
    marginTop: SPACING.sm,
  },
  primaryButtonText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "700",
    fontFamily: FONTS.body,
    marginLeft: 6,
  },
  secondaryButton: {
    ...BUTTON_VARIANTS.secondary,
    width: "100%",
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "700",
    fontFamily: FONTS.body,
    marginLeft: 6,
  },
  btnIcon: {
    marginRight: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  dashboardGrid: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.base,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  statTitle: {
    fontSize: TYPOGRAPHY.sizes.label,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontWeight: "600",
  },
  statValue: {
    fontSize: TYPOGRAPHY.sizes.cardMetricSm,
    fontFamily: FONTS.heading,
    fontWeight: "bold",
    color: COLORS.primary,
    marginVertical: 2,
  },
  statTotal: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.textSecondary,
    fontWeight: "normal",
  },
  statSubText: {
    fontSize: TYPOGRAPHY.sizes.micro,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
  },
  feedCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.base,
    ...SHADOWS.sm,
  },
  feedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  feedTitle: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "bold",
    color: COLORS.primary,
    fontFamily: FONTS.heading,
  },
  feedEmptyText: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontFamily: FONTS.body,
    paddingVertical: SPACING.md,
  },
  feedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  feedStudentInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  feedRollNumber: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    width: 70,
  },
  feedStudentName: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: FONTS.body,
  },
  feedTime: {
    fontSize: TYPOGRAPHY.sizes.metadata,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
  },
  consistencyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  consistencyItem: {
    width: "48%",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: "center",
  },
  consistencyLabel: {
    fontSize: TYPOGRAPHY.sizes.metadata,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  consistencyValue: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: FONTS.body,
  },
  consistencySubtext: {
    fontSize: TYPOGRAPHY.sizes.metadata,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    marginTop: SPACING.md,
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 16,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  riskBadgeText: {
    fontSize: TYPOGRAPHY.sizes.micro,
    fontWeight: "bold",
    color: COLORS.textInverse,
  },
});
