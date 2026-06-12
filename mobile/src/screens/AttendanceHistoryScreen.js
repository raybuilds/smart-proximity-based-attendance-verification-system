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
      keyExtractor={(item) =>
        item.id.toString()
      }
      contentContainerStyle={
        styles.container
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.date}>
            ✓{" "}
            {new Date(
              item.markedAt
            ).toLocaleDateString()}
          </Text>

          <Text>
            Session: {item.sessionId}
          </Text>

          <Text>
            Method:{" "}
            {item.verificationMethod}
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

  date: {
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: TYPOGRAPHY.heading.fontWeight,
    color: COLORS.primary,
    fontSize: 16,
    marginBottom: 8,
  },
  text: {
    fontFamily: TYPOGRAPHY.body.fontFamily,
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 4,
  },
});