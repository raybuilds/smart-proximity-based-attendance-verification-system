import React, { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AlertTriangle, Inbox } from "lucide-react-native";
import { getStudentCourses } from "../services/reports";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BADGES, LAYOUT, FONTS } from "../utils/theme";
import FadeInContainer from "../components/FadeInContainer";
import InteractiveCard from "../components/InteractiveCard";
import SkeletonCard from "../components/SkeletonCard";
import EmptyState from "../components/EmptyState";

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
      if (__DEV__) console.log(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <SkeletonCard height={120} marginVertical={12} />
        <SkeletonCard height={96} marginVertical={12} />
        <SkeletonCard height={96} marginVertical={12} />
      </View>
    );
  }

  const overallAttendancePercentage = data?.overallAttendancePercentage ?? 100.0;
  const courses = data?.courses ?? [];
  const atRiskCourses = data?.atRiskQuickView ?? [];

  const renderHeader = () => (
    <View>
      {/* Top Summary Card */}
      <InteractiveCard style={styles.summaryCard} onPress={() => {}}>
        <Text style={styles.summaryTitle}>Overall Attendance</Text>
        <Text style={styles.summaryValue}>{overallAttendancePercentage}%</Text>
        <Text style={styles.summaryFooter}>Courses Enrolled: {courses.length}</Text>
      </InteractiveCard>

      {/* At Risk Quick View */}
      {atRiskCourses.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <AlertTriangle size={18} color={COLORS.error} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>At Risk Quick View</Text>
          </View>
          {atRiskCourses.map((item) => (
            <InteractiveCard
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
                  {item.courseCode ? `${item.courseCode} - ${item.courseName}` : item.courseName}
                </Text>
                <Text style={[styles.percentageText, styles.textError]}>
                  {item.attendancePercentage}%
                </Text>
              </View>
              <Text style={styles.recoveryText}>
                Need {item.classesNeededFor75} consecutive classes to reach 75%
              </Text>
            </InteractiveCard>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Enrolled Courses</Text>
    </View>
  );

  return (
    <FadeInContainer style={{ flex: 1 }}>
      <FlatList
        data={courses}
        keyExtractor={(item) => item.courseId.toString()}
        contentContainerStyle={[styles.container, courses.length === 0 && { flexGrow: 1 }]}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => {
          let badgeStyle = BADGES.success;
          let badgeText = "SAFE";
          let cardBorderStyle = styles.borderSafe;
          let percentageTextStyle = styles.textSafe;

          if (item.riskLevel === "warning") {
            badgeStyle = BADGES.warning;
            badgeText = "WARNING";
            cardBorderStyle = styles.borderWarning;
            percentageTextStyle = styles.textWarning;
          } else if (item.riskLevel === "atRisk") {
            badgeStyle = BADGES.danger;
            badgeText = "AT RISK";
            cardBorderStyle = styles.borderError;
            percentageTextStyle = styles.textError;
          }

          return (
            <InteractiveCard
              style={[styles.courseCard, cardBorderStyle]}
              onPress={() =>
                navigation.navigate("StudentCourseAttendance", {
                  courseId: item.courseId,
                })
              }
            >
              <View style={styles.row}>
                <Text style={styles.courseTitle} numberOfLines={2}>
                  {item.courseCode ? `${item.courseCode} - ${item.courseName}` : item.courseName}
                </Text>
                <View style={[styles.badge, badgeStyle]}>
                  <Text style={[styles.badgeText, { color: badgeStyle.color }]}>{badgeText}</Text>
                </View>
              </View>

              <View style={styles.detailsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>Attendance</Text>
                  <Text style={[styles.detailValue, percentageTextStyle]}>
                    {item.attendancePercentage}%
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
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
            </InteractiveCard>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            Icon={Inbox}
            title="No Courses Found"
            description="You are not enrolled in any attendance tracking courses yet."
          />
        }
      />
    </FadeInContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16
  },
  container: {
    padding: SPACING.base,
    backgroundColor: COLORS.background,
  },
  summaryCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    alignItems: "center",
    ...SHADOWS.sm,
  },
  summaryTitle: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.sizes.label,
    fontWeight: "600",
    fontFamily: FONTS.body,
    textTransform: "uppercase",
    letterSpacing: 1,
    opacity: 0.9,
  },
  summaryValue: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.sizes.cardMetric + 8,
    fontWeight: "bold",
    fontFamily: FONTS.heading,
    marginVertical: 8,
  },
  summaryFooter: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.sizes.body,
    fontFamily: FONTS.body,
    opacity: 0.8,
  },
  section: {
    marginBottom: SPACING.base,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  sectionIcon: {
    marginRight: SPACING.xs,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.sectionTitle,
    fontWeight: "bold",
    fontFamily: FONTS.heading,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  quickViewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.xs,
    ...SHADOWS.xs,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  quickViewCourseCode: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: FONTS.heading,
    flex: 1,
    marginRight: 8,
  },
  percentageText: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "bold",
    fontFamily: FONTS.heading,
  },
  recoveryText: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.error,
    fontWeight: "600",
    fontFamily: FONTS.body,
  },
  courseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.sm,
    ...SHADOWS.xs,
  },
  courseTitle: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: FONTS.heading,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: TYPOGRAPHY.sizes.micro,
    fontWeight: "bold",
    fontFamily: FONTS.body,
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
    marginVertical: SPACING.xs,
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  detailLabel: {
    fontSize: TYPOGRAPHY.sizes.micro,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: FONTS.body,
  },
  cardFooter: {
    marginTop: 4,
  },
  recoveryFooterText: {
    fontSize: TYPOGRAPHY.sizes.metadata,
    color: COLORS.error,
    fontWeight: "600",
    fontFamily: FONTS.body,
  },
  safeFooterText: {
    fontSize: TYPOGRAPHY.sizes.metadata,
    color: COLORS.success,
    fontWeight: "600",
    fontFamily: FONTS.body,
  },
});