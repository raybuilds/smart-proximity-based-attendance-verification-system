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
        if (sessionResponse.session) {
          navigation.replace("ActiveSession", {
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
  }, [navigation, isLoading, refreshing]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  // Reconnect listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected && state.isInternetReachable !== false;
      if (isConnected && errorMessage && !isLoading && !refreshing) {
        loadDashboardData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [errorMessage, isLoading, refreshing, loadDashboardData]);

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

        {isLoading && !overview ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color="#0f172a" />
          </View>
        ) : (
          <>
            {overview ? (
              <View style={styles.analyticsBox}>
                <Text style={styles.analyticsTitle}>Attendance Analytics</Text>
                <View style={styles.analyticsGrid}>
                  <View style={styles.analyticsItem}>
                    <Text style={styles.analyticsLabel}>Students</Text>
                    <Text style={styles.analyticsValue}>{overview.totalStudents}</Text>
                  </View>
                  <View style={styles.analyticsItem}>
                    <Text style={styles.analyticsLabel}>Sessions</Text>
                    <Text style={styles.analyticsValue}>{overview.totalSessions}</Text>
                  </View>
                  <View style={styles.analyticsItem}>
                    <Text style={styles.analyticsLabel}>Records</Text>
                    <Text style={styles.analyticsValue}>{overview.totalAttendanceRecords}</Text>
                  </View>
                  <View style={styles.analyticsItem}>
                    <Text style={styles.analyticsLabel}>Attendance</Text>
                    <Text style={styles.analyticsValue}>{overview.attendancePercentage}%</Text>
                  </View>
                </View>
              </View>
            ) : null}

            <View style={styles.profileBox}>
              <Text style={styles.profileText}>Email: {user?.email}</Text>
              <Text style={styles.profileText}>Role: {user?.role}</Text>
              {activeSession ? (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Live Session Active</Text>
                </View>
              ) : (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveBadgeText}>No Active Session</Text>
                </View>
              )}
            </View>
          </>
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

        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.navigate("StartSession")}
        >
          <Text style={styles.primaryButtonText}>Start Session</Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryButton, !activeSession && styles.buttonDisabled]}
          onPress={handleActiveSessionPress}
        >
          <Text style={styles.secondaryButtonText}>Active Session</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("TeacherReports")}
        >
          <Text style={styles.secondaryButtonText}>Reports</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("CourseManagement")}
        >
          <Text style={styles.secondaryButtonText}>Manage Courses</Text>
        </Pressable>

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
  analyticsBox: {
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.cardRadius,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  analyticsTitle: {
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  profileBox: {
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.inputRadius,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileText: {
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 4,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  activeBadge: {
    marginTop: 8,
    backgroundColor: "rgba(44, 95, 45, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  activeBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "600",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  inactiveBadge: {
    marginTop: 8,
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  inactiveBadgeText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: TYPOGRAPHY.body.fontFamily,
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
    marginBottom: 12,
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
    fontSize: 16,
    fontWeight: "700",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  logoutButton: {
    marginTop: 8,
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
