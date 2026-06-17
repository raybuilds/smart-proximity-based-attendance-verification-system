import React, {
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getStudentHistory,
} from "../services/reports";
import { COLORS, TYPOGRAPHY, LAYOUT } from "../utils/theme";

export default function AttendanceHistoryScreen() {
  const [history, setHistory] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const response =
        await getStudentHistory();

      setHistory(response.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={history}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.courseName}>{item.courseName}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>✓ Present</Text>
            </View>
          </View>
          
          <Text style={styles.detailText}>
            Date: {new Date(item.markedAt).toLocaleDateString()} at {new Date(item.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          
          <Text style={styles.detailText}>
            Section: {item.sectionSnapshot || "N/A"}  |  Method: {item.verificationMethod.toUpperCase()}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },

  container: {
    padding: 16,
    backgroundColor: COLORS.background,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  courseName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    flex: 1,
    marginRight: 8,
  },

  statusBadge: {
    backgroundColor: "rgba(44, 95, 45, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },

  statusText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "600",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },

  detailText: {
    fontFamily: TYPOGRAPHY.body.fontFamily,
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
  },
});