import React, {
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getTeacherStudentHistory,
} from "../services/reports";

export default function StudentDetailScreen({
  route,
}) {
  const { student } = route.params;

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
        await getTeacherStudentHistory(
          student.id
        );

      setHistory(response.data);
    } catch (error) {
      if (__DEV__) console.log(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingBottom: 30,
      }}
    >
      <View style={styles.card}>
        <Text style={styles.name}>
          {student.name}
        </Text>

        <Text style={styles.text}>
          Roll No: {student.rollNumber}
        </Text>

        <Text style={styles.text}>
          Email: {student.email}
        </Text>

        <Text style={styles.text}>
          Department: {student.department}
        </Text>

        <Text style={styles.text}>
          Semester: {student.semester}
        </Text>

        <Text style={styles.text}>
          Section: {student.section}
        </Text>

        <View style={styles.divider} />

        <Text style={styles.present}>
          Present: {student.presentCount}
        </Text>

        <Text style={styles.absent}>
          Absent: {student.absentCount}
        </Text>

        <Text style={styles.attendance}>
          Attendance:{" "}
          {student.attendancePercentage}%
        </Text>
      </View>

      <View style={styles.historyCard}>
        <Text style={styles.historyTitle}>
          Attendance History
        </Text>

        {loading ? (
          <ActivityIndicator
            size="large"
          />
        ) : history.length === 0 ? (
          <Text style={styles.emptyText}>
            No attendance records found.
          </Text>
        ) : (
          history.map((record) => (
            <View
              key={record.id}
              style={styles.historyItem}
            >
              <Text
                style={styles.historyDate}
              >
                ✓{" "}
                {new Date(
                  record.markedAt
                ).toLocaleDateString(
                  "en-IN",
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }
                )}
              </Text>

              <Text
                style={
                  styles.historyMethod
                }
              >
                Method:{" "}
                {
                  record.verificationMethod
                }
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8fafc",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    elevation: 3,
  },

  historyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    marginTop: 16,
  },

  name: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    color: "#0f172a",
  },

  text: {
    fontSize: 16,
    marginBottom: 8,
    color: "#334155",
  },

  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 16,
  },

  present: {
    fontSize: 18,
    color: "#16a34a",
    marginBottom: 8,
  },

  absent: {
    fontSize: 18,
    color: "#dc2626",
    marginBottom: 8,
  },

  attendance: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 8,
  },

  historyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    color: "#0f172a",
  },

  historyItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 10,
    marginBottom: 10,
  },

  historyDate: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },

  historyMethod: {
    marginTop: 4,
    color: "#64748b",
  },

  emptyText: {
    color: "#64748b",
    textAlign: "center",
  },
});
