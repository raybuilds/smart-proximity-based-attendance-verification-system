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
import { COLORS, TYPOGRAPHY, LAYOUT, SHADOWS } from "../utils/theme";
import {
  Shield,
  Users,
  GraduationCap,
  BookOpen,
  Activity,
  XCircle,
  Edit,
  TrendingUp,
  ChevronRight,
  BarChart2,
  Radio,
  ClipboardList,
  Archive,
  LogOut,
  AlertCircle,
  Clock
} from "lucide-react-native";

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
        <Text style={styles.loadingText}>Loading dashboard…</Text>
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
      {/* Welcome Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerIconWrap}>
          <Shield size={32} color="#FFFFFF" />
        </View>
        <Text style={styles.headerTitle}>Institutional Oversight</Text>
        <Text style={styles.headerSubtitle}>
          Admin: {user?.name || "Administrator"}
        </Text>
      </View>

      {/* Error Card */}
      {error ? (
        <View style={styles.errorCard}>
          <AlertCircle size={18} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {dashboard ? (
        <>
          {/* Primary Metrics Grid 2x2 */}
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.gridRow}>
            <Pressable
              style={styles.statCard}
              onPress={() => navigation.navigate("AdminStudentList")}
            >
              <View style={styles.statIconWrap}>
                <Users size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.statNum}>{dashboard.totalStudents}</Text>
              <Text style={styles.statLabel}>Students</Text>
            </Pressable>

            <Pressable
              style={styles.statCard}
              onPress={() => navigation.navigate("AdminTeacherList")}
            >
              <View style={styles.statIconWrap}>
                <GraduationCap size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.statNum}>{dashboard.totalTeachers}</Text>
              <Text style={styles.statLabel}>Teachers</Text>
            </Pressable>
          </View>

          <View style={styles.gridRow}>
            <Pressable
              style={styles.statCard}
              onPress={() => navigation.navigate("AdminCourseList")}
            >
              <View style={styles.statIconWrap}>
                <BookOpen size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.statNum}>{dashboard.activeCourses}</Text>
              <Text style={styles.statLabel}>Active Courses</Text>
            </Pressable>

            <Pressable
              style={styles.statCard}
              onPress={() => navigation.navigate("AdminLiveSessions")}
            >
              <View style={styles.statIconWrap}>
                <Activity size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.statNum}>{dashboard.activeSessions}</Text>
              <Text style={styles.statLabel}>Active Sessions</Text>
            </Pressable>
          </View>

          {/* Status Notes */}
          <Text style={styles.sectionTitle}>Status Notes</Text>
          <View style={styles.noteCard}>
            <Pressable
              style={styles.noteRow}
              onPress={() => navigation.navigate("AdminAtRisk")}
            >
              <View style={styles.noteLeftGroup}>
                <XCircle size={18} color={COLORS.error} />
                <Text style={styles.noteLabel}>At-Risk Students (&lt;75%)</Text>
              </View>
              <Text style={[styles.noteValue, { color: COLORS.error }]}>
                {dashboard.atRiskStudents}
              </Text>
            </Pressable>

            <View style={styles.noteDivider} />

            <Pressable
              style={styles.noteRow}
              onPress={() => navigation.navigate("AdminAuditCenter")}
            >
              <View style={styles.noteLeftGroup}>
                <Edit size={18} color={COLORS.primary} />
                <Text style={styles.noteLabel}>Manual Corrections</Text>
              </View>
              <Text style={styles.noteValue}>{dashboard.manualCorrections}</Text>
            </Pressable>

            <View style={styles.noteDivider} />

            <Pressable
              style={styles.noteRow}
              onPress={() => navigation.navigate("AdminAnalytics")}
            >
              <View style={styles.noteLeftGroup}>
                <TrendingUp size={18} color={COLORS.primary} />
                <Text style={styles.noteLabel}>Avg Attendance Today</Text>
              </View>
              <Text style={styles.noteValue}>{dashboard.attendanceToday}%</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {/* Management Controls */}
      <Text style={styles.sectionTitle}>Management Controls</Text>
      <View style={styles.modulesCard}>
        <Pressable
          style={styles.moduleTile}
          onPress={() => navigation.navigate("AdminCourseList")}
        >
          <View style={styles.moduleLeft}>
            <View style={styles.moduleIconWrap}>
              <BookOpen size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.moduleLabel}>View Courses</Text>
          </View>
          <ChevronRight size={18} color={COLORS.textSecondary} />
        </Pressable>

        <View style={styles.tileDivider} />

        <Pressable
          style={styles.moduleTile}
          onPress={() => navigation.navigate("AdminAnalytics")}
        >
          <View style={styles.moduleLeft}>
            <View style={styles.moduleIconWrap}>
              <BarChart2 size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.moduleLabel}>Analytics</Text>
          </View>
          <ChevronRight size={18} color={COLORS.textSecondary} />
        </Pressable>

        <View style={styles.tileDivider} />

        <Pressable
          style={styles.moduleTile}
          onPress={() => navigation.navigate("AdminLiveSessions")}
        >
          <View style={styles.moduleLeft}>
            <View style={styles.moduleIconWrap}>
              <Radio size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.moduleLabel}>Live Sessions</Text>
          </View>
          <ChevronRight size={18} color={COLORS.textSecondary} />
        </Pressable>

        <View style={styles.tileDivider} />

        <Pressable
          style={styles.moduleTile}
          onPress={() => navigation.navigate("AdminAuditCenter")}
        >
          <View style={styles.moduleLeft}>
            <View style={styles.moduleIconWrap}>
              <ClipboardList size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.moduleLabel}>Audit Center</Text>
          </View>
          <ChevronRight size={18} color={COLORS.textSecondary} />
        </Pressable>

        <View style={styles.tileDivider} />

        <Pressable
          style={styles.moduleTile}
          onPress={() => navigation.navigate("AdminArchivedCourses")}
        >
          <View style={styles.moduleLeft}>
            <View style={styles.moduleIconWrap}>
              <Archive size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.moduleLabel}>Course Archive</Text>
          </View>
          <ChevronRight size={18} color={COLORS.textSecondary} />
        </Pressable>

        <View style={styles.tileDivider} />

        <Pressable
          style={styles.moduleTile}
          onPress={() => navigation.navigate("AdminStudentList")}
        >
          <View style={styles.moduleLeft}>
            <View style={styles.moduleIconWrap}>
              <Users size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.moduleLabel}>Students</Text>
          </View>
          <ChevronRight size={18} color={COLORS.textSecondary} />
        </Pressable>

        <View style={styles.tileDivider} />

        <Pressable
          style={styles.moduleTile}
          onPress={() => navigation.navigate("AdminTeacherList")}
        >
          <View style={styles.moduleLeft}>
            <View style={styles.moduleIconWrap}>
              <GraduationCap size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.moduleLabel}>Teachers</Text>
          </View>
          <ChevronRight size={18} color={COLORS.textSecondary} />
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
                <View style={styles.activityDotWrap}>
                  <View style={styles.activityDot} />
                </View>

                <View style={styles.activityContentContainer}>
                  <Text style={styles.activityText}>{activity.message}</Text>
                  <Text style={styles.activityTypeText}>
                    {activity.type.replace("_", " ")}
                  </Text>
                </View>

                <View style={styles.activityTimeContainer}>
                  <View style={styles.activityTimeRow}>
                    <Clock size={10} color={COLORS.textSecondary} />
                    <Text style={styles.activityTimeText}> {formattedTime}</Text>
                  </View>
                  <Text style={styles.activityDateText}>{formattedDate}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Logout */}
      <Pressable style={styles.logoutButton} onPress={signOut}>
        <LogOut size={18} color="#FFFFFF" />
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
  loadingText: {
    marginTop: 12,
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  container: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: LAYOUT.spacing.lg,
    paddingBottom: 32,
    backgroundColor: COLORS.background,
    flexGrow: 1
  },

  /* Header Card */
  headerCard: {
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.cardRadius,
    paddingVertical: 28,
    paddingHorizontal: LAYOUT.cardPadding,
    alignItems: "center",
    marginBottom: LAYOUT.cardGap,
    ...SHADOWS.md
  },
  headerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12
  },
  headerTitle: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.sizes.screenTitle,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: "bold",
    textAlign: "center"
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: TYPOGRAPHY.sizes.body,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginTop: 4,
    textAlign: "center"
  },

  /* Error Card */
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.errorLight,
    borderRadius: LAYOUT.cardRadius,
    padding: LAYOUT.spacing.md,
    marginBottom: LAYOUT.cardGap,
    borderWidth: 1,
    borderColor: "#F5C6C3"
  },
  errorText: {
    flex: 1,
    color: COLORS.error,
    fontSize: TYPOGRAPHY.sizes.body,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },

  /* Section Title */
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.sectionTitle,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: LAYOUT.spacing.xl,
    marginBottom: LAYOUT.spacing.sm
  },

  /* Stat Cards */
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: LAYOUT.spacing.sm
  },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: LAYOUT.cardPadding,
    width: "48.5%",
    alignItems: "center",
    ...SHADOWS.sm
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10
  },
  statNum: {
    fontSize: TYPOGRAPHY.sizes.cardMetric,
    fontWeight: "bold",
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.heading.fontFamily
  },
  statLabel: {
    fontSize: TYPOGRAPHY.sizes.metadata,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginTop: 4,
    textAlign: "center"
  },

  /* Status Notes */
  noteCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: LAYOUT.cardPadding,
    marginBottom: LAYOUT.spacing.base,
    ...SHADOWS.sm
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14
  },
  noteLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10
  },
  noteLabel: {
    fontSize: TYPOGRAPHY.sizes.label,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: "500",
    flexShrink: 1
  },
  noteValue: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "700",
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    minWidth: 40,
    textAlign: "right"
  },
  noteDivider: {
    height: 1,
    backgroundColor: COLORS.borderSubtle
  },

  /* Management Controls */
  modulesCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: LAYOUT.cardPadding,
    marginBottom: LAYOUT.spacing.base,
    ...SHADOWS.sm
  },
  moduleTile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14
  },
  moduleLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  moduleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14
  },
  moduleLabel: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: "500"
  },
  tileDivider: {
    height: 1,
    backgroundColor: COLORS.borderSubtle
  },

  /* Recent Activity */
  activityCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: LAYOUT.cardPadding,
    marginBottom: LAYOUT.cardGap,
    ...SHADOWS.sm
  },
  emptyActivityText: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    paddingVertical: 20
  },
  activityItem: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    alignItems: "center"
  },
  activityDotWrap: {
    width: 20,
    alignItems: "center",
    marginRight: 10
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary
  },
  activityContentContainer: {
    flex: 1,
    paddingRight: 8
  },
  activityText: {
    fontSize: TYPOGRAPHY.sizes.label,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: "500"
  },
  activityTypeText: {
    fontSize: TYPOGRAPHY.sizes.micro,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  activityTimeContainer: {
    alignItems: "flex-end",
    minWidth: 60
  },
  activityTimeRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  activityTimeText: {
    fontSize: TYPOGRAPHY.sizes.micro,
    fontWeight: "600",
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  activityDateText: {
    fontSize: TYPOGRAPHY.sizes.micro,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginTop: 2
  },

  /* Logout */
  logoutButton: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: COLORS.error,
    borderRadius: LAYOUT.buttonRadius,
    height: LAYOUT.buttonHeight,
    justifyContent: "center",
    alignItems: "center",
    marginTop: LAYOUT.spacing.base,
    marginBottom: 8,
    ...SHADOWS.sm
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.body.fontFamily
  }
});
