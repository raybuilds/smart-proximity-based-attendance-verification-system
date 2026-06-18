import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getStudentCourseDetail } from "../services/reports";
import { COLORS, TYPOGRAPHY, LAYOUT } from "../utils/theme";

function formatDate(dateString) {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  // Options for formatting: "18 Jun 2026"
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
      console.log(error);
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
    // Determine risk status color/text
    let statusTitle = "Safe";
    let statusDesc = "Attendance requirement met.";
    let bannerStyle = styles.bannerSafe;
    let bannerTextVal = styles.bannerTextSafe;

    if (attendancePercentage < 75) {
      statusTitle = "At Risk";
      statusDesc = `Attendance below required threshold. Current: ${attendancePercentage}%, Required: 75%, Need ${classesNeededFor75} consecutive presents.`;
      bannerStyle = styles.bannerError;
      bannerTextVal = styles.bannerTextError;
    } else if (attendancePercentage <= 85) {
      statusTitle = "Warning";
      statusDesc = "Monitor attendance closely.";
      bannerStyle = styles.bannerWarning;
      bannerTextVal = styles.bannerTextWarning;
    }

    return (
      <View>
        {/* Forest Green Header Block */}
        <View style={styles.headerBlock}>
          <Text style={styles.headerTitle}>{course.code ? `${course.code} - ${course.name}` : course.name}</Text>
          <Text style={styles.headerPercentage}>{attendancePercentage}%</Text>
        </View>

        {/* Status Banner */}
        <View style={[styles.statusBanner, bannerStyle]}>
          <Text style={[styles.statusTitleText, bannerTextVal]}>
            Attendance Status: {statusTitle}
          </Text>
          <Text style={[styles.statusDescText, bannerTextVal]}>
            {statusDesc}
          </Text>
        </View>

        {/* Recovery Analytics Card */}
        {attendancePercentage < 75 ? (
          <View style={styles.recoveryCard}>
            <Text style={styles.recoveryTitle}>Attendance Recovery Plan</Text>
            <View style={styles.recoveryGrid}>
              <View style={styles.recoveryItem}>
                <Text style={styles.recoveryLabel}>Current</Text>
                <Text style={[styles.recoveryValue, styles.textError]}>{attendancePercentage}%</Text>
              </View>
              <View style={styles.recoveryItem}>
                <Text style={styles.recoveryLabel}>Needed</Text>
                <Text style={styles.recoveryValue}>{classesNeededFor75} Consecutive Classes</Text>
              </View>
              <View style={styles.recoveryItem}>
                <Text style={styles.recoveryLabel}>Projected</Text>
                <Text style={[styles.recoveryValue, styles.textSafe]}>{projectedPercentageAfterRecovery}%</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.recoveryCard}>
            <Text style={styles.recoveryTitle}>Attendance Requirement Met</Text>
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
                <Text key={index} style={styles.trendEmoji}>
                  {status === "PRESENT" ? "🟢" : "🔴"}
                </Text>
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
              <Text style={styles.streakLabel}>Current Streak</Text>
              <Text style={styles.streakValue}>🔥 {currentStreak} Sessions</Text>
            </View>
            <View style={styles.streakColumn}>
              <Text style={styles.streakLabel}>Best Streak</Text>
              <Text style={styles.streakValue}>🏆 {bestStreak} Sessions</Text>
            </View>
          </View>
          <View style={styles.lastAttendedRow}>
            <Text style={styles.lastAttendedLabel}>Last Attended</Text>
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
        let badgeStyle = styles.badgeAbsent;
        let badgeText = "ABSENT";
        let cardStyle = styles.timelineCardAbsent;

        if (item.status === "Present" || item.status === "present") {
          if (item.method === "QR") {
            badgeStyle = styles.badgeQr;
            badgeText = "QR PRESENT";
            cardStyle = styles.timelineCardQr;
          } else {
            badgeStyle = styles.badgeManual;
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
                <Text style={styles.timelineBadgeText}>{badgeText}</Text>
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
    padding: 16,
    backgroundColor: COLORS.background,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  headerBlock: {
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.cardRadius,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    textAlign: "center",
  },
  headerPercentage: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    marginTop: 10,
  },
  statusBanner: {
    borderRadius: LAYOUT.cardRadius,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  bannerSafe: {
    backgroundColor: "rgba(44, 95, 45, 0.08)",
    borderColor: COLORS.success,
  },
  bannerWarning: {
    backgroundColor: "rgba(176, 122, 42, 0.08)",
    borderColor: COLORS.warning,
  },
  bannerError: {
    backgroundColor: "rgba(198, 55, 55, 0.08)",
    borderColor: COLORS.error,
  },
  statusTitleText: {
    fontSize: 15,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    marginBottom: 4,
  },
  statusDescText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    lineHeight: 18,
  },
  bannerTextSafe: {
    color: COLORS.success,
  },
  bannerTextWarning: {
    color: COLORS.warning,
  },
  bannerTextError: {
    color: COLORS.error,
  },
  recoveryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recoveryTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    marginBottom: 12,
  },
  recoverySubtitle: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: "600",
    fontFamily: TYPOGRAPHY.body.fontFamily,
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
    fontSize: 11,
    color: "#6B7280",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  recoveryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  gridCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    padding: 12,
    marginHorizontal: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gridLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    marginBottom: 12,
  },
  trendStrip: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  trendEmoji: {
    fontSize: 22,
    marginRight: 6,
    marginBottom: 6,
  },
  noDataText: {
    fontSize: 13,
    color: "#6B7280",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontStyle: "italic",
  },
  streaksRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 12,
    marginBottom: 12,
  },
  streakColumn: {
    flex: 1,
    alignItems: "center",
  },
  streakLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  streakValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  lastAttendedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastAttendedLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  lastAttendedValue: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    color: COLORS.primary,
    marginTop: 8,
    marginBottom: 12,
  },
  timelineCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  timelineCardQr: {
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB", // Blue for QR
  },
  timelineCardManual: {
    borderLeftWidth: 4,
    borderLeftColor: "#D97706", // Amber for Manual
  },
  timelineCardAbsent: {
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626", // Red for Absent
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timelineDate: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "600",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  timelineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  timelineBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  badgeQr: {
    backgroundColor: "#2563EB",
  },
  badgeManual: {
    backgroundColor: "#D97706",
  },
  badgeAbsent: {
    backgroundColor: "#DC2626",
  },
  correctionDetails: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  correctionHeader: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#D97706",
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    marginBottom: 8,
  },
  correctionLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginTop: 4,
  },
  correctionValue: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 30,
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 13,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  textSafe: {
    color: COLORS.success,
  },
  textError: {
    color: COLORS.error,
  },
});
