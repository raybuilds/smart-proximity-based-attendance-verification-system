import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  GraduationCap,
  Camera,
  BookOpen,
  User,
  LogOut,
  ShieldCheck,
  CheckCircle,
  XCircle,
  CalendarDays,
  Shield,
  Clock,
} from "lucide-react-native";

import { useAuth } from "../context/AuthContext";
import { getProtectedProfile } from "../services/auth";
import { getStudentSelfReport, getStudentCourses } from "../services/reports";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BUTTON_VARIANTS, BADGES, LAYOUT, FONTS } from "../utils/theme";

export default function DashboardScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [protectedMessage, setProtectedMessage] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [coursesReport, setCoursesReport] = useState(null);

  useEffect(() => {
    async function loadReport() {
      try {
        const response = await getStudentSelfReport();
        setAttendanceReport(response.data);
      } catch (error) {
        console.log("Error loading self report:", error);
      }
    }

    async function loadCourses() {
      try {
        const response = await getStudentCourses();
        setCoursesReport(response.data);
      } catch (error) {
        console.log("Error loading student courses:", error);
      }
    }

    if (user?.role === "student") {
      loadReport();
      loadCourses();
    }
  }, [user]);

  async function handleProtectedCheck() {
    try {
      setIsFetching(true);
      setErrorMessage("");
      const response = await getProtectedProfile();
      setProtectedMessage(
        `${response.message} (${response.user.email} - ${response.user.role})`
      );
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          "Could not verify protected route access."
      );
    } finally {
      setIsFetching(false);
    }
  }

  const percentage = attendanceReport?.attendancePercentage ?? null;
  const isHealthy = percentage !== null && percentage >= 75;
  
  // Calculate consecutive classes needed for 75% overall target
  const totalSessions = attendanceReport?.totalSessions ?? 0;
  const presentCount = attendanceReport?.presentCount ?? 0;
  const classesNeeded = Math.max(0, (3 * totalSessions) - (4 * presentCount));

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* ── 1. Welcome Header ── */}
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <GraduationCap size={30} color={COLORS.textInverse} />
        </View>
        <Text style={styles.headerGreeting}>Welcome back,</Text>
        <Text style={styles.headerName}>{user?.name ?? "Student"}</Text>
        <Text style={styles.headerSubtitle}>
          {user?.role === "student"
            ? "Student Success Portal"
            : "Academic Staff Portal"}
        </Text>
      </View>

      {/* ── 2. Attendance Hero Card (student only) ── */}
      {user?.role === "student" && attendanceReport ? (
        <View style={styles.heroCard}>
          <Text style={styles.heroCardTitle}>Attendance Overview</Text>

          {/* Percentage Ring */}
          <View style={styles.ringContainer}>
            <View
              style={[
                styles.ringOuter,
                {
                  borderColor: isHealthy
                    ? COLORS.primary
                    : COLORS.error,
                },
              ]}
            >
              <View style={styles.ringInner}>
                <Text
                  style={[
                    styles.percentageText,
                    { color: isHealthy ? COLORS.primary : COLORS.error },
                  ]}
                >
                  {attendanceReport.attendancePercentage}%
                </Text>
                <Text style={styles.percentageLabel}>Attendance</Text>
              </View>
            </View>
          </View>

          {/* Stat Row */}
          <View style={styles.statRow}>
            <View style={[styles.statChip, styles.statChipPresent]}>
              <CheckCircle size={16} color={COLORS.success} />
              <Text style={styles.statChipValue}>
                {attendanceReport.presentCount}
              </Text>
              <Text style={styles.statChipLabel}>Present</Text>
            </View>

            <View style={[styles.statChip, styles.statChipAbsent]}>
              <XCircle size={16} color={COLORS.error} />
              <Text style={styles.statChipValue}>
                {attendanceReport.absentCount}
              </Text>
              <Text style={styles.statChipLabel}>Absent</Text>
            </View>

            <View style={[styles.statChip, styles.statChipTotal]}>
              <CalendarDays size={16} color={COLORS.info} />
              <Text style={styles.statChipValue}>
                {attendanceReport.totalSessions}
              </Text>
              <Text style={styles.statChipLabel}>Total</Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* ── 3. Attendance Status Card (student only) ── */}
      {user?.role === "student" && percentage !== null ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusCardLabel}>Attendance Status</Text>
          {percentage >= 85 ? (
            <View style={styles.statusIndicatorRow}>
              <CheckCircle size={20} color={COLORS.success} style={styles.statusIcon} />
              <Text style={[styles.statusText, { color: COLORS.success }]}>Good Standing</Text>
            </View>
          ) : percentage >= 75 ? (
            <View style={styles.statusIndicatorRow}>
              <Clock size={20} color={COLORS.warning} style={styles.statusIcon} />
              <Text style={[styles.statusText, { color: COLORS.warning }]}>Monitor Attendance</Text>
            </View>
          ) : (
            <View style={styles.statusIndicatorRow}>
              <XCircle size={20} color={COLORS.error} style={styles.statusIcon} />
              <Text style={[styles.statusText, { color: COLORS.error }]}>Attendance Warning</Text>
            </View>
          )}
        </View>
      ) : null}

      {/* ── 4. Attendance Recovery Card (student only) ── */}
      {user?.role === "student" && attendanceReport ? (
        <View style={[styles.recoveryCard, !isHealthy && styles.recoveryCardWarning]}>
          <View style={styles.recoveryCardHeader}>
            <Shield size={18} color={isHealthy ? COLORS.success : COLORS.warning} style={styles.recoveryHeaderIcon} />
            <Text style={styles.recoveryCardTitle}>Attendance Recovery</Text>
          </View>
          {isHealthy ? (
            <View style={styles.recoverySafeRow}>
              <Text style={styles.recoverySafeText}>
                You are currently above the required threshold.
              </Text>
            </View>
          ) : (
            <View style={styles.recoveryStatsContainer}>
              <View style={styles.recoveryStatRow}>
                <Text style={styles.recoveryStatLabel}>Current Attendance</Text>
                <Text style={[styles.recoveryStatValue, { color: COLORS.error }]}>{percentage}%</Text>
              </View>
              <View style={styles.recoveryStatRow}>
                <Text style={styles.recoveryStatLabel}>Target Attendance</Text>
                <Text style={styles.recoveryStatValue}>75%</Text>
              </View>
              <View style={styles.recoveryDividerLine} />
              <View style={styles.recoveryStatRow}>
                <Text style={styles.recoveryNeedLabel}>Classes Needed To Reach Target</Text>
                <Text style={styles.recoveryNeedValue}>
                  {classesNeeded} Consecutive {classesNeeded === 1 ? "Class" : "Classes"}
                </Text>
              </View>
            </View>
          )}
        </View>
      ) : null}

      {/* ── 5. Course Performance Section (student only) ── */}
      {user?.role === "student" && coursesReport?.courses ? (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeading}>Course Performance</Text>
          {coursesReport.courses.map((course) => {
            const coursePct = course.attendancePercentage;
            let badgeStyle = BADGES.success;
            let badgeText = "Excellent";
            
            if (coursePct < 75) {
              badgeStyle = BADGES.danger;
              badgeText = "Warning";
            } else if (coursePct < 85) {
              badgeStyle = BADGES.warning;
              badgeText = "Good";
            }

            return (
              <View key={course.courseId} style={styles.courseRowCard}>
                <View style={styles.courseInfo}>
                  <Text style={styles.courseNameText}>{course.courseName}</Text>
                  <Text style={styles.courseCodeText}>{course.courseCode}</Text>
                </View>
                <View style={styles.courseBadgeCol}>
                  <Text style={styles.coursePctText}>{coursePct}%</Text>
                  <View style={[styles.courseBadge, badgeStyle]}>
                    <Text style={[styles.courseBadgeText, { color: badgeStyle.color }]}>
                      {badgeText}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* ── 6. Quick Actions ── */}
      {user?.role === "student" ? (
        <View style={styles.actionsSection}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => navigation.navigate("StudentScanner")}
          >
            <Camera size={20} color={COLORS.textInverse} />
            <Text style={styles.actionButtonText}>Scan Attendance QR</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionButtonSecondary,
              pressed && styles.buttonPressedOutline,
            ]}
            onPress={() => navigation.navigate("AttendanceHistory")}
          >
            <BookOpen size={20} color={COLORS.primary} />
            <Text style={styles.actionButtonSecondaryText}>
              My Courses
            </Text>
          </Pressable>
        </View>
      ) : (
        /* ── Test Protected Route (non-student) ── */
        <View style={styles.actionsSection}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              isFetching && styles.buttonDisabled,
              pressed && !isFetching && styles.buttonPressed,
            ]}
            onPress={handleProtectedCheck}
            disabled={isFetching}
          >
            {isFetching ? (
              <ActivityIndicator color={COLORS.textInverse} />
            ) : (
              <>
                <ShieldCheck size={20} color={COLORS.textInverse} />
                <Text style={styles.actionButtonText}>
                  Test Protected Route
                </Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {/* ── Protected Route Feedback ── */}
      {protectedMessage ? (
        <View style={styles.feedbackSuccess}>
          <Text style={styles.feedbackSuccessText}>{protectedMessage}</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.feedbackError}>
          <Text style={styles.feedbackErrorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* ── 7. Profile Information ── */}
      <View style={styles.profileCard}>
        <View style={styles.profileCardHeader}>
          <View style={styles.profileIconWrap}>
            <User size={18} color={COLORS.primary} />
          </View>
          <Text style={styles.profileCardTitle}>Profile Details</Text>
        </View>

        <View style={styles.profileDivider} />

        <View style={styles.profileRow}>
          <Text style={styles.profileRowLabel}>Name</Text>
          <Text style={styles.profileRowValue}>{user?.name}</Text>
        </View>
        <View style={styles.profileRow}>
          <Text style={styles.profileRowLabel}>Email</Text>
          <Text style={styles.profileRowValue}>{user?.email}</Text>
        </View>
        <View style={[styles.profileRow, { marginBottom: 0 }]}>
          <Text style={styles.profileRowLabel}>Role</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {user?.role
                ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                : ""}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Logout ── */}
      <Pressable
        style={({ pressed }) => [
          styles.logoutButton,
          pressed && styles.logoutButtonPressed,
        ]}
        onPress={signOut}
      >
        <LogOut size={18} color={COLORS.textInverse} />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </Pressable>

      {/* Bottom spacer */}
      <View style={{ height: SPACING.lg }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.base,
  },

  // ── Header ──
  header: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  headerIconWrap: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  headerGreeting: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.regular,
  },
  headerName: {
    fontFamily: FONTS.heading,
    fontSize: TYPOGRAPHY.sizes.screenTitle,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    marginTop: 2,
    textAlign: "center",
  },
  headerSubtitle: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.sizes.metadata,
    color: COLORS.textSecondary,
    marginTop: 4,
    letterSpacing: 0.3,
  },

  // ── Hero Card ──
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: LAYOUT.cardPadding,
    marginBottom: SPACING.base,
    alignItems: "center",
    ...SHADOWS.sm,
  },
  heroCardTitle: {
    fontFamily: FONTS.heading,
    fontSize: TYPOGRAPHY.sizes.sectionTitle,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.xl,
    alignSelf: "flex-start",
  },

  // Percentage Ring
  ringContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xl,
  },
  ringOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  ringInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  percentageText: {
    fontFamily: FONTS.heading,
    fontSize: TYPOGRAPHY.sizes.cardMetric + 6,
    fontWeight: TYPOGRAPHY.weights.bold,
    lineHeight: 38,
  },
  percentageLabel: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.sizes.metadata,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginTop: 2,
  },

  // Stat Row
  statRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    width: "100%",
  },
  statChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: 4,
    borderWidth: 1,
  },
  statChipPresent: {
    backgroundColor: COLORS.successLight,
    borderColor: "rgba(45, 106, 79, 0.15)",
  },
  statChipAbsent: {
    backgroundColor: COLORS.errorLight,
    borderColor: "rgba(176, 58, 46, 0.15)",
  },
  statChipTotal: {
    backgroundColor: COLORS.infoLight,
    borderColor: "rgba(42, 95, 139, 0.15)",
  },
  statChipValue: {
    fontFamily: FONTS.heading,
    fontSize: TYPOGRAPHY.sizes.cardMetricSm,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
  },
  statChipLabel: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.sizes.micro,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.medium,
  },

  // ── Attendance Status Card ──
  statusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: LAYOUT.cardPadding,
    marginBottom: SPACING.base,
    ...SHADOWS.sm,
  },
  statusCardLabel: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.sizes.label,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  statusIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIcon: {
    marginRight: SPACING.sm,
  },
  statusText: {
    fontFamily: FONTS.heading,
    fontSize: TYPOGRAPHY.sizes.sectionTitle,
    fontWeight: "bold",
  },

  // ── Attendance Recovery Card ──
  recoveryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: LAYOUT.cardPadding,
    marginBottom: SPACING.base,
    ...SHADOWS.sm,
  },
  recoveryCardWarning: {
    borderColor: COLORS.border,
  },
  recoveryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  recoveryHeaderIcon: {
    marginRight: SPACING.sm,
  },
  recoveryCardTitle: {
    fontFamily: FONTS.heading,
    fontSize: TYPOGRAPHY.sizes.sectionTitle,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
  },
  recoverySafeRow: {
    paddingVertical: SPACING.xs,
  },
  recoverySafeText: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.success,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  recoveryStatsContainer: {
    gap: SPACING.sm,
  },
  recoveryStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recoveryStatLabel: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.textSecondary,
  },
  recoveryStatValue: {
    fontFamily: FONTS.heading,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "bold",
    color: COLORS.text,
  },
  recoveryDividerLine: {
    height: 1,
    backgroundColor: COLORS.borderSubtle,
    marginVertical: SPACING.xs,
  },
  recoveryNeedLabel: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.text,
  },
  recoveryNeedValue: {
    fontFamily: FONTS.heading,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "bold",
    color: COLORS.warning,
  },

  // ── Course Performance Section ──
  sectionContainer: {
    marginBottom: SPACING.base,
  },
  sectionHeading: {
    fontFamily: FONTS.heading,
    fontSize: TYPOGRAPHY.sizes.sectionTitle,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
    marginTop: SPACING.xs,
  },
  courseRowCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: LAYOUT.cardPadding,
    marginBottom: SPACING.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    ...SHADOWS.xs,
  },
  courseInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  courseNameText: {
    fontFamily: FONTS.heading,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "bold",
    color: COLORS.text,
  },
  courseCodeText: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.sizes.metadata,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  courseBadgeCol: {
    alignItems: "flex-end",
  },
  coursePctText: {
    fontFamily: FONTS.heading,
    fontSize: TYPOGRAPHY.sizes.cardMetricSm,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  courseBadge: {
    borderRadius: RADIUS.xxl,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  courseBadgeText: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.sizes.micro,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },

  // ── Action Buttons ──
  actionsSection: {
    gap: SPACING.md,
    marginBottom: SPACING.base,
    marginTop: SPACING.xs,
  },
  actionButton: {
    ...BUTTON_VARIANTS.primary,
    ...SHADOWS.sm,
  },
  actionButtonText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontFamily: FONTS.body,
  },
  actionButtonSecondary: {
    ...BUTTON_VARIANTS.secondary,
    ...SHADOWS.xs,
  },
  actionButtonSecondaryText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontFamily: FONTS.body,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonPressedOutline: {
    backgroundColor: COLORS.primaryLight,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // ── Feedback banners ──
  feedbackSuccess: {
    backgroundColor: COLORS.successLight,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  feedbackSuccessText: {
    color: COLORS.success,
    fontSize: TYPOGRAPHY.sizes.body,
    fontFamily: FONTS.body,
    textAlign: "center",
    lineHeight: 20,
  },
  feedbackError: {
    backgroundColor: COLORS.errorLight,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.error,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  feedbackErrorText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.sizes.body,
    fontFamily: FONTS.body,
    textAlign: "center",
    lineHeight: 20,
  },

  // ── Profile Card ──
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: LAYOUT.cardPadding,
    marginBottom: SPACING.base,
    ...SHADOWS.sm,
  },
  profileCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  profileIconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  profileCardTitle: {
    fontFamily: FONTS.heading,
    fontSize: TYPOGRAPHY.sizes.sectionTitle,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
  },
  profileDivider: {
    height: 1,
    backgroundColor: COLORS.borderSubtle,
    marginBottom: SPACING.md,
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  profileRowLabel: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.sizes.label,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.textSecondary,
  },
  profileRowValue: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.text,
    flex: 1,
    textAlign: "right",
  },
  roleBadge: {
    ...BADGES.neutral,
  },
  roleBadgeText: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.sizes.label,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textSecondary,
  },

  // ── Logout ──
  logoutButton: {
    ...BUTTON_VARIANTS.danger,
    ...SHADOWS.xs,
  },
  logoutButtonPressed: {
    opacity: 0.85,
  },
  logoutButtonText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontFamily: FONTS.body,
  },
});
