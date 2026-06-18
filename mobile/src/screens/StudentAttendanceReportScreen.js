import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getTeacherCourseStudentsReport } from "../services/reports";

export default function StudentAttendanceReportScreen({ route, navigation }) {
  const { courseId } = route.params;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadStudentReport = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await getTeacherCourseStudentsReport(courseId);
      setReport(response.data);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Could not load student reports."
      );
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useFocusEffect(
    useCallback(() => {
      loadStudentReport();
    }, [loadStudentReport])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      </View>
    );
  }

  const { course, totalSessions, totalStudents, averageAttendance, students } = report || {};

  return (
    <View style={styles.container}>
      {/* Summary Header Card */}
      <View style={styles.headerCard}>
        <Text style={styles.courseName}>{course?.name}</Text>
        <View style={styles.headerStatsRow}>
          <View style={styles.headerStatBox}>
            <Text style={styles.headerStatNumber}>{totalSessions}</Text>
            <Text style={styles.headerStatLabel}>Sessions</Text>
          </View>
          <View style={styles.headerStatBox}>
            <Text style={styles.headerStatNumber}>{totalStudents}</Text>
            <Text style={styles.headerStatLabel}>Students</Text>
          </View>
          <View style={styles.headerStatBox}>
            <Text style={styles.headerStatNumber}>{averageAttendance}%</Text>
            <Text style={styles.headerStatLabel}>Avg Attendance</Text>
          </View>
        </View>
      </View>

      <Text style={styles.listTitle}>Student Performance (Lowest First)</Text>

      {students.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No students participated in this course yet.</Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.studentId.toString()}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => {
            const isDefaulter = item.attendancePercentage < 75; // 75% standard threshold indication
            return (
              <TouchableOpacity
                style={[styles.studentCard, isDefaulter && styles.defaulterCard]}
                onPress={() =>
                  navigation.navigate("StudentAttendanceHistory", {
                    courseId,
                    studentId: item.studentId,
                  })
                }
              >
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{item.name}</Text>
                  <Text style={styles.studentRoll}>Roll: {item.rollNumber}</Text>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsText}>QR Records: {item.qrCount || 0}</Text>
                    <Text style={styles.detailsText}>Manual Records: {item.manualCount || 0}</Text>
                    <Text style={styles.detailsText}>Absences: {item.absentCount || 0}</Text>
                  </View>
                </View>
                <View style={styles.studentStats}>
                  <Text style={styles.fractionText}>
                    Present: {item.presentCount || 0} / {item.totalSessions}
                  </Text>
                  <Text
                    style={[
                      styles.percentageText,
                      isDefaulter ? styles.defaulterText : styles.normalText,
                    ]}
                  >
                    {item.attendancePercentage}%
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8fafc",
  },
  headerCard: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  courseName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 16,
  },
  headerStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerStatBox: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 10,
    paddingVertical: 10,
    marginHorizontal: 4,
  },
  headerStatNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 2,
  },
  headerStatLabel: {
    fontSize: 11,
    color: "#94a3b8",
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  listContainer: {
    paddingBottom: 20,
  },
  studentCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 1,
  },
  defaulterCard: {
    borderColor: "#fecaca",
    backgroundColor: "#fff5f5",
  },
  studentInfo: {
    flex: 1,
    marginRight: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  studentRoll: {
    fontSize: 13,
    color: "#64748b",
  },
  studentStats: {
    alignItems: "flex-end",
  },
  fractionText: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 2,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: "700",
  },
  defaulterText: {
    color: "#dc2626",
  },
  normalText: {
    color: "#166534",
  },
  detailsRow: {
    marginTop: 6,
    flexDirection: "column",
  },
  detailsText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  errorCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 16,
    textAlign: "center",
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 15,
  },
});
