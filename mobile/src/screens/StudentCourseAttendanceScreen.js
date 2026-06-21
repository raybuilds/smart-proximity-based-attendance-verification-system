import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Flame,
  Award,
  Shield,
  CalendarDays,
  Clock,
  History,
} from "lucide-react-native";
import { getStudentCourseDetail } from "../services/reports";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BADGES, LAYOUT, FONTS } from "../utils/theme";

function formatDate(dateString) {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('en-GB', options);
}

export default function StudentCourseAttendanceScreen({ route, navigation }) {
  const { courseId } = route.params;
  const [courseDetail, setCourseDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDetail();
  }, [courseId]);

  useEffect(() => {
    if (courseDetail) {
      navigation.setOptions({
        title: courseDetail.course.code ? `${courseDetail.course.code}` : courseDetail.course.name,
      });
    }
  }, [courseDetail]);

  async function loadDetail() {
    try {
      const response = await getStudentCourseDetail(courseId);
      setCourseDetail(response.data);
    } catch (error) {
      if (__DEV__) console.log(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!courseDetail) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Could not load course details.</Text>
      </View>
    );
  }

  const {
    course,
    attendancePercentage,
    presentCount,
    absentCount,
    totalSessions,
    currentStreak,
    bestStreak,
    lastAttended,
    classesNeededFor75,
    projectedPercentageAfterRecovery,
    trendData,
    timeline,
  } = courseDetail;

  const renderHeader = () => {
    let statusTitle = "Safe";
    let statusDesc = "Attendance requirement met.";
    let badgeStyle = BADGES.success;
    let StatusIcon = CheckCircle;

    if (attendancePercentage < 75) {
      statusTitle = "At Risk";
      statusDesc = `Attendance below required threshold. Current: ${attendancePercentage}%, Required: 75%, Need ${classesNeededFor75} consecutive presents.`;
      badgeStyle = BADGES.danger;
      StatusIcon = XCircle;
    } else if (attendancePercentage <= 85) {
      statusTitle = "Warning";
      statusDesc = "Monitor attendance closely.";
      badgeStyle = BADGES.warning;
      StatusIcon = Clock;
    }

    return (
      <View>
        {/* Forest Green Header Block */}
        <View style={styles.headerBlock}>
          <Text style={styles.headerTitle}>{course.code ? `${course.code} - ${course.name}` : course.name}</Text>
          <Text style={styles.headerPercentage}>{attendancePercentage}%</Text>
        </View>

        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: badgeStyle.backgroundColor, borderColor: badgeStyle.borderColor }]}>
          <View style={styles.statusBannerHeader}>
            <StatusIcon size={18} color={badgeStyle.color} style={styles.statusBannerIcon} />
            <Text style={[styles.statusTitleText, { color: badgeStyle.color }]}>
              Attendance Status: {statusTitle}
            </Text>
          </View>
          <Text style={[styles.statusDescText, { color: COLORS.text }]}>
            {statusDesc}
          </Text>
        </View>

        {/* Recovery Analytics Card */}
        {attendancePercentage < 75 ? (
          <View style={styles.recoveryCard}>
            <View style={styles.recoveryCardHeader}>
              <Shield size={18} color={COLORS.error} style={styles.recoveryIcon} />
              <Text style={[styles.recoveryTitle, { color: COLORS.error }]}>Attendance Recovery Plan</Text>
            </View>
            <View style={styles.recoveryGrid}>
              <View style={styles.recoveryItem}>
                <Text style={styles.recoveryLabel}>Current</Text>
                <Text style={[styles.recoveryValue, styles.textError]}>{attendancePercentage}%</Text>
              </View>
              <View style={styles.recoveryItem}>
                <Text style={styles.recoveryLabel}>Needed</Text>
                <Text style={styles.recoveryValue}>{classesNeededFor75} Consecutive</Text>
              </View>
              <View style={styles.recoveryItem}>
                <Text style={styles.recoveryLabel}>Projected</Text>
                <Text style={[styles.recoveryValue, styles.textSafe]}>{projectedPercentageAfterRecovery}%</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.recoveryCard}>
            <View style={styles.recoveryCardHeader}>
              <Shield size={18} color={COLORS.success} style={styles.recoveryIcon} />
              <Text style={[styles.recoveryTitle, { color: COLORS.success }]}>Attendance Requirement Met</Text>
            </View>
            <Text style={styles.recoverySubtitle}>
              Current Attendance: {attendancePercentage}%
            </Text>
          </View>
        )}

        {/* Analytics Grid */}
        <View style={styles.grid}>
          <View style={styles.gridCard}>
            <Text style={styles.gridLabel}>Present</Text>
            <Text style={[styles.gridValue, styles.textSafe]}>{presentCount}</Text>
          </View>
          <View style={styles.gridCard}>
            <Text style={styles.gridLabel}>Absent</Text>
            <Text style={[styles.gridValue, styles.textError]}>{absentCount}</Text>
          </View>
          <View style={styles.gridCard}>
            <Text style={styles.gridLabel}>Total Sessions</Text>
            <Text style={styles.gridValue}>{totalSessions}</Text>
          </View>
        </View>

        {/* Trend Strip */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Attendance Trend</Text>
          {trendData && trendData.length > 0 ? (
            <View style={styles.trendStrip}>
              {trendData.map((status, index) => (
                <View
                  key={index}
                  style={[
                    styles.trendDot,
                    {
                      backgroundColor: status === "PRESENT" ? COLORS.success : COLORS.error,
                      borderColor: status === "PRESENT" ? "rgba(45,106,79,0.2)" : "rgba(176,58,46,0.2)",
                    }
                  ]}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.noDataText}>No sessions conducted yet.</Text>
          )}
        </View>

        {/* Streaks & Last Attended Section */}
        <View style={styles.card}>
          <View style={styles.streaksRow}>
            <View style={styles.streakColumn}>
              <View style={styles.streakIconHeader}>
                <Flame size={16} color={COLORS.warning} style={styles.streakIcon} />
                <Text style={styles.streakLabel}>Current Streak</Text>
              </View>
              <Text style={styles.streakValue}>{currentStreak} Sessions</Text>
            </View>
            <View style={styles.streakDivider} />
            <View style={styles.streakColumn}>
              <View style={styles.streakIconHeader}>
                <Award size={16} color={COLORS.success} style={styles.streakIcon} />
                <Text style={styles.streakLabel}>Best Streak</Text>
              </View>
              <Text style={styles.streakValue}>{bestStreak} Sessions</Text>
            </View>
          </View>
          <View style={styles.lastAttendedRow}>
            <View style={styles.lastAttendedLeft}>
              <CalendarDays size={16} color={COLORS.textSecondary} style={styles.streakIcon} />
              <Text style={styles.lastAttendedLabel}>Last Attended</Text>
            </View>
            <Text style={styles.lastAttendedValue}>{formatDate(lastAttended)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Timeline Details</Text>
      </View>
    );
  };

  return (
    <FlatList
      data={timeline}
      keyExtractor={(item) => item.sessionId.toString()}
      contentContainerStyle={styles.container}
      ListHeaderComponent={renderHeader}
      renderItem={({ item }) => {
        let badgeStyle = BADGES.danger;
        let badgeText = "ABSENT";
        let cardStyle = styles.timelineCardAbsent;

        if (item.status === "Present" || item.status === "present") {
          if (item.method === "QR") {
            badgeStyle = BADGES.success;
            badgeText = "QR PRESENT";
            cardStyle = styles.timelineCardQr;
          } else {
            badgeStyle = BADGES.warning;
            badgeText = "MANUAL CORRECTED";
            cardStyle = styles.timelineCardManual;
          }
        }

        return (
          <View style={[styles.timelineCard, cardStyle]}>
            <View style={styles.row}>
              <Text style={styles.timelineDate}>
                {new Date(item.sessionDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })} at {new Date(item.sessionDate).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <View style={[styles.timelineBadge, badgeStyle]}>
                <Text style={[styles.timelineBadgeText, { color: badgeStyle.color }]}>{badgeText}</Text>
              </View>
            </View>

            {item.method === "MANUAL" && (
              <View style={styles.correctionDetails}>
                <Text style={styles.correctionHeader}>Attendance Corrected</Text>
                
                <Text style={styles.correctionLabel}>Reason:</Text>
                <Text style={styles.correctionValue}>{item.correctionReason}</Text>
                
                <Text style={styles.correctionLabel}>Corrected On:</Text>
                <Text style={styles.correctionValue}>{formatDate(item.correctedOn)}</Text>
              </View>
            )}
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No attendance timeline records found.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  container: {
    padding: SPACING.base,
    backgroundColor: COLORS.background,
  },
  errorText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontFamily: FONTS.body,
  },
  headerBlock: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: "center",
    marginBottom: SPACING.base,
    ...SHADOWS.sm,
  },
  headerTitle: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.sizes.sectionTitle,
    fontWeight: "bold",
    fontFamily: FONTS.heading,
    textAlign: "center",
  },
  headerPercentage: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.sizes.cardMetric + 8,
    fontWeight: "bold",
    fontFamily: FONTS.heading,
    marginTop: SPACING.sm,
  },
  statusBanner: {
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    borderWidth: 1,
  },
  statusBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  statusBannerIcon: {
    marginRight: SPACING.xs,
  },
  statusTitleText: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "bold",
    fontFamily: FONTS.heading,
  },
  statusDescText: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontFamily: FONTS.body,
    lineHeight: 20,
    marginTop: 2,
  },
  recoveryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  recoveryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  recoveryIcon: {
    marginRight: SPACING.sm,
  },
  recoveryTitle: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "bold",
    fontFamily: FONTS.heading,
  },
  recoverySubtitle: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.success,
    fontWeight: "600",
    fontFamily: FONTS.body,
  },
  recoveryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  recoveryItem: {
    flex: 1,
    alignItems: "center",
  },
  recoveryLabel: {
    fontSize: TYPOGRAPHY.sizes.micro,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  recoveryValue: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: FONTS.body,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.base,
  },
  gridCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.xxs,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.xs,
  },
  gridLabel: {
    fontSize: TYPOGRAPHY.sizes.micro,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  gridValue: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: FONTS.body,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.xs,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: FONTS.heading,
    marginBottom: SPACING.md,
  },
  trendStrip: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  trendDot: {
    width: 14,
    height: 14,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
  },
  noDataText: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontStyle: "italic",
  },
  streaksRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    paddingBottom: SPACING.md,
    marginBottom: SPACING.md,
  },
  streakColumn: {
    flex: 1,
    alignItems: "center",
  },
  streakIconHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  streakIcon: {
    marginRight: 6,
  },
  streakLabel: {
    fontSize: TYPOGRAPHY.sizes.micro,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    textTransform: "uppercase",
  },
  streakDivider: {
    width: 1,
    backgroundColor: COLORS.borderSubtle,
    height: "100%",
  },
  streakValue: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: FONTS.body,
  },
  lastAttendedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastAttendedLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  lastAttendedLabel: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: FONTS.body,
  },
  lastAttendedValue: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.textSecondary,
    fontWeight: "bold",
    fontFamily: FONTS.body,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.sectionTitle,
    fontWeight: "bold",
    fontFamily: FONTS.heading,
    color: COLORS.primary,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  timelineCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.sm,
    ...SHADOWS.xs,
  },
  timelineCardQr: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  timelineCardManual: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  timelineCardAbsent: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timelineDate: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.text,
    fontWeight: "600",
    fontFamily: FONTS.body,
  },
  timelineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
  },
  timelineBadgeText: {
    fontSize: TYPOGRAPHY.sizes.micro,
    fontWeight: "bold",
    fontFamily: FONTS.body,
  },
  correctionDetails: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  correctionHeader: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: "bold",
    color: COLORS.warning,
    fontFamily: FONTS.heading,
    marginBottom: SPACING.sm,
  },
  correctionLabel: {
    fontSize: TYPOGRAPHY.sizes.micro,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    marginTop: 4,
  },
  correctionValue: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.text,
    fontFamily: FONTS.body,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 30,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontFamily: FONTS.body,
  },
  textSafe: {
    color: COLORS.success,
  },
  textError: {
    color: COLORS.error,
  },
});
