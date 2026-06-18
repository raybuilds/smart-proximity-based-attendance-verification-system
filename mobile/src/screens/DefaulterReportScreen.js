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
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BUTTON_VARIANTS, BADGES, FONTS } from "../utils/theme";
import { AlertTriangle, Download, ArrowLeft, RefreshCw, GraduationCap, Award } from "lucide-react-native";

export default function DefaulterReportScreen({ route, navigation }) {
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
          <AlertTriangle size={36} color={COLORS.error} style={styles.errorIcon} />
          <Text style={styles.errorTitleText}>Unable to Load Roster</Text>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
          <Pressable
            style={[
              styles.retryButton,
              (loading || refreshing) && styles.buttonDisabled,
            ]}
            onPress={() => loadDefaulters()}
            disabled={loading || refreshing}
          >
            <Text style={styles.retryButtonText}>Retry Connection</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const { course, students } = data || {};

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.courseName}>{course?.name}</Text>
        <Text style={styles.headerLabel}>Defaulter Roster Threshold Selector</Text>
        
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
            <ActivityIndicator color={COLORS.textInverse} />
          ) : (
            <>
              <Download size={16} color={COLORS.textInverse} style={styles.btnIcon} />
              <Text style={styles.exportBtnText}>Download Defaulter CSV</Text>
            </>
          )}
        </Pressable>
      </View>

      {successMessage ? (
        <View style={[styles.feedbackBox, styles.successBox]}>
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorContainer}>
          <AlertTriangle size={24} color={COLORS.error} style={styles.errorIcon} />
          <Text style={styles.errorTitleText}>Error Conducting Action</Text>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => loadDefaulters()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {students?.length === 0 ? (
        <View style={styles.emptyCard}>
          <Award size={32} color={COLORS.success} style={styles.emptyIcon} />
          <Text style={styles.emptyText}>Excellent! No students below {threshold}% found.</Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.studentId.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadDefaulters({ isPull: true })}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.studentCard}>
              <View style={styles.studentInfoWrap}>
                <View style={styles.avatarMini}>
                  <GraduationCap size={16} color={COLORS.primary} />
                </View>
                <View style={styles.studentTextInfo}>
                  <Text style={styles.studentName}>{item.name}</Text>
                  <Text style={styles.rollNumber}>{item.rollNumber}</Text>
                </View>
              </View>
              <View style={styles.percentageContainer}>
                <Text style={styles.attendancePercentage}>{item.attendancePercentage}%</Text>
                <View style={styles.defaulterBadge}>
                  <Text style={styles.defaulterBadgeText}>Defaulter</Text>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {loading && data && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.base,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  headerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.base,
    ...SHADOWS.sm,
  },
  courseName: {
    fontSize: TYPOGRAPHY.sizes.screenTitle - 2,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    fontFamily: FONTS.heading,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  headerLabel: {
    fontSize: TYPOGRAPHY.sizes.micro,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: SPACING.sm,
    letterSpacing: 0.5,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  activeTab: {
    backgroundColor: COLORS.surface,
    ...SHADOWS.xs,
  },
  tabText: {
    fontSize: TYPOGRAPHY.sizes.label,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.semibold,
    fontFamily: FONTS.body,
  },
  activeTabText: {
    color: COLORS.error,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  exportBtn: {
    ...BUTTON_VARIANTS.danger,
    height: 46,
    ...SHADOWS.xs,
  },
  btnIcon: {
    marginRight: SPACING.xs,
  },
  exportBtnDisabled: {
    opacity: 0.7,
  },
  exportBtnText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontFamily: FONTS.body,
  },
  list: {
    paddingBottom: SPACING.xl,
  },
  studentCard: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.sm,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.xs,
  },
  studentInfoWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  studentTextInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    fontFamily: FONTS.heading,
  },
  rollNumber: {
    fontSize: TYPOGRAPHY.sizes.metadata,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  percentageContainer: {
    alignItems: "flex-end",
  },
  attendancePercentage: {
    fontSize: TYPOGRAPHY.sizes.sectionTitle,
    fontWeight: TYPOGRAPHY.weights.extrabold,
    color: COLORS.error,
    fontFamily: FONTS.heading,
  },
  defaulterBadge: {
    ...BADGES.danger,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 1,
    marginTop: 2,
  },
  defaulterBadgeText: {
    fontSize: TYPOGRAPHY.sizes.micro - 1,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.error,
    textTransform: "uppercase",
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.xs,
  },
  emptyIcon: {
    marginBottom: SPACING.sm,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.medium,
    fontFamily: FONTS.body,
    textAlign: "center",
  },
  feedbackBox: {
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.base,
  },
  successBox: {
    backgroundColor: COLORS.successLight,
    borderColor: "rgba(45, 106, 79, 0.15)",
  },
  successText: {
    color: COLORS.success,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textAlign: "center",
    fontFamily: FONTS.body,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(250, 247, 240, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    backgroundColor: COLORS.errorLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: "rgba(176, 58, 46, 0.15)",
    marginVertical: SPACING.sm,
    alignItems: "center",
  },
  errorIcon: {
    marginBottom: SPACING.xs,
  },
  errorTitleText: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.error,
    marginBottom: 4,
    textAlign: "center",
  },
  errorMessageText: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.error,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: SPACING.base,
  },
  retryButtonText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
