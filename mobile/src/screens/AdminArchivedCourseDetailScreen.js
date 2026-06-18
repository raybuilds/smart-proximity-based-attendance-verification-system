import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert
} from "react-native";
import { getArchivedCourseDetail, restoreCourse } from "../services/admin";
import { COLORS, TYPOGRAPHY, LAYOUT } from "../utils/theme";

export default function AdminArchivedCourseDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDetail = useCallback(async () => {
    try {
      const response = await getArchivedCourseDetail(id);
      setData(response.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load archived course details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDetail();
  }, [loadDetail]);

  const handleRestore = () => {
    Alert.alert(
      "Restore Course",
      "Are you sure you want to restore this course to active status?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await restoreCourse(id);
              Alert.alert("Success", "Course restored successfully.");
              navigation.goBack();
            } catch (err) {
              console.error(err);
              Alert.alert("Error", err.response?.data?.message || "Failed to restore course.");
            }
          }
        }
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error || "Course details not found."}</Text>
        </View>
        <Pressable style={styles.retryButton} onPress={loadDetail}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const { course, statistics, recentSessions, recentCorrections } = data;
  const archiveDateStr = course.archivedAt
    ? new Date(course.archivedAt).toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    : "N/A";

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
      }
    >
      {/* Course Info block */}
      <View style={styles.headerBlock}>
        <Text style={styles.courseCode}>{course.code || "N/A"}</Text>
        <Text style={styles.courseName}>{course.name}</Text>
        <Text style={styles.metaText}>
          Dept: {course.department} | Sem: {course.semester} | Sec: {course.section}
        </Text>
        <Text style={styles.archiveDateText}>Archived on: {archiveDateStr}</Text>
      </View>

      {/* Restore control button */}
      <Pressable style={styles.restoreButton} onPress={handleRestore}>
        <Text style={styles.restoreButtonText}>Restore Course</Text>
      </Pressable>

      {/* Stats Cards */}
      <Text style={styles.sectionTitle}>Statistics</Text>
      <View style={styles.gridRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{statistics.averageAttendance}%</Text>
          <Text style={styles.statLabel}>Avg Attendance</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{statistics.totalSessions}</Text>
          <Text style={styles.statLabel}>Total Sessions</Text>
        </View>
      </View>
      <View style={styles.gridRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{statistics.totalStudents}</Text>
          <Text style={styles.statLabel}>Enrolled Students</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{statistics.manualCorrections}</Text>
          <Text style={styles.statLabel}>Manual Corrections</Text>
        </View>
      </View>

      {/* Recent Sessions */}
      <Text style={styles.sectionTitle}>Recent Sessions (Max 20)</Text>
      {recentSessions.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>No sessions conducted yet</Text>
        </View>
      ) : (
        <View style={styles.listCard}>
          {recentSessions.map((s, idx) => {
            const dateStr = new Date(s.startedAt).toLocaleDateString([], {
              month: "short",
              day: "numeric",
              year: "numeric"
            });
            const timeStr = new Date(s.startedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            });
            return (
              <View
                key={s.sessionId}
                style={[
                  styles.listItem,
                  idx === recentSessions.length - 1 && { borderBottomWidth: 0 }
                ]}
              >
                <View>
                  <Text style={styles.itemTitle}>{dateStr} - {timeStr}</Text>
                  <Text style={styles.itemSubtitle}>Attendance Count: {s.attendanceCount}</Text>
                </View>
                <Text style={styles.itemValue}>{s.attendancePercentage}%</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Recent Corrections */}
      <Text style={styles.sectionTitle}>Recent Corrections (Max 20)</Text>
      {recentCorrections.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>No manual corrections logged</Text>
        </View>
      ) : (
        <View style={styles.listCard}>
          {recentCorrections.map((c, idx) => {
            const timeStr = new Date(c.correctedOn).toLocaleDateString([], {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            });
            return (
              <View
                key={idx}
                style={[
                  styles.listItem,
                  idx === recentCorrections.length - 1 && { borderBottomWidth: 0 }
                ]}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.itemTitle}>{c.studentName}</Text>
                  <Text style={styles.itemSubtitle}>Reason: {c.reason || "Not specified"}</Text>
                </View>
                <Text style={styles.timeLabel}>{timeStr}</Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 16
  },
  container: {
    padding: 16,
    backgroundColor: COLORS.background,
    flexGrow: 1
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
    elevation: 3
  },
  courseCode: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  courseName: {
    color: COLORS.surface,
    fontSize: 20,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: "bold",
    marginVertical: 4,
    textAlign: "center"
  },
  metaText: {
    color: COLORS.surface,
    fontSize: 13,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    opacity: 0.9,
    marginBottom: 4
  },
  archiveDateText: {
    color: COLORS.secondary,
    fontSize: 12,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  restoreButton: {
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.buttonRadius,
    height: LAYOUT.buttonHeight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16
  },
  restoreButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  statCard: {
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
  statNum: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.heading.fontFamily
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginTop: 4,
    textAlign: "center"
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 10
  },
  listCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 10
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  itemSubtitle: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginTop: 2
  },
  itemValue: {
    fontSize: 15,
    fontWeight: "bold",
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  timeLabel: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  emptyText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 14,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  errorCard: {
    backgroundColor: "#FEE2E2",
    borderRadius: LAYOUT.cardRadius,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    marginBottom: 16
  },
  errorText: {
    color: COLORS.error,
    textAlign: "center",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.buttonRadius,
    paddingVertical: 10,
    paddingHorizontal: 20
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.body.fontFamily
  }
});
