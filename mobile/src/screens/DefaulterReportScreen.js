import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import NetInfo from "@react-native-community/netinfo";
import { getCourseDefaulters } from "../services/reports";
import api from "../services/api";

export default function DefaulterReportScreen({ route }) {
  if (__DEV__) {
    console.log("[DEF] Screen mounted");
  }
  const { courseId } = route.params;
  const [data, setData] = useState(null);
  const [threshold, setThreshold] = useState(75);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
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

  const loadDefaulters = useCallback(async (options = {}) => {
    const { isPull = false } = options;
    if (loading || refreshing) {
      if (__DEV__) console.log('[Defaulter] load skipped: already loading');
      return;
    }
    if (__DEV__) console.log('[Defaulter] load start', { isPull, courseId, threshold });
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      if (__DEV__) console.log('[Defaulter] aborted previous request');
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    if (isPull) {
      setRefreshing(true);
      if (__DEV__) console.log('[Defaulter] set refreshing true');
    } else {
      setLoading(true);
      if (__DEV__) console.log('[Defaulter] set loading true');
    }
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (__DEV__) console.log('[Defaulter] requesting getCourseDefaulters');
      const response = await getCourseDefaulters(courseId, threshold, { signal });
      if (__DEV__) console.log('[Defaulter] response received', response?.data?.students?.length);
      if (isMountedRef.current) {
        setData(response.data);
      }
    } catch (error) {
      if (isMountedRef.current && error.name !== 'CanceledError' && error.name !== 'AbortError') {
        if (__DEV__) console.error('[Defaulter] error', error);
        setErrorMessage(error.response?.data?.message || 'Could not load defaulters list.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
        if (__DEV__) console.log('[Defaulter] loading flags cleared');
      }
    }
  }, [courseId, threshold]);

  useEffect(() => {
    loadDefaulters();
  }, [threshold, loadDefaulters]);

  // Reconnect listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected && state.isInternetReachable !== false;
      if (isConnected && errorMessage && !loading && !refreshing) {
        loadDefaulters();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadDefaulters]);

  async function handleExportCSV() {
    if (!data || !data.course) return;
    let fileUri;
    try {
      setExporting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const token = await AsyncStorage.getItem("auth_token");
      const baseURL = api.defaults.baseURL;

      const sanitizedName = data.course.name.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
      const dateStr = new Date().toISOString().split("T")[0];
      const filename = `${sanitizedName}_Defaulters_${threshold}_Report_${dateStr}.csv`;
      
      fileUri = FileSystem.documentDirectory + filename;
      const downloadUrl = `${baseURL}/reports/courses/${courseId}/defaulters/export/csv?threshold=${threshold}`;

      const result = await FileSystem.downloadAsync(downloadUrl, fileUri, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (result.status === 200) {
        await Sharing.shareAsync(fileUri);
        setSuccessMessage("Report shared successfully.");
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
            onPress={() => loadDefaulters()}
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

  const { course, students } = data || {};

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.courseName}>{course?.name}</Text>
        <Text style={styles.headerLabel}>Defaulter Roster Threshold Selector</Text>
        
        {/* Threshold selectors: 75%, 80%, 85% */}
        <View style={styles.tabsContainer}>
          {[75, 80, 85].map((val) => (
            <Pressable
              key={val}
              style={[styles.tab, threshold === val && styles.activeTab]}
              onPress={() => setThreshold(val)}
            >
              <Text style={[styles.tabText, threshold === val && styles.activeTabText]}>
                {val}% Limit
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
          onPress={handleExportCSV}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.exportBtnText}>Download Defaulter CSV</Text>
          )}
        </Pressable>
      </View>

      {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitleText}>Unable to load data</Text>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
          <Pressable
            style={[
              styles.retryButton,
              (loading || refreshing) && styles.buttonDisabled,
            ]}
            onPress={() => loadDefaulters()}
            disabled={loading || refreshing}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {students?.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No students below {threshold}% found.</Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.studentId.toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadDefaulters({ isPull: true })}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.studentCard}>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{item.name}</Text>
                <Text style={styles.rollNumber}>{item.rollNumber}</Text>
              </View>
              <View style={styles.percentageContainer}>
                <Text style={styles.attendancePercentage}>{item.attendancePercentage}%</Text>
                <Text style={styles.warningLabel}>Defaulter</Text>
              </View>
            </View>
          )}
        />
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0f172a" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  headerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  courseName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 10,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 8,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },
  activeTabText: {
    color: "#b91c1c",
    fontWeight: "700",
  },
  exportBtn: {
    backgroundColor: "#b91c1c",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  exportBtnDisabled: {
    opacity: 0.7,
  },
  exportBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  list: {
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
    borderColor: "#fca5a5",
    elevation: 1,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 2,
  },
  rollNumber: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  percentageContainer: {
    alignItems: "flex-end",
  },
  attendancePercentage: {
    fontSize: 18,
    fontWeight: "800",
    color: "#b91c1c",
  },
  warningLabel: {
    fontSize: 10,
    color: "#ef4444",
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 15,
    fontWeight: "500",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
  },
  successText: {
    color: "#166534",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(248, 250, 252, 0.4)",
    justifyContent: "center",
    alignItems: "center",
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
