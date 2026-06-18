import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  Pressable,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  FileText,
  Users,
  CalendarDays,
  BarChart3,
  AlertTriangle,
  ChevronRight,
} from "lucide-react-native";
import { getTeacherCourseStudentsReport } from "../services/reports";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BADGES, LAYOUT, FONTS } from "../utils/theme";

export default function StudentAttendanceReportScreen({ route, navigation }) {
  const { courseId } = route.params;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadStudentReport = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await getTeacherCourseStudentsReport(courseId);
      setReport(response.data);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Could not load student reports."
      );
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useFocusEffect(
    useCallback(() => {
      loadStudentReport();
    }, [loadStudentReport])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <AlertTriangle size={24} color={COLORS.error} style={styles.errorIcon} />
          <Text style={styles.errorTitleText}>Unable to load report</Text>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
        </View>
      </View>
    );
  }

  const { course, totalSessions, totalStudents, averageAttendance, students } = report || {};

  return (
    <View style={styles.container}>
      {/* Summary Header Card */}
      <View style={styles.headerCard}>
        <Text style={styles.courseName}>{course?.name ?? "Course Report"}</Text>
        <View style={styles.headerStatsRow}>
          <View style={styles.headerStatBox}>
            <CalendarDays size={16} color={COLORS.textInverse} style={styles.headerStatIcon} />
            <Text style={styles.headerStatNumber}>{totalSessions}</Text>
            <Text style={styles.headerStatLabel}>Sessions</Text>
          </View>
          <View style={styles.headerStatBox}>
            <Users size={16} color={COLORS.textInverse} style={styles.headerStatIcon} />
            <Text style={styles.headerStatNumber}>{totalStudents}</Text>
            <Text style={styles.headerStatLabel}>Students</Text>
          </View>
          <View style={styles.headerStatBox}>
            <BarChart3 size={16} color={COLORS.textInverse} style={styles.headerStatIcon} />
            <Text style={styles.headerStatNumber}>{averageAttendance}%</Text>
            <Text style={styles.headerStatLabel}>Avg Attendance</Text>
          </View>
        </View>
      </View>

      <Text style={styles.listTitle}>Student Performance (Lowest First)</Text>

      {students.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No students participated in this course yet.</Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.studentId.toString()}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => {
            const isDefaulter = item.attendancePercentage < 75;
            const badgeStyle = isDefaulter ? BADGES.danger : BADGES.success;
            const badgeText = isDefaulter ? "AT RISK" : "SAFE";

            return (
              <Pressable
                style={[
                  styles.studentCard,
                  isDefaulter && styles.defaulterCard,
                ]}
                onPress={() =>
                  navigation.navigate("StudentAttendanceHistory", {
                    courseId,
                    studentId: item.studentId,
                  })
                }
              >
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{item.name}</Text>
                  <Text style={styles.studentRoll}>Roll: {item.rollNumber}</Text>
                  
                  {/* Clean Horizontal Metadata */}
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsText}>
                      QR: {item.qrCount || 0}  •  Manual: {item.manualCount || 0}  •  Absent: {item.absentCount || 0}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.studentStats}>
                  <Text style={[styles.percentageText, { color: badgeStyle.color }]}>
                    {item.attendancePercentage}%
                  </Text>
                  <View style={[styles.statusBadge, badgeStyle]}>
                    <Text style={[styles.badgeText, { color: badgeStyle.color }]}>
                      {badgeText}
                    </Text>
                  </View>
                  <Text style={styles.fractionText}>
                    Present: {item.presentCount || 0}/{item.totalSessions}
                  </Text>
                </View>
                
                <ChevronRight size={16} color={COLORS.textSecondary} style={styles.chevronIcon} />
              </Pressable>
            );
          }}
        />
      )}
    </View>
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
    flex: 1,
    padding: SPACING.base,
    backgroundColor: COLORS.background,
  },
  headerCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.base,
    ...SHADOWS.md,
  },
  courseName: {
    fontSize: TYPOGRAPHY.sizes.screenTitle - 2,
    fontWeight: "bold",
    color: COLORS.textInverse,
    textAlign: "center",
    marginBottom: SPACING.md,
    fontFamily: FONTS.heading,
  },
  headerStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerStatBox: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    marginHorizontal: SPACING.xxs,
  },
  headerStatIcon: {
    marginBottom: 4,
    opacity: 0.9,
  },
  headerStatNumber: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "700",
    color: COLORS.textInverse,
    fontFamily: FONTS.body,
    marginBottom: 2,
  },
  headerStatLabel: {
    fontSize: TYPOGRAPHY.sizes.micro,
    color: COLORS.primaryLight,
    fontFamily: FONTS.body,
  },
  listTitle: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: FONTS.heading,
    marginBottom: SPACING.sm,
    paddingHorizontal: 4,
  },
  listContainer: {
    paddingBottom: 20,
  },
  studentCard: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.sm,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.xs,
  },
  defaulterCard: {
    borderColor: COLORS.border,
  },
  studentInfo: {
    flex: 1,
    marginRight: SPACING.xs,
  },
  studentName: {
    fontSize: TYPOGRAPHY.sizes.bodyLg - 1,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: FONTS.body,
    marginBottom: 2,
  },
  studentRoll: {
    fontSize: TYPOGRAPHY.sizes.metadata,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
  },
  studentStats: {
    alignItems: "flex-end",
    marginRight: 6,
  },
  fractionText: {
    fontSize: TYPOGRAPHY.sizes.micro,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    marginTop: 2,
  },
  percentageText: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "700",
    fontFamily: FONTS.heading,
    marginBottom: 2,
  },
  detailsRow: {
    marginTop: 6,
  },
  detailsText: {
    fontSize: TYPOGRAPHY.sizes.metadata,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
  },
  chevronIcon: {
    opacity: 0.7,
  },
  statusBadge: {
    borderRadius: RADIUS.xxl,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: TYPOGRAPHY.sizes.micro,
    fontWeight: "bold",
    fontFamily: FONTS.body,
  },
  errorCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.error,
    alignItems: "center",
  },
  errorIcon: {
    marginBottom: SPACING.xs,
  },
  errorTitleText: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "700",
    color: COLORS.error,
    marginBottom: 4,
    textAlign: "center",
    fontFamily: FONTS.heading,
  },
  errorMessageText: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.error,
    textAlign: "center",
    fontFamily: FONTS.body,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontFamily: FONTS.body,
  },
});
