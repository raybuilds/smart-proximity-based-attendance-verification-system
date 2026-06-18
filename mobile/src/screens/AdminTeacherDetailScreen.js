import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert
} from "react-native";
import { getAdminTeacherDetail } from "../services/admin";
import { COLORS, TYPOGRAPHY, LAYOUT } from "../utils/theme";

export default function AdminTeacherDetailScreen({ route }) {
  const { id } = route.params;
  const [teacherData, setTeacherData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDetail() {
      try {
        const response = await getAdminTeacherDetail(id);
        setTeacherData(response.data);
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Could not load teacher details.");
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

  if (!teacherData) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No teacher details found.</Text>
      </View>
    );
  }

  const { profile, courses, activeSessions, averageAttendance, manualCorrections } = teacherData;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Profile Section */}
      <Text style={styles.sectionTitle}>Teacher Profile</Text>
      <View style={styles.profileCard}>
        <Text style={styles.profileName}>{profile.name}</Text>
        <Text style={styles.profileMeta}>Employee ID: {profile.employeeId}</Text>
        <Text style={styles.profileMeta}>Email: {profile.email}</Text>
        <Text style={styles.profileMeta}>Department: {profile.department}</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status: </Text>
          <View style={[styles.statusBadge, profile.isActive ? styles.badgeActive : styles.badgeInactive]}>
            <Text style={styles.statusText}>{profile.isActive ? "ACTIVE" : "INACTIVE"}</Text>
          </View>
        </View>
      </View>

      {/* Metrics Summary */}
      <Text style={styles.sectionTitle}>Performance Oversight</Text>
      <View style={styles.summaryGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricVal}>{averageAttendance}%</Text>
          <Text style={styles.metricLabel}>Average Attendance</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricVal}>{manualCorrections}</Text>
          <Text style={styles.metricLabel}>Corrections Performed</Text>
        </View>
      </View>

      {/* Active Sessions */}
      <Text style={styles.sectionTitle}>Ongoing Attendance Sessions</Text>
      {activeSessions.length === 0 ? (
        <View style={styles.cardEmpty}>
          <Text style={styles.emptyText}>No ongoing sessions.</Text>
        </View>
      ) : (
        activeSessions.map((session, index) => (
          <View key={index} style={styles.sessionCard}>
            <Text style={styles.sessionCourse}>{session.courseName}</Text>
            <Text style={styles.sessionMeta}>Code: {session.sessionCode}</Text>
            <Text style={styles.sessionMeta}>Started: {new Date(session.startedAt).toLocaleString()}</Text>
          </View>
        ))
      )}

      {/* Courses Section */}
      <Text style={styles.sectionTitle}>Assigned Courses</Text>
      {courses.length === 0 ? (
        <View style={styles.cardEmpty}>
          <Text style={styles.emptyText}>No assigned courses.</Text>
        </View>
      ) : (
        courses.map((course, index) => (
          <View key={index} style={styles.courseCard}>
            <View style={styles.courseHeader}>
              <View>
                <Text style={styles.courseName}>{course.name}</Text>
                {course.code ? <Text style={styles.courseCode}>{course.code}</Text> : null}
              </View>
              {course.isArchived ? (
                <View style={styles.archivedBadge}>
                  <Text style={styles.archivedBadgeText}>ARCHIVED</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.courseMeta}>
              Roster: {course.department} | Sem: {course.semester} | Sec: {course.section}
            </Text>
          </View>
        ))
      )}
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
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  metricCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    width: "48%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1
  },
  metricVal: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.heading.fontFamily
  },
  metricLabel: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginTop: 4,
    textAlign: "center"
  },
  cardEmpty: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: "center"
  },
  emptyText: {
    fontSize: 13,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  sessionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1
  },
  sessionCourse: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    marginBottom: 4
  },
  sessionMeta: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginBottom: 2
  },
  courseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1
  },
  courseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6
  },
  courseName: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.heading.fontFamily
  },
  courseCode: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginTop: 1
  },
  archivedBadge: {
    backgroundColor: "#F3F4F6",
    borderColor: "#D1D5DB",
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  archivedBadgeText: {
    fontSize: 9,
    color: "#4B5563",
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  courseMeta: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily
  }
});
