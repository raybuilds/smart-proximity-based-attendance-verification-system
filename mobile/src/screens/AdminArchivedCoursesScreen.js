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
import { getAdminCourses, getArchivedCourses, archiveCourse } from "../services/admin";
import { COLORS, TYPOGRAPHY, LAYOUT } from "../utils/theme";

export default function AdminArchivedCoursesScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState("active"); // "active" or "archived"
  const [activeCourses, setActiveCourses] = useState([]);
  const [archivedCourses, setArchivedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [activeRes, archivedRes] = await Promise.all([
        getAdminCourses(),
        getArchivedCourses()
      ]);
      // Filter getAdminCourses to only show active ones on active tab
      setActiveCourses(activeRes.data.filter(c => !c.isArchived));
      setArchivedCourses(archivedRes.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load courses data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleArchive = (course) => {
    Alert.alert(
      "Archive Course",
      "Archive this course? Historical data will remain accessible.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await archiveCourse(course.courseId);
              Alert.alert("Success", "Course archived successfully.");
              loadData();
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
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const currentList = activeTab === "active" ? activeCourses : archivedCourses;

  return (
    <View style={styles.container}>
      {/* Tab Header */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, activeTab === "active" && styles.activeTab]}
          onPress={() => setActiveTab("active")}
        >
          <Text style={[styles.tabText, activeTab === "active" && styles.activeTabText]}>
            Active Courses
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "archived" && styles.activeTab]}
          onPress={() => setActiveTab("archived")}
        >
          <Text style={[styles.tabText, activeTab === "archived" && styles.activeTabText]}>
            Archived Courses
          </Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
          <Pressable style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
        >
          {currentList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {activeTab === "active" ? "No active courses found" : "No archived courses found"}
              </Text>
            </View>
          ) : (
            currentList.map((course) => {
              if (activeTab === "active") {
                return (
                  <View key={course.courseId} style={styles.card}>
                    <View style={styles.cardRow}>
                      <View style={styles.mainInfo}>
                        <Text style={styles.courseHeader}>
                          {course.courseCode ? `${course.courseCode} - ` : ""}{course.courseName}
                        </Text>
                        <Text style={styles.infoText}>Teacher: {course.teacherName}</Text>
                        <Text style={styles.infoText}>Sessions: {course.totalSessions || 0}</Text>
                        <Text style={styles.infoText}>Attendance: {course.attendancePercentage}%</Text>
                      </View>
                      <Pressable
                        style={styles.archiveButton}
                        onPress={() => handleArchive(course)}
                      >
                        <Text style={styles.archiveButtonText}>Archive Course</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              } else {
                const dateStr = new Date(course.archivedAt).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                });
                return (
                  <Pressable
                    key={course.courseId}
                    style={styles.card}
                    onPress={() =>
                      navigation.navigate("AdminArchivedCourseDetail", { id: course.courseId })
                    }
                  >
                    <View style={styles.cardRow}>
                      <View style={styles.mainInfo}>
                        <Text style={styles.courseHeader}>
                          {course.courseCode ? `${course.courseCode} - ` : ""}{course.courseName}
                        </Text>
                        <Text style={styles.infoText}>Teacher: {course.teacherName}</Text>
                        <Text style={styles.infoText}>Archived: {dateStr}</Text>
                        <Text style={styles.infoText}>Sessions: {course.totalSessions || 0}</Text>
                        <Text style={styles.infoText}>Attendance: {course.averageAttendance}%</Text>
                      </View>
                      <View style={styles.arrowContainer}>
                        <Text style={styles.arrow}>&gt;</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }
            })
          )}
        </ScrollView>
      )}
    </View>
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
    flex: 1,
    backgroundColor: COLORS.background
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent"
  },
  activeTab: {
    borderBottomColor: COLORS.primary
  },
  tabText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  activeTabText: {
    color: COLORS.primary
  },
  scrollContainer: {
    padding: 16,
    flexGrow: 1
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  mainInfo: {
    flex: 1,
    paddingRight: 10
  },
  courseHeader: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    marginBottom: 6
  },
  infoText: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    opacity: 0.8,
    marginBottom: 2
  },
  archiveButton: {
    backgroundColor: "#FEE2E2",
    borderColor: "#EF4444",
    borderWidth: 1,
    borderRadius: LAYOUT.buttonRadius,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  archiveButtonText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  arrowContainer: {
    justifyContent: "center",
    paddingLeft: 8
  },
  arrow: {
    fontSize: 18,
    color: "#64748b",
    fontWeight: "bold"
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 14,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16
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
