import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert
} from "react-native";
import { getAdminStudentDetail } from "../services/admin";
import { COLORS, TYPOGRAPHY, LAYOUT } from "../utils/theme";

export default function AdminStudentDetailScreen({ route }) {
  const { id } = route.params;
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDetail() {
      try {
        const response = await getAdminStudentDetail(id);
        setStudentData(response.data);
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Could not load student details.");
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!studentData) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No student details found.</Text>
      </View>
    );
  }

  const { profile, overallAttendance, courses, riskSummary } = studentData;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Profile Card */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Student Profile</Text>
      </View>
      <View style={styles.profileCard}>
        <Text style={styles.profileName}>{profile.name}</Text>
        <Text style={styles.profileMeta}>Roll Number: {profile.rollNumber}</Text>
        <Text style={styles.profileMeta}>Email: {profile.email}</Text>
        <Text style={styles.profileMeta}>Department: {profile.department}</Text>
        <Text style={styles.profileMeta}>Semester: {profile.semester} | Section: {profile.section}</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status: </Text>
          <View style={[styles.statusBadge, profile.isActive ? styles.badgeActive : styles.badgeInactive]}>
            <Text style={styles.statusText}>{profile.isActive ? "ACTIVE" : "INACTIVE"}</Text>
          </View>
        </View>
      </View>

      {/* Attendance Summary */}
      <Text style={styles.sectionTitle}>Attendance Summary</Text>
      <View style={styles.summaryCard}>
        <View style={styles.percentageContainer}>
          <Text style={styles.percentageValue}>{overallAttendance}%</Text>
          <Text style={styles.percentageLabel}>Overall Attendance</Text>
        </View>
        <View style={styles.riskBadgeContainer}>
          <View
            style={[
              styles.riskBanner,
              riskSummary.status === "safe"
                ? styles.bannerSafe
                : riskSummary.status === "warning"
                ? styles.bannerWarning
                : styles.bannerRisk
            ]}
          >
            <Text style={styles.riskBannerText}>
              {riskSummary.status === "safe"
                ? "Requirement Met"
                : riskSummary.status === "warning"
                ? "Warning Threshold"
                : "Attendance Critical"}
            </Text>
          </View>
          <Text style={styles.riskDesc}>
            At risk in {riskSummary.atRiskCoursesCount} course(s)
          </Text>
        </View>
      </View>

      {/* Enrolled Courses */}
      <Text style={styles.sectionTitle}>Enrolled Courses</Text>
      {courses.length === 0 ? (
        <View style={styles.courseCard}>
          <Text style={styles.emptyText}>Not enrolled in any active courses.</Text>
        </View>
      ) : (
        courses.map((course, index) => (
          <View key={index} style={styles.courseCard}>
            <View style={styles.courseHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.courseName}>{course.courseName}</Text>
                {course.courseCode ? <Text style={styles.courseCode}>{course.courseCode}</Text> : null}
              </View>
              <Text
                style={[
                  styles.courseAttendance,
                  course.riskLevel === "atRisk"
                    ? styles.textRisk
                    : course.riskLevel === "warning"
                    ? styles.textWarning
                    : styles.textSafe
                ]}
              >
                {course.attendancePercentage}%
              </Text>
            </View>

            <View style={styles.courseStats}>
              <Text style={styles.statDetail}>Present: {course.presentCount} / {course.totalSessions} sessions</Text>
            </View>

            {/* Recovery Guidance inside list card */}
            <View style={styles.recoveryBox}>
              <Text style={styles.recoveryTitle}>Oversight Recovery Guidance:</Text>
              {course.riskLevel === "safe" || course.riskLevel === "warning" ? (
                <Text style={styles.recoveryText}>Safe: Attendance requirement is currently met.</Text>
              ) : (
                <Text style={styles.recoveryText}>
                  Requires <Text style={{ fontWeight: "bold", color: COLORS.error }}>{course.classesNeededFor75}</Text> consecutive present classes to reach 75%. (Projected: {course.projectedPercentageAfterRecovery}%)
                </Text>
              )}
            </View>
          </View>
        ))
      )}

      {/* Admin Password Recovery Section */}
      <Text style={styles.sectionTitle}>Administrative Actions</Text>
      <View style={styles.profileCard}>
        <Text style={styles.recoveryTitle}>Account Password Reset</Text>
        <Text style={styles.recoveryText}>
          Generate a temporary password for this student. They will be forced to change it on their next login.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.resetButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => {
            const tempPass = "TempPass" + Math.floor(1000 + Math.random() * 9000);
            Alert.alert(
              "Confirm Reset",
              `Are you sure you want to reset this user's password to: ${tempPass}?`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Reset",
                  onPress: async () => {
                    try {
                      const { resetUserPassword } = require("../services/admin");
                      await resetUserPassword(profile.id, tempPass);
                      Alert.alert(
                        "Password Reset",
                        `Password reset successful.\n\nTemporary Password: ${tempPass}\n\nPlease share this password securely with the student.`,
                        [{ text: "OK" }]
                      );
                    } catch (err) {
                      Alert.alert("Error", err.response?.data?.message || "Failed to reset password.");
                    }
                  }
                }
              ]
            );
          }}
        >
          <Text style={styles.resetButtonText}>Reset Student Password</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background
  },
  container: {
    padding: 16,
    backgroundColor: COLORS.background,
    flexGrow: 1
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  sectionHeader: {
    marginTop: 8
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1
  },
  profileName: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    marginBottom: 8
  },
  profileMeta: {
    fontSize: 13,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginBottom: 4
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 8
  },
  statusLabel: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  badgeActive: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: COLORS.success
  },
  badgeInactive: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: COLORS.error
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1
  },
  percentageContainer: {
    width: "45%",
    alignItems: "center"
  },
  percentageValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.heading.fontFamily
  },
  percentageLabel: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginTop: 4,
    textAlign: "center"
  },
  riskBadgeContainer: {
    width: "50%",
    alignItems: "center"
  },
  riskBanner: {
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    width: "100%",
    alignItems: "center"
  },
  bannerSafe: {
    backgroundColor: "#DCFCE7"
  },
  bannerWarning: {
    backgroundColor: "#FEF3C7"
  },
  bannerRisk: {
    backgroundColor: "#FEE2E2"
  },
  riskBannerText: {
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  riskDesc: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginTop: 6
  },
  courseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1
  },
  courseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8
  },
  courseName: {
    fontSize: 15,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.heading.fontFamily
  },
  courseCode: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginTop: 2
  },
  courseAttendance: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.heading.fontFamily
  },
  courseStats: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 8
  },
  statDetail: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  recoveryBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 4,
    padding: 10
  },
  recoveryTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginBottom: 2
  },
  recoveryText: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  textRisk: {
    color: COLORS.error
  },
  textWarning: {
    color: COLORS.warning
  },
  textSafe: {
    color: COLORS.success
  },
  emptyText: {
    fontSize: 14,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    textAlign: "center"
  },
  resetButton: {
    backgroundColor: COLORS.error,
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  buttonPressed: {
    opacity: 0.8
  }
});
