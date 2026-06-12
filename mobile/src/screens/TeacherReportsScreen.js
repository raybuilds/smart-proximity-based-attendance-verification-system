import React, { useCallback, useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  Pressable,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import NetInfo from "@react-native-community/netinfo";
import { getTeacherCoursesReport, getTeacherDashboard } from "../services/reports";
import EligibilityChips from "../components/EligibilityChips";

export default function TeacherReportsScreen({ navigation }) {
  const [courses, setCourses] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [range, setRange] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const loadReportsData = useCallback(async (options = {}) => {
    const { isPull = false } = options;

    if (loading || refreshing) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    if (isPull) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage("");
    
    try {
      const coursesRes = await getTeacherCoursesReport({ signal });
      const dashboardRes = await getTeacherDashboard(range, { signal });

      if (isMountedRef.current) {
        setCourses(coursesRes.data || []);
        setDashboard(dashboardRes.dashboard || dashboardRes.data || null);
      }
    } catch (error) {
      if (isMountedRef.current && error.name !== "CanceledError" && error.name !== "AbortError") {
        setErrorMessage(
          error.response?.data?.message || "Could not load report details."
        );
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [range, loading, refreshing]);

  useFocusEffect(
    useCallback(() => {
      loadReportsData();
    }, [loadReportsData])
  );

  useEffect(() => {
    loadReportsData();
  }, [range, loadReportsData]);

  // Reconnect listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected && state.isInternetReachable !== false;
      if (isConnected && errorMessage && !loading && !refreshing) {
        loadReportsData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [errorMessage, loading, refreshing, loadReportsData]);

  const renderDashboard = () => {
    if (!dashboard) return null;
    
    // Check if empty dashboard
    if (dashboard.totalCourses === 0) {
      return (
        <View style={styles.emptyDashboardCard}>
          <Text style={styles.emptyDashboardText}>No attendance data available yet.</Text>
        </View>
      );
    }

    const trend = dashboard.attendanceTrend;

    return (
      <View style={styles.dashboardContainer}>
        {/* Date Selector Segment */}
        <View style={styles.rangeSelector}>
          {["all", "7d", "30d"].map((r) => (
            <Pressable
              key={r}
              style={[styles.rangeTab, range === r && styles.activeRangeTab]}
              onPress={() => setRange(r)}
            >
              <Text style={[styles.rangeTabText, range === r && styles.activeRangeTabText]}>
                {r === "all" ? "All Time" : r === "7d" ? "7 Days" : "30 Days"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Row 1 Stats */}
        <View style={styles.gridRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{dashboard.totalCourses}</Text>
            <Text style={styles.statLabel}>Total Courses</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{dashboard.totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
        </View>

        {/* Row 2 Stats */}
        <View style={styles.gridRow}>
          <View style={styles.statCard}>
            <View style={styles.rowAlign}>
              <Text style={styles.statNum}>{dashboard.activeCourses}</Text>
              <Text style={styles.subText}> / {dashboard.archivedCourses} archived</Text>
            </View>
            <Text style={styles.statLabel}>Active Courses</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{dashboard.averageAttendancePercentage}%</Text>
            <Text style={styles.statLabel}>Avg Attendance</Text>
            {range !== "all" && trend ? (
              <Text style={[styles.trendIndicator, trend.direction === "up" ? styles.trendUp : styles.trendDown]}>
                {trend.direction === "up" ? `↑ Improved by ${trend.change}%` : `↓ Dropped by ${trend.change}%`}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Course Insights */}
        {dashboard.bestCourse || dashboard.worstCourse ? (
          <View style={styles.insightsCard}>
            <Text style={styles.insightsTitle}>Course Performance Insights</Text>
            {dashboard.bestCourse ? (
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>⭐ Best Performer:</Text>
                <Text style={styles.insightValue}>
                  {dashboard.bestCourse.name} ({dashboard.bestCourse.attendancePercentage}%)
                </Text>
              </View>
            ) : null}
            {dashboard.worstCourse ? (
              <View style={[styles.insightRow, { marginTop: 8 }]}>
                <Text style={styles.insightLabel}>⚠️ Needs Attention:</Text>
                <Text style={styles.insightValue}>
                  {dashboard.worstCourse.name} ({dashboard.worstCourse.attendancePercentage}%)
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitleText}>Unable to load data</Text>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
          <Pressable
            style={[
              styles.retryButton,
              (loading || refreshing) && styles.buttonDisabled,
            ]}
            onPress={() => loadReportsData()}
            disabled={loading || refreshing}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={courses}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderDashboard}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadReportsData({ isPull: true })}
          />
        }
        ListEmptyComponent={
          !loading && !errorMessage && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No course reports available.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              navigation.navigate("CourseDetailReport", {
                courseId: item.id,
              })
            }
          >
            <Text style={styles.courseName}>{item.name}</Text>
            
            <EligibilityChips eligibility={item} isArchived={item.isArchived} />
            
            <View style={{ marginBottom: 14 }} />
            
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{item.sessionCount}</Text>
                <Text style={styles.statLabel}>Sessions</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{item.uniqueStudents}</Text>
                <Text style={styles.statLabel}>Students</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{item.attendanceCount}</Text>
                <Text style={styles.statLabel}>Records</Text>
              </View>
            </View>
          </Pressable>
        )}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0f172a" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  dashboardContainer: {
    marginBottom: 20,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  rangeSelector: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  rangeTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeRangeTab: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  rangeTabText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },
  activeRangeTabText: {
    color: "#0f172a",
    fontWeight: "700",
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    marginHorizontal: 4,
  },
  statNum: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  rowAlign: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  subText: {
    fontSize: 11,
    color: "#94a3b8",
  },
  trendIndicator: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  trendUp: {
    color: "#166534",
  },
  trendDown: {
    color: "#991b1b",
  },
  insightsCard: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
    marginHorizontal: 4,
  },
  insightsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e40af",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  insightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  insightLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e3a8a",
  },
  insightValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e3a8a",
    flexShrink: 1,
    textAlign: "right",
    marginLeft: 10,
  },
  emptyDashboardCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyDashboardText: {
    color: "#64748b",
    fontSize: 15,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  courseName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 2,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    margin: 16,
    textAlign: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 30,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 20,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 15,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(248, 250, 252, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#fee2e2",
    marginHorizontal: 16,
    marginVertical: 12,
    alignItems: "center",
  },
  errorTitleText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#991b1b",
    marginBottom: 4,
    textAlign: "center",
  },
  errorMessageText: {
    fontSize: 14,
    color: "#dc2626",
    marginBottom: 12,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#991b1b",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});