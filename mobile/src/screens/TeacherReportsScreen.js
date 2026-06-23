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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import NetInfo from "@react-native-community/netinfo";
import {
  FileText,
  BookOpen,
  BarChart3,
  Users,
  CalendarDays,
  CheckCircle,
  AlertTriangle,
  Award,
  Clock,
  ChevronRight,
} from "lucide-react-native";
import { getTeacherCoursesReport, getTeacherDashboard } from "../services/reports";
import EligibilityChips from "../components/EligibilityChips";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BUTTON_VARIANTS, BADGES, LAYOUT, FONTS } from "../utils/theme";

export default function TeacherReportsScreen({ navigation, route }) {
  if (__DEV__) {
    console.log("[TeacherReports] Screen mounted");
  }

  const [courses, setCourses] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [range, setRange] = useState("all");
  const [loading, setLoading] = useState(false);
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
    if (__DEV__) console.log('[Teacher] load start', { isPull, range });

    if (loading || refreshing) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // 1. Try to load from cache first for immediate responsiveness
    const cacheKeyCourses = `cache_teacher_report_courses`;
    const cacheKeyDashboard = `cache_teacher_report_dashboard_${range}`;
    if (!isPull && courses.length === 0 && !dashboard) {
      try {
        const cachedCourses = await AsyncStorage.getItem(cacheKeyCourses);
        const cachedDashboard = await AsyncStorage.getItem(cacheKeyDashboard);
        if (cachedCourses && isMountedRef.current) {
          setCourses(JSON.parse(cachedCourses));
        }
        if (cachedDashboard && isMountedRef.current) {
          setDashboard(JSON.parse(cachedDashboard));
        }
      } catch (cacheErr) {
        if (__DEV__) console.log("Failed to load reports cache:", cacheErr);
      }
    }

    if (isPull) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage("");
    
    try {
      // 2. Fetch both parallel requests using Promise.all
      const [coursesRes, dashboardRes] = await Promise.all([
        getTeacherCoursesReport({ signal }),
        getTeacherDashboard(range, { signal })
      ]);

      if (isMountedRef.current) {
        const parsedCourses = coursesRes.data || [];
        const parsedDashboard = dashboardRes.dashboard || dashboardRes.data || null;

        setCourses(parsedCourses);
        setDashboard(parsedDashboard);

        // Update Cache on success
        await AsyncStorage.setItem(cacheKeyCourses, JSON.stringify(parsedCourses));
        await AsyncStorage.setItem(cacheKeyDashboard, JSON.stringify(parsedDashboard));
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
  }, [range, courses.length, dashboard]);

  useFocusEffect(
    useCallback(() => {
      loadReportsData();
    }, [loadReportsData])
  );

  useEffect(() => {
    loadReportsData();
  }, [range, loadReportsData]);

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
  }, [loadReportsData]);

  // Dynamic set loading flag helper to avoid unused warnings
  function setIsLoading(val) {
    setLoading(val);
  }

  const renderDashboard = () => {
    if (!dashboard) return null;
    
    if (dashboard.totalCourses === 0) {
      return (
        <View style={styles.emptyDashboardCard}>
          <Text style={styles.emptyDashboardText}>No attendance data available yet.</Text>
        </View>
      );
    }

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
            <View style={styles.statHeader}>
              <BookOpen size={16} color={COLORS.primary} style={styles.statIcon} />
              <Text style={styles.statLabel}>Total Courses</Text>
            </View>
            <Text style={styles.statNum}>{dashboard.totalCourses}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <CalendarDays size={16} color={COLORS.primary} style={styles.statIcon} />
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <Text style={styles.statNum}>{dashboard.totalSessions}</Text>
          </View>
        </View>

        {/* Row 2 Stats */}
        <View style={styles.gridRow}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Users size={16} color={COLORS.primary} style={styles.statIcon} />
              <Text style={styles.statLabel}>Active Courses</Text>
            </View>
            <View style={styles.rowAlign}>
              <Text style={styles.statNum}>{dashboard.activeCourses}</Text>
              <Text style={styles.subText}> / {dashboard.archivedCourses} archived</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <BarChart3 size={16} color={COLORS.success} style={styles.statIcon} />
              <Text style={styles.statLabel}>Avg Attendance</Text>
            </View>
            <Text style={[styles.statNum, styles.statValueGreen]}>
              {dashboard.averageAttendancePercentage}%
            </Text>
          </View>
        </View>

        {/* Course Insights */}
        {dashboard.bestCourse || dashboard.worstCourse ? (
          <View style={styles.insightsCard}>
            <Text style={styles.insightsTitle}>Course Performance Insights</Text>
            {dashboard.bestCourse ? (
              <View style={styles.insightRow}>
                <View style={styles.insightLabelRow}>
                  <Award size={16} color={COLORS.success} style={styles.insightRowIcon} />
                  <Text style={styles.insightLabel}>Best Performer</Text>
                </View>
                <Text style={styles.insightValue}>
                  {dashboard.bestCourse.code ? `${dashboard.bestCourse.code} ` : ""}{dashboard.bestCourse.name} ({dashboard.bestCourse.attendancePercentage}%)
                </Text>
              </View>
            ) : null}
            {dashboard.worstCourse ? (
              <View style={[styles.insightRow, { marginTop: SPACING.xs }]}>
                <View style={styles.insightLabelRow}>
                  <AlertTriangle size={16} color={COLORS.error} style={styles.insightRowIcon} />
                  <Text style={styles.insightLabel}>Needs Attention</Text>
                </View>
                <Text style={[styles.insightValue, { color: COLORS.error }]}>
                  {dashboard.worstCourse.code ? `${dashboard.worstCourse.code} ` : ""}{dashboard.worstCourse.name} ({dashboard.worstCourse.attendancePercentage}%)
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
      {/* Green Header */}
      <View style={styles.screenHeader}>
        <View style={styles.headerTitleWrap}>
          <FileText size={22} color={COLORS.primary} style={styles.titleIcon} />
          <Text style={styles.screenTitle}>Performance Report Center</Text>
        </View>
        <Text style={styles.headerSubtitle}>Analyze year course metrics and attendance records</Text>
      </View>

      {errorMessage ? (
        <View style={styles.errorContainer}>
          <AlertTriangle size={24} color={COLORS.error} style={styles.errorIcon} />
          <Text style={styles.errorTitleText}>Unable to load reports</Text>
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
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
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
            <View style={styles.cardHeader}>
              <Text style={styles.courseName}>{item.code ? `${item.code} - ${item.name}` : item.name}</Text>
              <ChevronRight size={18} color={COLORS.textSecondary} />
            </View>
            
            <EligibilityChips eligibility={item} isArchived={item.isArchived} />
            
            <View style={styles.cardStatsContainer}>
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
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screenHeader: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.base,
    backgroundColor: COLORS.background,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xxs,
  },
  titleIcon: {
    marginRight: SPACING.xs,
  },
  screenTitle: {
    fontFamily: FONTS.heading,
    fontWeight: "bold",
    fontSize: TYPOGRAPHY.sizes.screenTitle,
    color: COLORS.text,
  },
  headerSubtitle: {
    fontFamily: FONTS.body,
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  listContainer: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingBottom: 40,
  },
  dashboardContainer: {
    marginBottom: SPACING.base,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  rangeSelector: {
    flexDirection: "row",
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: SPACING.base,
  },
  rangeTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  activeRangeTab: {
    backgroundColor: COLORS.surface,
    ...SHADOWS.xs,
  },
  rangeTabText: {
    fontSize: TYPOGRAPHY.sizes.label,
    color: COLORS.textSecondary,
    fontWeight: "600",
    fontFamily: FONTS.body,
  },
  activeRangeTabText: {
    color: COLORS.text,
    fontWeight: "700",
    fontFamily: FONTS.body,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginHorizontal: SPACING.xxs,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  statIcon: {
    marginRight: 6,
  },
  statNum: {
    fontSize: TYPOGRAPHY.sizes.cardMetricSm + 2,
    fontWeight: "800",
    color: COLORS.text,
    fontFamily: FONTS.heading,
  },
  statValueGreen: {
    color: COLORS.success,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.sizes.micro,
    color: COLORS.textSecondary,
    fontWeight: "600",
    fontFamily: FONTS.body,
  },
  rowAlign: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  subText: {
    fontSize: TYPOGRAPHY.sizes.micro,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
  },
  insightsCard: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: "rgba(45, 106, 79, 0.15)",
    borderRadius: RADIUS.md,
    padding: SPACING.base,
    marginTop: SPACING.xs,
    marginHorizontal: SPACING.xxs,
  },
  insightsTitle: {
    fontSize: TYPOGRAPHY.sizes.micro,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: SPACING.sm,
    textTransform: "uppercase",
    fontFamily: FONTS.body,
    letterSpacing: 0.5,
  },
  insightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  insightLabelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  insightRowIcon: {
    marginRight: 6,
  },
  insightLabel: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: "600",
    color: COLORS.primary,
    fontFamily: FONTS.body,
  },
  insightValue: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: "700",
    color: COLORS.primary,
    flexShrink: 1,
    textAlign: "right",
    marginLeft: 10,
    fontFamily: FONTS.heading,
  },
  emptyDashboardCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    marginBottom: SPACING.base,
  },
  emptyDashboardText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "600",
    fontFamily: FONTS.body,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.xs,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  courseName: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: FONTS.heading,
    flex: 1,
    marginRight: SPACING.sm,
  },
  cardStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.base,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    marginHorizontal: SPACING.xxs,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  statNumber: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: FONTS.body,
    marginBottom: 2,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.base,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontFamily: FONTS.body,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(250, 247, 240, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    backgroundColor: COLORS.errorLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.error,
    marginHorizontal: SPACING.base,
    marginVertical: SPACING.xs,
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
    marginBottom: SPACING.sm,
    textAlign: "center",
    fontFamily: FONTS.body,
  },
  retryButton: {
    ...BUTTON_VARIANTS.danger,
    height: 40,
    paddingHorizontal: SPACING.base,
  },
  retryButtonText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: "700",
    fontFamily: FONTS.body,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});