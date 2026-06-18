import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import { getAdminAnalytics } from "../services/admin";
import { COLORS, TYPOGRAPHY, LAYOUT } from "../utils/theme";

export default function AdminAnalyticsScreen() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    try {
      const response = await getAdminAnalytics();
      setAnalytics(response.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load institutional analytics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error || !analytics) {
    return (
      <View style={styles.center}>
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error || "Institutional analytics not available."}</Text>
        </View>
        <Pressable style={styles.retryButton} onPress={loadAnalytics}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const hasNoData =
    analytics.bestCourse === "N/A" &&
    analytics.worstCourse === "N/A" &&
    analytics.highestAttendanceDepartment === "N/A" &&
    analytics.lowestAttendanceDepartment === "N/A" &&
    analytics.mostActiveTeacher === "N/A";

  const breakdownKeys = Object.keys(analytics.manualCorrectionBreakdown || {});

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
      }
    >
      <View style={styles.headerBlock}>
        <Text style={styles.headerTitle}>Institutional Performance</Text>
        <Text style={styles.headerSubtitle}>Supervisory Insight Metrics</Text>
      </View>

      {hasNoData ? (
        <View style={styles.noDataCard}>
          <Text style={styles.noDataText}>Insufficient data</Text>
          <Text style={styles.noDataSubtext}>No attendance sessions have been logged in the system yet.</Text>
        </View>
      ) : (
        <>
          {/* Courses Analytics */}
          <Text style={styles.sectionTitle}>Course Insights</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Highest Attendance:</Text>
              <Text style={[styles.value, { color: "#16A34A" }]}>{analytics.bestCourse}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Lowest Attendance:</Text>
              <Text style={[styles.value, { color: COLORS.error }]}>{analytics.worstCourse}</Text>
            </View>
          </View>

          {/* Department Analytics */}
          <Text style={styles.sectionTitle}>Department Performance</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Top Department:</Text>
              <Text style={styles.value}>{analytics.highestAttendanceDepartment}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Bottom Department:</Text>
              <Text style={styles.value}>{analytics.lowestAttendanceDepartment}</Text>
            </View>
          </View>

          {/* Teacher Activity */}
          <Text style={styles.sectionTitle}>Instructional Delivery</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Most Active Instructor:</Text>
              <Text style={styles.value}>{analytics.mostActiveTeacher}</Text>
            </View>
          </View>
        </>
      )}

      {/* Manual Correction Reason Breakdown */}
      <Text style={styles.sectionTitle}>Manual Corrections Reason breakdown</Text>
      {breakdownKeys.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>No manual corrections logged in the system.</Text>
        </View>
      ) : (
        <View style={styles.listCard}>
          {breakdownKeys.map((reason, idx) => (
            <View
              key={reason}
              style={[
                styles.listItem,
                idx === breakdownKeys.length - 1 && { borderBottomWidth: 0 }
              ]}
            >
              <Text style={styles.itemLabel}>{reason}</Text>
              <Text style={styles.itemValue}>{analytics.manualCorrectionBreakdown[reason]} times</Text>
            </View>
          ))}
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
  headerTitle: {
    color: COLORS.surface,
    fontSize: 20,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: "bold"
  },
  headerSubtitle: {
    color: COLORS.secondary,
    fontSize: 13,
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
    marginBottom: 20
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8
  },
  label: {
    fontSize: 13,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    width: "40%"
  },
  value: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    flex: 1,
    textAlign: "right"
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  itemLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  itemValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  noDataCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16
  },
  noDataText: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.error,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    marginBottom: 4
  },
  noDataSubtext: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  emptyText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 14,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    paddingVertical: 16
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
