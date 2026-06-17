import React, { useCallback, useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Alert,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import NetInfo from "@react-native-community/netinfo";
import { getTeacherOverview } from "../services/reports";
import { useAuth } from "../context/AuthContext";
import { getActiveSession } from "../services/attendance";
import { COLORS, TYPOGRAPHY, LAYOUT } from "../utils/theme";

export default function TeacherDashboardScreen({ navigation }) {
  console.log('[Dashboard] render');
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [overview, setOverview] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
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

  const loadDashboardData = useCallback(async (options = {}) => {
  console.log('[Dashboard] loadDashboardData entered');
    if (__DEV__) console.log('[Dashboard] loadDashboardData recreated');
    const { isPull = false } = options;

    if (isLoading || refreshing) {
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
      setIsLoading(true);
    }
    setErrorMessage("");

    try {
      const [sessionResponse, overviewResponse] = await Promise.all([
        getActiveSession({ signal }),
        getTeacherOverview({ signal }),
      ]);

      if (isMountedRef.current) {
        setOverview(overviewResponse.data);
        setActiveSession(sessionResponse.session);

        // Preserve existing navigation behavior: auto-redirect if session is active
    console.log('[Dashboard] session found:', !!sessionResponse.session);
        if (sessionResponse.session) {
          console.log('[Dashboard] active session?', !!sessionResponse.session, sessionResponse.session?.id);
          console.log('[Dashboard] navigating to ActiveSession');
          navigation.replace('ActiveSession', {
            session: sessionResponse.session,
          });
        }
      }
    } catch (error) {
      if (isMountedRef.current && error.name !== "CanceledError" && error.name !== "AbortError") {
        setErrorMessage(
          error.response?.data?.message ||
            "Could not load dashboard information."
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setRefreshing(false);
      }
    }
  console.log('[Dashboard] loadDashboardData exit');
}, [navigation]);

  useFocusEffect(
    useCallback(() => { console.log('[Dashboard] useFocusEffect fired');
      loadDashboardData();
    }, [loadDashboardData])
  );
  useFocusEffect(
    React.useCallback(() => {
      console.log('[Dashboard] focused');
      return () => {
        console.log('[Dashboard] blurred');
      };
    }, [])
  );



  function handleActiveSessionPress() {
    if (activeSession) {
      navigation.navigate("ActiveSession", { session: activeSession });
    } else {
      Alert.alert("No Active Session", "There is currently no active attendance session running.");
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadDashboardData({ isPull: true })}
        />
      }
    >
      <View style={styles.card}>
        <Text style={styles.title}>Teacher Dashboard</Text>
        <Text style={styles.subtitle}>
          Welcome, {user?.name || "Teacher"}. Manage your courses and attendance sessions.
        </Text>

        {/* 1. Active Session Panel */}
        {activeSession ? (
          <Pressable
            style={styles.activeSessionPanel}
            onPress={handleActiveSessionPress}
          >
            <View style={styles.activeSessionHeader}>
              <Text style={styles.activeSessionTitle}>Live Session Active</Text>
              <View style={styles.pulseDot} />
            </View>
            <Text style={styles.activeSessionText}>
              Course: {activeSession.course?.name ?? "Not Assigned"}
            </Text>
            <Text style={styles.activeSessionText}>
              Code: {activeSession.sessionCode}
            </Text>
            <Text style={styles.activeSessionLink}>
              Tap to view QR / Monitor attendance →
            </Text>
          </Pressable>
        ) : (
          <View style={styles.profileBox}>
            <Text style={styles.profileText}>Status: No active session running</Text>
          </View>
        )}

        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitleText}>Unable to load data</Text>
            <Text style={styles.errorMessageText}>{errorMessage}</Text>
            <Pressable
              style={[
                styles.retryButton,
                (isLoading || refreshing) && styles.buttonDisabled,
              ]}
              onPress={() => loadDashboardData()}
              disabled={isLoading || refreshing}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {/* 2. Create Session (Primary Action) */}
        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.navigate("StartSession")}
        >
          <Text style={styles.primaryButtonText}>Start Attendance Session</Text>
        </Pressable>

        {/* 3. Navigation shortcuts */}
        <View style={styles.navigationSection}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("TeacherReports")}
          >
            <Text style={styles.secondaryButtonText}>Attendance Records & Reports</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("CourseManagement")}
          >
            <Text style={styles.secondaryButtonText}>Manage Courses & Sections</Text>
          </Pressable>
        </View>

        {/* 4. Attendance Statistics (Minimally styled, placed at the bottom) */}
        {isLoading && !overview ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : overview ? (
          <View style={styles.analyticsBox}>
            <Text style={styles.analyticsTitle}>Academic Statistics</Text>
            <View style={styles.analyticsGrid}>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsLabel}>Total Students</Text>
                <Text style={styles.analyticsValue}>{overview.totalStudents}</Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsLabel}>Sessions Conducted</Text>
                <Text style={styles.analyticsValue}>{overview.totalSessions}</Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsLabel}>Total Records</Text>
                <Text style={styles.analyticsValue}>{overview.totalAttendanceRecords}</Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsLabel}>Avg Attendance</Text>
                <Text style={styles.analyticsValue}>{overview.attendancePercentage}%</Text>
              </View>
            </View>
          </View>
        ) : null}

        <Pressable style={styles.logoutButton} onPress={signOut}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 26,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: TYPOGRAPHY.heading.fontWeight,
    color: COLORS.primary,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 20,
    textAlign: "center",
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  loaderBox: {
    height: 140,
    justifyContent: "center",
    alignItems: "center",
  },
  activeSessionPanel: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: 16,
    marginBottom: 20,
  },
  activeSessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  activeSessionTitle: {
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: "700",
    color: COLORS.primary,
    fontSize: 16,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  activeSessionText: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginBottom: 4,
  },
  activeSessionLink: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "600",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginTop: 8,
  },
  analyticsBox: {
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.cardRadius,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  analyticsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 12,
    textAlign: "center",
    fontFamily: TYPOGRAPHY.heading.fontFamily,
  },
  analyticsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  analyticsItem: {
    width: "48%",
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.inputRadius,
    padding: 10,
    marginBottom: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  analyticsLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  analyticsValue: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  profileBox: {
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.inputRadius,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  profileText: {
    color: "#64748b",
    fontSize: 14,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  navigationSection: {
    marginVertical: 8,
  },
  errorText: {
    marginBottom: 12,
    color: COLORS.error,
    textAlign: "center",
    lineHeight: 20,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.buttonRadius,
    height: LAYOUT.buttonHeight,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 12,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: LAYOUT.buttonRadius,
    height: LAYOUT.buttonHeight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: COLORS.surface,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "700",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  logoutButton: {
    marginTop: 12,
    borderRadius: LAYOUT.buttonRadius,
    height: LAYOUT.buttonHeight,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.error,
  },
  logoutButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  errorContainer: {
    backgroundColor: "#fef2f2",
    borderRadius: LAYOUT.inputRadius,
    padding: 16,
    borderWidth: 1,
    borderColor: "#fee2e2",
    marginVertical: 12,
    alignItems: "center",
  },
  errorTitleText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.error,
    marginBottom: 4,
    textAlign: "center",
    fontFamily: TYPOGRAPHY.heading.fontFamily,
  },
  errorMessageText: {
    fontSize: 14,
    color: COLORS.error,
    marginBottom: 12,
    textAlign: "center",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  retryButton: {
    backgroundColor: COLORS.error,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
});
