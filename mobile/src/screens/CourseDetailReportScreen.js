import React, { useCallback, useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import NetInfo from "@react-native-community/netinfo";
import { getTeacherCourseDetailReport } from "../services/reports";
import api from "../services/api";
import EligibilityChips from "../components/EligibilityChips";

export default function CourseDetailReportScreen({ route, navigation }) {
  const { courseId } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [exporting, setExporting] = useState(false);
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

  const loadCourseDetail = useCallback(async (options = {}) => {
    const { isPull = false } = options;

    if (loading || refreshing) {
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
      setLoading(true);
    }
    setErrorMessage("");

    try {
      const response = await getTeacherCourseDetailReport(courseId, { signal });
      if (isMountedRef.current) {
        setData(response.data);
      }
    } catch (error) {
      if (isMountedRef.current && error.name !== "CanceledError" && error.name !== "AbortError") {
        setErrorMessage(
          error.response?.data?.message || "Could not load course details."
        );
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [courseId, loading, refreshing]);

  useFocusEffect(
    useCallback(() => {
      loadCourseDetail();
    }, [loadCourseDetail])
  );

  // Reconnect listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected && state.isInternetReachable !== false;
      if (isConnected && errorMessage && !loading && !refreshing) {
        loadCourseDetail();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [errorMessage, loading, refreshing, loadCourseDetail]);

  async function handleExport(format) {
    if (!data || !data.course) return;
    let fileUri;
    try {
      setExporting(true);
      setErrorMessage("");
      
      const token = await AsyncStorage.getItem("auth_token");
      const baseURL = api.defaults.baseURL;
      
      const sanitizedName = data.course.name.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
      const dateStr = new Date().toISOString().split("T")[0];
      const ext = format === "pdf" ? "pdf" : "csv";
      const filename = `${sanitizedName}_Report_${dateStr}.${ext}`;
      
      fileUri = FileSystem.documentDirectory + filename;
      const downloadUrl = `${baseURL}/reports/courses/${courseId}/export/${format}`;

      const result = await FileSystem.downloadAsync(downloadUrl, fileUri, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (result.status === 200) {
        await Sharing.shareAsync(fileUri);
      } else {
        let msg = `Export failed with status ${result.status}`;
        try {
          const errorContent = await FileSystem.readAsStringAsync(fileUri);
          const parsed = JSON.parse(errorContent);
          if (parsed.message) {
            msg = parsed.message;
          }
        } catch (e) {}
        setErrorMessage(msg);
      }
    } catch (error) {
      setErrorMessage(error.message || "Failed to download export file.");
    } finally {
      setExporting(false);
      if (fileUri) {
        try {
          await FileSystem.deleteAsync(fileUri, { idempotent: true });
        } catch (e) {}
      }
    }
  }

  if (errorMessage && !data) {
    return (
      <View style={styles.center}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitleText}>Unable to load data</Text>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
          <Pressable
            style={[
              styles.retryButton,
              (loading || refreshing) && styles.buttonDisabled,
            ]}
            onPress={() => loadCourseDetail()}
            disabled={loading || refreshing}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  const { course, summary } = data || {};
  const hasSessions = summary?.sessionsConducted > 0;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadCourseDetail({ isPull: true })}
        />
      }
    >
      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitleText}>Unable to load data</Text>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
          <Pressable
            style={[
              styles.retryButton,
              (loading || refreshing) && styles.buttonDisabled,
            ]}
            onPress={() => loadCourseDetail()}
            disabled={loading || refreshing}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.card}>
        <Text style={styles.courseName}>{course?.name}</Text>
        
        <View style={{ alignItems: "center", marginTop: 6, marginBottom: 14 }}>
          <EligibilityChips eligibility={course} isArchived={course?.isArchived} />
        </View>

        {/* Timestamps Section */}
        <View style={styles.metadataContainer}>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Created</Text>
            <Text style={styles.metadataValue}>{formatDate(course?.createdAt)}</Text>
          </View>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Last Updated</Text>
            <Text style={styles.metadataValue}>{formatDate(course?.updatedAt)}</Text>
          </View>
        </View>

        {/* Archive Info Section */}
        {course?.isArchived ? (
          <View style={styles.archiveInfoContainer}>
            <Text style={styles.archiveTitle}>Archival Details</Text>
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Archived On</Text>
              <Text style={styles.metadataValue}>{formatDate(course?.archivedAt)}</Text>
            </View>
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Archive Reason</Text>
              <Text style={styles.metadataValue}>{course?.archiveReason || "Not Provided"}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.divider} />

        <View style={styles.metricsContainer}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Sessions Conducted</Text>
            <Text style={styles.metricValue}>{summary?.sessionsConducted}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Attendance Records</Text>
            <Text style={styles.metricValue}>{summary?.attendanceRecords}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Unique Students</Text>
            <Text style={styles.metricValue}>{summary?.uniqueStudents}</Text>
          </View>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {exporting ? (
          <View style={{ paddingVertical: 10 }}>
            <ActivityIndicator color="#0f172a" />
          </View>
        ) : null}

        {!hasSessions ? (
          <View style={styles.emptyStateBox}>
            <Text style={styles.emptyStateText}>
              No attendance sessions have been conducted for this course yet.
            </Text>
          </View>
        ) : (
          <View style={styles.buttonStack}>
            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                navigation.navigate("StudentAttendanceReport", {
                  courseId: course.id,
                })
              }
            >
              <Text style={styles.primaryButtonText}>View Student Attendance</Text>
            </Pressable>

            <Pressable
              style={styles.dangerButton}
              onPress={() =>
                navigation.navigate("DefaulterReport", {
                  courseId: course.id,
                })
              }
            >
              <Text style={styles.dangerButtonText}>View Defaulters</Text>
            </Pressable>

            <Pressable
              style={styles.infoButton}
              onPress={() =>
                navigation.navigate("CourseTrend", {
                  courseId: course.id,
                })
              }
            >
              <Text style={styles.infoButtonText}>Attendance Trends</Text>
            </Pressable>

            <View style={styles.row}>
              <Pressable
                style={[styles.outlineButton, { flex: 1, marginRight: 6 }]}
                onPress={() => handleExport("csv")}
              >
                <Text style={styles.outlineButtonText}>Export CSV</Text>
              </Pressable>

              <Pressable
                style={[styles.outlineButton, { flex: 1, marginLeft: 6 }]}
                onPress={() => handleExport("pdf")}
              >
                <Text style={styles.outlineButtonText}>Export PDF</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
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
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: "#f8fafc",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 24,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  courseName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 20,
  },
  metadataContainer: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  archiveInfoContainer: {
    backgroundColor: "#fff5f5",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginBottom: 16,
  },
  archiveTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#991b1b",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  metadataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  metadataLabel: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },
  metadataValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  metricsContainer: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 24,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  metricLabel: {
    fontSize: 15,
    color: "#475569",
    fontWeight: "500",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  emptyStateBox: {
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#fde68a",
    alignItems: "center",
  },
  emptyStateText: {
    color: "#92400e",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  buttonStack: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  dangerButton: {
    backgroundColor: "#fff5f5",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  dangerButtonText: {
    color: "#b91c1c",
    fontSize: 15,
    fontWeight: "700",
  },
  infoButton: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  infoButtonText: {
    color: "#1d4ed8",
    fontSize: 15,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  outlineButton: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  outlineButtonText: {
    color: "#475569",
    fontSize: 15,
    fontWeight: "700",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
  },
  errorContainer: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#fee2e2",
    marginHorizontal: 16,
    marginVertical: 12,
    alignItems: "center",
  },
  errorTitleText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#991b1b",
    marginBottom: 4,
    textAlign: "center",
  },
  errorMessageText: {
    fontSize: 14,
    color: "#dc2626",
    marginBottom: 12,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#991b1b",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
