import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { getStudentCourses } from "../services/reports";
import { COLORS, TYPOGRAPHY, LAYOUT } from "../utils/theme";

export default function AttendanceHistoryScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadCourses();
    });
    return unsubscribe;
  }, [navigation]);

  async function loadCourses() {
    try {
      const response = await getStudentCourses();
      setData(response.data);
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

  const overallAttendancePercentage = data?.overallAttendancePercentage ?? 100.0;
  const courses = data?.courses ?? [];
  const atRiskCourses = data?.atRiskQuickView ?? [];

  const renderHeader = () => (
    <View>
      {/* Top Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Overall Attendance</Text>
        <Text style={styles.summaryValue}>{overallAttendancePercentage}%</Text>
        <Text style={styles.summaryFooter}>Courses Enrolled: {courses.length}</Text>
      </View>

      {/* At Risk Quick View */}
      {atRiskCourses.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>At Risk Quick View</Text>
          {atRiskCourses.map((item) => (
            <Pressable
              key={item.courseId}
              style={[styles.quickViewCard, styles.borderError]}
              onPress={() =>
                navigation.navigate("StudentCourseAttendance", {
                  courseId: item.courseId,
                })
              }
            >
              <View style={styles.row}>
                <Text style={styles.quickViewCourseCode}>
                  {item.courseCode} - {item.courseName}
                </Text>
                <Text style={[styles.percentageText, styles.textError]}>
                  {item.attendancePercentage}%
                </Text>
              </View>
              <Text style={styles.recoveryText}>
                Need {item.classesNeededFor75} consecutive classes to reach 75%
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Enrolled Courses</Text>
    </View>
  );

  return (
    <FlatList
      data={courses}
      keyExtractor={(item) => item.courseId.toString()}
      contentContainerStyle={[styles.container, courses.length === 0 && { flexGrow: 1 }]}
      ListHeaderComponent={renderHeader}
      renderItem={({ item }) => {
        let badgeStyle = styles.badgeSafe;
        let badgeText = "SAFE";
        let cardBorderStyle = styles.borderSafe;
        let percentageTextStyle = styles.textSafe;

        if (item.riskLevel === "warning") {
          badgeStyle = styles.badgeWarning;
          badgeText = "WARNING";
          cardBorderStyle = styles.borderWarning;
          percentageTextStyle = styles.textWarning;
        } else if (item.riskLevel === "atRisk") {
          badgeStyle = styles.badgeError;
          badgeText = "AT RISK";
          cardBorderStyle = styles.borderError;
          percentageTextStyle = styles.textError;
        }

        return (
          <Pressable
            style={[styles.courseCard, cardBorderStyle]}
            onPress={() =>
              navigation.navigate("StudentCourseAttendance", {
                courseId: item.courseId,
              })
            }
          >
            <View style={styles.row}>
              <Text style={styles.courseTitle} numberOfLines={2}>
                {item.courseCode} - {item.courseName}
              </Text>
              <View style={[styles.badge, badgeStyle]}>
                <Text style={styles.badgeText}>{badgeText}</Text>
              </View>
            </View>

            <View style={styles.detailsRow}>
              <View>
                <Text style={styles.detailLabel}>Attendance</Text>
                <Text style={[styles.detailValue, percentageTextStyle]}>
                  {item.attendancePercentage}%
                </Text>
              </View>
              <View>
                <Text style={styles.detailLabel}>Present</Text>
                <Text style={styles.detailValue}>
                  {item.presentCount} / {item.totalSessions}
                </Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              {item.attendancePercentage < 75 ? (
                <Text style={styles.recoveryFooterText}>
                  Need {item.classesNeededFor75} more consecutive classes to reach 75%
                </Text>
              ) : (
                <Text style={styles.safeFooterText}>
                  Attendance Requirement Met
                </Text>
              )}
            </View>
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <Path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
            </Svg>
          </View>
          <Text style={styles.emptyHeading}>No courses available yet</Text>
          <Text style={styles.emptySubheading}>Courses will appear here when:</Text>
          
          <View style={styles.emptyBulletsBox}>
            <Text style={styles.emptyBullet}>
              • A teacher creates a course matching your profile
            </Text>
            <Text style={styles.emptyBullet}>
              • You attend your first class
            </Text>
          </View>

          {courses.length === 0 && overallAttendancePercentage === 100 && (
            <Text style={styles.emptyCaption}>
              You're all set. Once your first course becomes available, it will appear here automatically.
            </Text>
          )}
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
  summaryCard: {
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.cardRadius,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  summaryTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    textTransform: "uppercase",
    letterSpacing: 1,
    opacity: 0.9,
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    marginVertical: 8,
  },
  summaryFooter: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    opacity: 0.8,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    color: COLORS.primary,
    marginBottom: 12,
  },
  quickViewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  quickViewCourseCode: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    flex: 1,
    marginRight: 8,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.heading.fontFamily,
  },
  recoveryText: {
    fontSize: 13,
    color: COLORS.error,
    fontWeight: "600",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  courseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  badgeSafe: {
    backgroundColor: COLORS.success,
  },
  badgeWarning: {
    backgroundColor: COLORS.warning,
  },
  badgeError: {
    backgroundColor: COLORS.error,
  },
  borderSafe: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  borderWarning: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  borderError: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  textSafe: {
    color: COLORS.success,
  },
  textWarning: {
    color: COLORS.warning,
  },
  textError: {
    color: COLORS.error,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  detailLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  cardFooter: {
    marginTop: 4,
  },
  recoveryFooterText: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: "600",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  safeFooterText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: "600",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  emptyIconContainer: {
    marginBottom: 16,
    backgroundColor: "rgba(44, 95, 45, 0.08)",
    padding: 16,
    borderRadius: 50,
  },
  emptyHeading: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubheading: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    textAlign: "center",
    marginBottom: 12,
  },
  emptyBulletsBox: {
    alignSelf: "stretch",
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  emptyBullet: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    lineHeight: 20,
    marginBottom: 6,
  },
  emptyCaption: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    textAlign: "center",
    lineHeight: 18,
    fontStyle: "italic",
    paddingHorizontal: 12,
  },
});