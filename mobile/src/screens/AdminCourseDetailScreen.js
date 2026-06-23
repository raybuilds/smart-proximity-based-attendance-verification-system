import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  RefreshControl,
  Alert
} from "react-native";
import { BookOpen, Calendar, ShieldCheck, AlertCircle } from "lucide-react-native";
import { getAdminCourseDetail, archiveCourse } from "../services/admin";
import { COLORS, TYPOGRAPHY, LAYOUT } from "../utils/theme";
import FadeInContainer from "../components/FadeInContainer";
import InteractiveCard from "../components/InteractiveCard";
import SkeletonCard from "../components/SkeletonCard";
import EmptyState from "../components/EmptyState";

export default function AdminCourseDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDetail = useCallback(async () => {
    try {
      const response = await getAdminCourseDetail(id);
      setData(response.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load course details.");
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

  const handleArchive = () => {
    Alert.alert(
      "Archive Course",
      "Archive this course? Historical data will remain accessible.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await archiveCourse(id);
              Alert.alert("Success", "Course archived successfully.");
              navigation.goBack();
            } catch (err) {
              console.error(err);
              const errMsg = err.response?.data?.message || "Cannot archive a course with an active attendance session.";
              Alert.alert("Error", errMsg);
            }
          }
        }
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <SkeletonCard height={120} marginVertical={8} />
        <View style={styles.gridRow}>
          <SkeletonCard height={80} marginVertical={8} borderRadius={8} />
          <View style={{ width: 8 }} />
          <SkeletonCard height={80} marginVertical={8} borderRadius={8} />
        </View>
        <SkeletonCard height={150} marginVertical={8} />
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

  const { course, teacher, stats, sessions, defaulters, corrections } = data;

  return (
    <FadeInContainer style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Course Summary Header */}
        <View style={styles.headerBlock}>
          <Text style={styles.courseCode}>{course.code || "N/A"}</Text>
          <Text style={styles.courseName}>{course.name}</Text>
          <Text style={styles.teacherName}>Instructor: {teacher.name} ({teacher.email})</Text>
          <Text style={styles.metaText}>
            Dept: {course.department} | Sem: {course.year} | Sec: {course.section}
          </Text>
        </View>

        <Pressable style={styles.archiveButton} onPress={handleArchive}>
          <Text style={styles.archiveButtonText}>Archive Course</Text>
        </Pressable>

        {/* Aggregate Stats Cards */}
        <View style={styles.gridRow}>
          <InteractiveCard style={styles.statCard} onPress={() => {}}>
            <Text style={styles.statNum}>{stats.averageAttendance}%</Text>
            <Text style={styles.statLabel}>Avg Attendance</Text>
          </InteractiveCard>
          <InteractiveCard style={styles.statCard} onPress={() => {}}>
            <Text style={styles.statNum}>{stats.totalSessions}</Text>
            <Text style={styles.statLabel}>Total Classes</Text>
          </InteractiveCard>
        </View>
        <View style={styles.gridRow}>
          <InteractiveCard style={styles.statCard} onPress={() => {}}>
            <Text style={styles.statNum}>{stats.totalStudents}</Text>
            <Text style={styles.statLabel}>Enrolled Students</Text>
          </InteractiveCard>
          <InteractiveCard style={styles.statCard} onPress={() => {}}>
            <Text style={styles.statNum}>{stats.manualCorrections}</Text>
            <Text style={styles.statLabel}>Manual Edits</Text>
          </InteractiveCard>
        </View>

        {/* Sessions Conducted */}
        <Text style={styles.sectionTitle}>Recent Sessions (Max 20)</Text>
        {sessions.length === 0 ? (
          <EmptyState
            Icon={Calendar}
            title="No Sessions Conducted"
            description="No attendance sessions have been logged for this course."
          />
        ) : (
          <View style={styles.listCard}>
            {sessions.map((s, idx) => {
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
                  style={[styles.listItem, idx === sessions.length - 1 && { borderBottomWidth: 0 }]}
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

        {/* Defaulters list */}
        <Text style={styles.sectionTitle}>Defaulters List (&lt;75% Attendance)</Text>
        {defaulters.length === 0 ? (
          <EmptyState
            Icon={AlertCircle}
            title="No Defaulters"
            description="All students have maintained acceptable attendance above 75%."
          />
        ) : (
          <View style={styles.listCard}>
            {defaulters.map((d, idx) => (
              <View
                key={d.studentId}
                style={[styles.listItem, idx === defaulters.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View>
                  <Text style={styles.itemTitle}>{d.name}</Text>
                  <Text style={styles.itemSubtitle}>
                    Classes needed for 75%: {d.classesNeededFor75}
                  </Text>
                </View>
                <Text style={[styles.itemValue, { color: COLORS.error }]}>{d.attendancePercentage}%</Text>
              </View>
            ))}
          </View>
        )}

        {/* Manual Corrections list */}
        <Text style={styles.sectionTitle}>Recent Manual Corrections (Max 20)</Text>
        {corrections.length === 0 ? (
          <EmptyState
            Icon={ShieldCheck}
            title="No Corrections Logged"
            description="All records are based on automated proximity verification."
          />
        ) : (
          <View style={styles.listCard}>
            {corrections.map((c, idx) => {
              const timeStr = new Date(c.correctedOn).toLocaleDateString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              });
              return (
                <View
                  key={idx}
                  style={[styles.listItem, idx === corrections.length - 1 && { borderBottomWidth: 0 }]}
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
  teacherName: {
    color: COLORS.surface,
    fontSize: 13,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    opacity: 0.9,
    marginBottom: 4
  },
  metaText: {
    color: COLORS.secondary,
    fontSize: 12,
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
    opacity: 0.8,
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
  },
  archiveButton: {
    backgroundColor: "#FEE2E2",
    borderColor: "#EF4444",
    borderWidth: 1,
    borderRadius: LAYOUT.buttonRadius,
    height: LAYOUT.buttonHeight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16
  },
  archiveButtonText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.body.fontFamily
  }
});
