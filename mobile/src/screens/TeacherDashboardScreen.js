import React, { useCallback, useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Alert,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { getTeacherOverview } from "../services/reports";
import { useAuth } from "../context/AuthContext";
import { getActiveSession } from "../services/attendance";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BUTTON_VARIANTS, BADGES, LAYOUT, FONTS } from "../utils/theme";
import {
  BookOpen,
  Activity,
  PlayCircle,
  FileText,
  Settings,
  AlertCircle,
  LogOut,
  Clock,
  Users,
  BookMarked,
  BarChart2,
  AlertTriangle,
  Edit3,
  Award,
  ChevronRight,
} from "lucide-react-native";

export default function TeacherDashboardScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [overview, setOverview] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);
  const [nowTime, setNowTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  function getStartedAgoText(startedAtStr) {
    if (!startedAtStr) return "";
    const startedAt = new Date(startedAtStr);
    const diffMs = nowTime - startedAt;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) {
      return "Started just now";
    } else if (diffMins < 60) {
      return `Started ${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      const remainingMins = diffMins % 60;
      if (remainingMins === 0) {
        return `Started ${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
      }
      return `Started ${diffHours} hr${diffHours > 1 ? "s" : ""} ${remainingMins} min${remainingMins > 1 ? "s" : ""} ago`;
    }
  }

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const loadDashboardData = useCallback(async (options = {}) => {
    if (__DEV__) console.log('[Dashboard] loadDashboardData entered');
    const { isPull = false } = options;

    if (isLoading || refreshing) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Load from cache first for immediate responsiveness
    const cacheKey = `cache_teacher_overview_${user?.id}`;
    if (!isPull && !overview) {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached && isMountedRef.current) {
          setOverview(JSON.parse(cached));
        }
      } catch (cacheErr) {
        if (__DEV__) console.log("Failed to load teacher overview cache:", cacheErr);
      }
    }

    if (isPull) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage("");

    try {
      const [sessionResponse, overviewResponse] = await Promise.all([
        getActiveSession({ signal }),
        getTeacherOverview({ signal }),
      ]);

      if (isMountedRef.current) {
        setOverview(overviewResponse.data);
        setActiveSession(sessionResponse.session);

        // Store success response in cache
        await AsyncStorage.setItem(cacheKey, JSON.stringify(overviewResponse.data));

        if (sessionResponse.session) {
          navigation.replace('ActiveSession', {
            session: sessionResponse.session,
          });
        }
      }
    } catch (error) {
      if (isMountedRef.current && error.name !== "CanceledError" && error.name !== "AbortError") {
        setErrorMessage(
          error.response?.data?.message ||
            "Could not load dashboard information."
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setRefreshing(false);
      }
    }
  }, [navigation, user]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  function handleActiveSessionPress() {
    if (activeSession) {
      navigation.navigate("ActiveSession", { session: activeSession });
    } else {
      Alert.alert("No Active Session", "There is currently no active attendance session running.");
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadDashboardData({ isPull: true })}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
        />
      }
    >
      {/* Welcome Header */}
      <View style={styles.headerSection}>
        <View style={styles.headerIconWrap}>
          <BookOpen size={28} color={COLORS.primary} strokeWidth={1.8} />
        </View>
        <Text style={styles.screenTitle}>Teaching Command Center</Text>
        <Text style={styles.welcomeSubtitle}>
          Welcome, {user?.name || "Teacher"}
        </Text>
        <Text style={styles.welcomeCaption}>
          Manage your courses and attendance sessions
        </Text>
      </View>

      {/* Active Session Card */}
      {overview?.activeSession ? (
        <Pressable
          style={styles.activeSessionCard}
          onPress={handleActiveSessionPress}
        >
          <View style={styles.activeSessionAccent} />
          <View style={styles.activeSessionBody}>
            <View style={styles.activeSessionHeader}>
              <View style={styles.activeSessionTitleRow}>
                <Activity size={18} color={COLORS.primary} strokeWidth={2} />
                <Text style={styles.activeSessionTitle}>Live Session Active</Text>
              </View>
              <View style={[styles.liveBadge, BADGES.success]}>
                <View style={styles.pulseDot} />
                <Text style={[styles.liveBadgeText, { color: COLORS.success }]}>LIVE</Text>
              </View>
            </View>

            <Text style={styles.activeSessionCourse}>
              {overview.activeSession.courseName}
            </Text>
            <Text style={styles.activeSessionCode}>
              {overview.activeSession.courseCode}
            </Text>

            <View style={styles.activeSessionMeta}>
              <View style={styles.activeSessionMetaItem}>
                <Users size={14} color={COLORS.textSecondary} strokeWidth={1.8} />
                <Text style={styles.activeSessionMetaText}>
                  {overview.activeSession.presentCount} / {overview.activeSession.eligibleCount} Present
                </Text>
              </View>
              <View style={styles.activeSessionMetaItem}>
                <Clock size={14} color={COLORS.textSecondary} strokeWidth={1.8} />
                <Text style={styles.activeSessionMetaText}>
                  {getStartedAgoText(overview.activeSession.startedAt)}
                </Text>
              </View>
            </View>

            <View style={styles.activeSessionFooter}>
              <Text style={styles.activeSessionLink}>
                Tap to view QR / Monitor attendance
              </Text>
              <ChevronRight size={16} color={COLORS.primary} strokeWidth={2} />
            </View>
          </View>
        </Pressable>
      ) : (
        <View style={styles.inactiveSessionCard}>
          <View style={styles.inactiveSessionIconWrap}>
            <Activity size={20} color={COLORS.textSecondary} strokeWidth={1.8} />
          </View>
          <Text style={styles.inactiveSessionText}>No active session running</Text>
        </View>
      )}

      {/* Error Card */}
      {errorMessage ? (
        <View style={styles.errorCard}>
          <AlertCircle size={20} color={COLORS.error} strokeWidth={1.8} />
          <View style={styles.errorCardContent}>
            <Text style={styles.errorTitleText}>Unable to load data</Text>
            <Text style={styles.errorMessageText}>{errorMessage}</Text>
          </View>
          <Pressable
            style={[
              styles.retryButton,
              (isLoading || refreshing) && styles.buttonDisabled,
            ]}
            onPress={() => loadDashboardData()}
            disabled={isLoading || refreshing}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Primary Action */}
      <Pressable
        style={styles.primaryButton}
        onPress={() => navigation.navigate("StartSession")}
      >
        <PlayCircle size={20} color={COLORS.textInverse} strokeWidth={2} />
        <Text style={styles.primaryButtonText}>Start Attendance Session</Text>
      </Pressable>

      {/* Secondary Actions */}
      <View style={styles.navigationSection}>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("TeacherReports")}
        >
          <FileText size={18} color={COLORS.primary} strokeWidth={1.8} />
          <Text style={styles.secondaryButtonText}>Attendance Records & Reports</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("CourseManagement")}
        >
          <Settings size={18} color={COLORS.primary} strokeWidth={1.8} />
          <Text style={styles.secondaryButtonText}>Manage Courses & Sections</Text>
        </Pressable>
      </View>

      {/* Teaching Statistics */}
      {isLoading && !overview ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loaderText}>Loading statistics...</Text>
        </View>
      ) : overview ? (
        <View style={styles.statsSection}>
          <Text style={styles.statsSectionTitle}>My Teaching Statistics</Text>
          <View style={styles.statsGrid}>

            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <BookMarked size={16} color={COLORS.primary} strokeWidth={1.8} />
              </View>
              <Text style={styles.statLabel}>My Courses</Text>
              <Text style={styles.statValue}>{overview.totalCourses}</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <Users size={16} color={COLORS.primary} strokeWidth={1.8} />
              </View>
              <Text style={styles.statLabel}>My Students</Text>
              <Text style={styles.statValue}>{overview.totalStudents}</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <Activity size={16} color={COLORS.primary} strokeWidth={1.8} />
              </View>
              <Text style={styles.statLabel}>Sessions Conducted</Text>
              <Text style={styles.statValue}>{overview.totalSessions}</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <BarChart2 size={16} color={COLORS.success} strokeWidth={1.8} />
              </View>
              <Text style={styles.statLabel}>Average Attendance</Text>
              <Text style={[styles.statValue, styles.statValueGreen]}>
                {overview.attendancePercentage}%
              </Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconWrap, overview.atRiskStudents > 0 && styles.statIconWrapError]}>
                <AlertTriangle
                  size={16}
                  color={overview.atRiskStudents > 0 ? COLORS.error : COLORS.primary}
                  strokeWidth={1.8}
                />
              </View>
              <Text style={styles.statLabel}>At-Risk Students</Text>
              <Text style={[
                styles.statValue,
                overview.atRiskStudents > 0 && styles.statValueError,
              ]}>
                {overview.atRiskStudents}
              </Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <Edit3 size={16} color={COLORS.primary} strokeWidth={1.8} />
              </View>
              <Text style={styles.statLabel}>Manual Corrections</Text>
              <Text style={styles.statValue}>{overview.manualCorrections}</Text>
            </View>

            <View style={[styles.statCard, styles.statCardFull]}>
              <View style={styles.statCardFullInner}>
                <View style={styles.statIconWrap}>
                  <Award size={16} color={COLORS.warning} strokeWidth={1.8} />
                </View>
                <Text style={styles.statLabel}>Best Course</Text>
              </View>
              {overview.bestCourse ? (
                <View style={styles.bestCourseDetails}>
                  <Text style={styles.bestCourseName}>{overview.bestCourse.name}</Text>
                  <View style={styles.bestCourseMeta}>
                    <Text style={styles.bestCourseCode}>{overview.bestCourse.code}</Text>
                    <View style={[styles.bestCoursePercentBadge, BADGES.success]}>
                      <Text style={[styles.bestCoursePercent, { color: COLORS.success }]}>
                        {overview.bestCourse.attendancePercentage}%
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <Text style={styles.statValue}>N/A</Text>
              )}
            </View>

          </View>
        </View>
      ) : null}

      {/* Logout */}
      <Pressable style={styles.logoutButton} onPress={signOut}>
        <LogOut size={18} color={COLORS.textInverse} strokeWidth={2} />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
    backgroundColor: COLORS.background,
  },

  /* Header */
  headerSection: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  headerIconWrap: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  screenTitle: {
    fontFamily: FONTS.heading,
    fontWeight: "bold",
    fontSize: TYPOGRAPHY.sizes.screenTitle,
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  welcomeSubtitle: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: 2,
  },
  welcomeCaption: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  /* Active Session Card */
  activeSessionCard: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.base,
    overflow: "hidden",
    ...SHADOWS.md,
  },
  activeSessionAccent: {
    width: 4,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: RADIUS.lg,
    borderBottomLeftRadius: RADIUS.lg,
  },
  activeSessionBody: {
    flex: 1,
    padding: LAYOUT.cardPadding,
  },
  activeSessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  activeSessionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  activeSessionTitle: {
    fontFamily: FONTS.heading,
    fontWeight: "700",
    fontSize: TYPOGRAPHY.sizes.sectionTitle,
    color: COLORS.primary,
    marginLeft: 6,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.success,
    marginRight: 5,
  },
  liveBadgeText: {
    fontFamily: FONTS.body,
    fontWeight: "700",
    fontSize: TYPOGRAPHY.sizes.micro,
    letterSpacing: 0.8,
  },
  activeSessionCourse: {
    fontFamily: FONTS.body,
    fontWeight: "600",
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    color: COLORS.text,
    marginBottom: 2,
  },
  activeSessionCode: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.sizes.label,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  activeSessionMeta: {
    flexDirection: "row",
    marginBottom: SPACING.sm,
  },
  activeSessionMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  activeSessionMetaText: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.sizes.label,
    color: COLORS.textSecondary,
    marginLeft: 5,
  },
  activeSessionFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  activeSessionLink: {
    fontFamily: FONTS.body,
    fontWeight: "600",
    fontSize: TYPOGRAPHY.sizes.label,
    color: COLORS.primary,
  },

  /* Inactive Session */
  inactiveSessionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    ...SHADOWS.xs,
  },
  inactiveSessionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.backgroundAlt,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  inactiveSessionText: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.textSecondary,
  },

  /* Error Card */
  errorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.errorLight,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.error,
    padding: LAYOUT.cardPadding,
    marginBottom: SPACING.base,
  },
  errorCardContent: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  errorTitleText: {
    fontFamily: FONTS.heading,
    fontWeight: "700",
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    color: COLORS.error,
    marginBottom: 2,
  },
  errorMessageText: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.error,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  retryButtonText: {
    fontFamily: FONTS.body,
    fontWeight: "700",
    fontSize: TYPOGRAPHY.sizes.label,
    color: COLORS.textInverse,
  },

  /* Buttons */
  primaryButton: {
    ...BUTTON_VARIANTS.primary,
    marginBottom: SPACING.base,
    ...SHADOWS.sm,
  },
  primaryButtonText: {
    fontFamily: FONTS.body,
    fontWeight: "700",
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    color: COLORS.textInverse,
    marginLeft: 8,
  },
  navigationSection: {
    marginBottom: SPACING.xl,
  },
  secondaryButton: {
    ...BUTTON_VARIANTS.secondary,
    marginBottom: SPACING.sm,
    ...SHADOWS.xs,
  },
  secondaryButtonText: {
    fontFamily: FONTS.body,
    fontWeight: "700",
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    color: COLORS.primary,
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  /* Stats */
  statsSection: {
    marginBottom: SPACING.xl,
  },
  statsSectionTitle: {
    fontFamily: FONTS.heading,
    fontWeight: "700",
    fontSize: TYPOGRAPHY.sizes.sectionTitle,
    color: COLORS.text,
    marginBottom: SPACING.base,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: LAYOUT.cardPadding,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  statCardFull: {
    width: "100%",
  },
  statCardFullInner: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  statIconWrapError: {
    backgroundColor: COLORS.errorLight,
  },
  statLabel: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.sizes.metadata,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    fontWeight: "500",
  },
  statValue: {
    fontFamily: FONTS.heading,
    fontWeight: "bold",
    fontSize: TYPOGRAPHY.sizes.cardMetric,
    color: COLORS.text,
  },
  statValueGreen: {
    color: COLORS.success,
  },
  statValueError: {
    color: COLORS.error,
  },

  /* Best Course */
  bestCourseDetails: {
    marginTop: 2,
  },
  bestCourseName: {
    fontFamily: FONTS.heading,
    fontWeight: "bold",
    fontSize: TYPOGRAPHY.sizes.cardMetricSm + 2,
    color: COLORS.text,
    marginBottom: 4,
  },
  bestCourseMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  bestCourseCode: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.sizes.label,
    color: COLORS.textSecondary,
    fontWeight: "500",
    marginRight: 8,
  },
  bestCoursePercentBadge: {
    borderRadius: RADIUS.xxl,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  bestCoursePercent: {
    fontFamily: FONTS.body,
    fontWeight: "700",
    fontSize: TYPOGRAPHY.sizes.label,
  },

  /* Loader */
  loaderBox: {
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  loaderText: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.textSecondary,
  },

  /* Logout */
  logoutButton: {
    ...BUTTON_VARIANTS.danger,
    ...SHADOWS.xs,
  },
  logoutButtonText: {
    fontFamily: FONTS.body,
    fontWeight: "700",
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    color: COLORS.textInverse,
    marginLeft: 8,
  },
});
