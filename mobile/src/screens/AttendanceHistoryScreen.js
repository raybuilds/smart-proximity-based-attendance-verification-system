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
  },

  container: {
    padding: 16,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },

  date: {
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 8,
  },
});