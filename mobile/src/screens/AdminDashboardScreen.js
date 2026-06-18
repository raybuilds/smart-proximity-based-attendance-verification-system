import React, { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { getAdminDashboard, getAdminRecentActivity } from "../services/admin";
import { COLORS, TYPOGRAPHY, LAYOUT } from "../utils/theme";

export default function AdminDashboardScreen({ navigation }) {
  const { signOut, user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [dashData, activityData] = await Promise.all([
        getAdminDashboard(),
        getAdminRecentActivity()
      ]);
      setDashboard(dashData.data);
      setRecentActivity(activityData.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard data.");
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

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
      }
    >
      <View style={styles.headerBlock}>
        <Text style={styles.headerTitle}>Institutional Oversight</Text>
        <Text style={styles.headerSubtitle}>Admin: {user?.name || "Administrator"}</Text>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {dashboard ? (
        <>
          {/* Overview Section */}
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.gridRow}>
            <Pressable
              style={styles.statCard}
              onPress={() => navigation.navigate("AdminStudentList")}
            >
              <Text style={styles.statNum}>{dashboard.totalStudents}</Text>
              <Text style={styles.statLabel}>Students</Text>
            </Pressable>
            <Pressable
              style={styles.statCard}
              onPress={() => navigation.navigate("AdminTeacherList")}
            >
              <Text style={styles.statNum}>{dashboard.totalTeachers}</Text>
              <Text style={styles.statLabel}>Teachers</Text>
            </Pressable>
          </View>

          <View style={styles.gridRow}>
            <Pressable
              style={styles.statCard}
              onPress={() => navigation.navigate("AdminCourseList")}
            >
              <Text style={styles.statNum}>{dashboard.activeCourses}</Text>
              <Text style={styles.statLabel}>Active Courses</Text>
            </Pressable>
            <Pressable
              style={styles.statCard}
              onPress={() => navigation.navigate("AdminLiveSessions")}
            >
              <Text style={styles.statNum}>{dashboard.activeSessions}</Text>
              <Text style={styles.statLabel}>Active Sessions</Text>
            </Pressable>
          </View>

          {/* Quick Metrics / Admin Notes */}
          <Text style={styles.sectionTitle}>Status Notes</Text>
          <View style={styles.noteCard}>
            <Pressable
              style={styles.noteItem}
              onPress={() => navigation.navigate("AdminAtRisk")}
            >
              <Text style={styles.noteTitle}>At-Risk Students (&lt;75%):</Text>
              <Text style={[styles.noteValue, { color: COLORS.error }]}>{dashboard.atRiskStudents}</Text>
            </Pressable>
            <Pressable
              style={styles.noteItem}
              onPress={() => navigation.navigate("AdminAuditCenter")}
            >
              <Text style={styles.noteTitle}>Manual Corrections (Total):</Text>
              <Text style={styles.noteValue}>{dashboard.manualCorrections}</Text>
            </Pressable>
            <Pressable
              style={styles.noteItem}
              onPress={() => navigation.navigate("AdminAnalytics")}
            >
              <Text style={styles.noteTitle}>Avg Attendance Today (View Analytics):</Text>
              <Text style={styles.noteValue}>{dashboard.attendanceToday}%</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {/* Navigation shortcuts */}
      <Text style={styles.sectionTitle}>Management Controls</Text>
      <View style={styles.actionRow}>
        <Pressable
          style={styles.actionButton}
          onPress={() => navigation.navigate("AdminCourseList")}
        >
          <Text style={styles.actionButtonText}>View Courses</Text>
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => navigation.navigate("AdminAnalytics")}
        >
          <Text style={styles.actionButtonText}>Analytics</Text>
        </Pressable>
      </View>
      <View style={styles.actionRow}>
        <Pressable
          style={styles.actionButton}
          onPress={() => navigation.navigate("AdminLiveSessions")}
        >
          <Text style={styles.actionButtonText}>Live Sessions</Text>
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => navigation.navigate("AdminAuditCenter")}
        >
          <Text style={styles.actionButtonText}>Audit Center</Text>
        </Pressable>
      </View>
      <View style={styles.actionRow}>
        <Pressable
          style={styles.actionButton}
          onPress={() => navigation.navigate("AdminArchivedCourses")}
        >
          <Text style={styles.actionButtonText}>Course Archive</Text>
        </Pressable>
      </View>



      {/* Recent Activity Feed */}
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {recentActivity.length === 0 ? (
        <View style={styles.activityCard}>
          <Text style={styles.emptyActivityText}>No recent activity found.</Text>
        </View>
      ) : (
        <View style={styles.activityCard}>
          {recentActivity.map((activity, index) => {
            const formattedTime = new Date(activity.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            });
            const formattedDate = new Date(activity.createdAt).toLocaleDateString([], {
              month: "short",
              day: "numeric"
            });

            return (
              <View
                key={index}
                style={[
                  styles.activityItem,
                  index === recentActivity.length - 1 && { borderBottomWidth: 0 }
                ]}
              >
                <View style={styles.activityTimeContainer}>
                  <Text style={styles.activityTimeText}>{formattedTime}</Text>
                  <Text style={styles.activityDateText}>{formattedDate}</Text>
                </View>
                <View style={styles.activityContentContainer}>
                  <Text style={styles.activityText}>{activity.message}</Text>
                  <Text style={styles.activityTypeText}>{activity.type.replace("_", " ")}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Pressable style={styles.logoutButton} onPress={signOut}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </Pressable>
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
  headerTitle: {
    color: COLORS.surface,
    fontSize: 22,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: "bold"
  },
  headerSubtitle: {
    color: COLORS.secondary,
    fontSize: 14,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginTop: 4
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8
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
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.heading.fontFamily
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginTop: 4
  },
  noteCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 10
  },
  noteItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  noteTitle: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  noteValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  actionButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: LAYOUT.buttonRadius,
    paddingVertical: 12,
    width: "48%",
    alignItems: "center"
  },
  actionButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  activityCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 20
  },
  emptyActivityText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 14,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    paddingVertical: 10
  },
  activityItem: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    alignItems: "center"
  },
  activityTimeContainer: {
    width: "25%"
  },
  activityTimeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  activityDateText: {
    fontSize: 10,
    color: "#94a3b8",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  activityContentContainer: {
    flex: 1,
    paddingLeft: 8
  },
  activityText: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: "500"
  },
  activityTypeText: {
    fontSize: 10,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginTop: 2,
    textTransform: "uppercase"
  },
  logoutButton: {
    backgroundColor: COLORS.error,
    borderRadius: LAYOUT.buttonRadius,
    height: LAYOUT.buttonHeight,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  errorCard: {
    backgroundColor: "#FEE2E2",
    borderRadius: LAYOUT.cardRadius,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FCA5A5"
  },
  errorText: {
    color: COLORS.error,
    textAlign: "center",
    fontFamily: TYPOGRAPHY.body.fontFamily
  }
});
