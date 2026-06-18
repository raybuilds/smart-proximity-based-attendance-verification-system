import React, { useState, useEffect, useCallback } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import { getAdminLiveSessions } from "../services/admin";
import { COLORS, TYPOGRAPHY, LAYOUT } from "../utils/theme";

export default function AdminLiveSessionsScreen() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadSessions = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const response = await getAdminLiveSessions();
      setSessions(response.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load active sessions.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();

    // Polling active sessions every 30 seconds
    const interval = setInterval(() => {
      loadSessions(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [loadSessions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSessions(true);
  }, [loadSessions]);

  const renderSessionItem = ({ item }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.courseCode}>{item.courseCode || "N/A"}</Text>
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <Text style={styles.courseName}>{item.courseName}</Text>
        <Text style={styles.teacherName}>Instructor: {item.teacherName}</Text>
        
        <View style={styles.divider} />
        
        <View style={styles.row}>
          <Text style={styles.infoLabel}>Age/Duration:</Text>
          <Text style={styles.infoValue}>Started {item.durationMinutes} minutes ago</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.infoLabel}>Active Sign-ins:</Text>
          <Text style={styles.infoValue}>
            {item.attendanceCount} / {item.eligibleCount} Students
          </Text>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
        <Pressable style={styles.retryButton} onPress={() => loadSessions()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.sessionId.toString()}
        renderItem={renderSessionItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No active attendance sessions</Text>
          </View>
        }
      />
    </View>
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
    flex: 1,
    backgroundColor: COLORS.background
  },
  listContainer: {
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4
  },
  courseCode: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  liveBadge: {
    backgroundColor: "#FEE2E2",
    borderColor: "#EF4444",
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  liveText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#EF4444"
  },
  courseName: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    marginBottom: 2
  },
  teacherName: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    opacity: 0.8
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6
  },
  infoLabel: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40
  },
  emptyText: {
    fontSize: 14,
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
  }
});
