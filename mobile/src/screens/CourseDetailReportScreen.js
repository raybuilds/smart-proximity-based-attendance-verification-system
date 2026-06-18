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
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import NetInfo from "@react-native-community/netinfo";
import { getTeacherCourseDetailReport } from "../services/reports";
import api from "../services/api";
import EligibilityChips from "../components/EligibilityChips";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BUTTON_VARIANTS, BADGES, LAYOUT, FONTS } from "../utils/theme";
import { AlertCircle, FileText, Download, Calendar, BarChart3, Users, Clock, Info, ShieldAlert } from "lucide-react-native";

export default function CourseDetailReportScreen({ route, navigation }) {
  const { courseId } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    if (__DEV__) console.log('[CourseDetailReportScreen] Mounted');
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const loadCourseDetail = useCallback(async (options = {}) => {
    const { isPull = false } = options;
    if (__DEV__) console.log('[CourseDetailReportScreen] loadCourseDetail – start', { courseId, options });

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
      if (__DEV__) console.log('[CourseDetailReportScreen] API request → getTeacherCourseDetailReport');
      const response = await getTeacherCourseDetailReport(courseId, { signal });
      if (isMountedRef.current) {
        setData(response.data);
        if (__DEV__) console.log('[CourseDetailReportScreen] API response received', response?.data?.course?.id);
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
  }, [courseId]);

  useFocusEffect(
    useCallback(() => {
      loadCourseDetail();
    }, [loadCourseDetail])
  );

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
  }, [loadCourseDetail]);

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
          <AlertCircle size={32} color={COLORS.error} />
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
        <ActivityIndicator size="large" color={COLORS.primary} />
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
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadCourseDetail({ isPull: true })}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
    >
      {errorMessage ? (
        <View style={styles.errorContainer}>
          <AlertCircle size={20} color={COLORS.error} />
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
        <Text style={styles.courseName}>{course?.code ? `${course.code} - ${course.name}` : course?.name}</Text>
        
        <View style={styles.chipsRow}>
          <EligibilityChips eligibility={course} isArchived={course?.isArchived} />
        </View>

        {/* Timestamps Section */}
        <View style={styles.metadataContainer}>
          <View style={styles.metadataRow}>
            <View style={styles.metaLabelWrap}>
              <Calendar size={14} color={COLORS.textSecondary} style={styles.metaIcon} />
              <Text style={styles.metadataLabel}>Created</Text>
            </View>
            <Text style={styles.metadataValue}>{formatDate(course?.createdAt)}</Text>
          </View>
          <View style={styles.metadataRow}>
            <View style={styles.metaLabelWrap}>
              <Clock size={14} color={COLORS.textSecondary} style={styles.metaIcon} />
              <Text style={styles.metadataLabel}>Last Updated</Text>
            </View>
            <Text style={styles.metadataValue}>{formatDate(course?.updatedAt)}</Text>
          </View>
        </View>

        {/* Archive Info Section */}
        {course?.isArchived ? (
          <View style={styles.archiveInfoContainer}>
            <View style={styles.archiveHeader}>
              <ShieldAlert size={16} color={COLORS.warning} />
              <Text style={styles.archiveTitle}>Archival Details</Text>
            </View>
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

        {/* Course Statistics Grid */}
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

        {exporting ? (
          <View style={styles.exportLoader}>
            <ActivityIndicator color={COLORS.primary} size="small" />
            <Text style={styles.exportLoaderText}>Exporting data...</Text>
          </View>
        ) : null}

        {!hasSessions ? (
          <View style={styles.emptyStateBox}>
            <Info size={18} color={COLORS.warning} style={styles.feedbackIcon} />
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
              <Users size={16} color={COLORS.textInverse} />
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
              <AlertCircle size={16} color={COLORS.error} />
              <Text style={styles.dangerButtonText}>View Defaulters</Text>
            </Pressable>

            <View style={styles.row}>
              <Pressable
                style={[styles.outlineButton, { flex: 1, marginRight: 6 }]}
                onPress={() => handleExport("csv")}
              >
                <Download size={14} color={COLORS.text} style={styles.btnIcon} />
                <Text style={styles.outlineButtonText}>Export CSV</Text>
              </Pressable>

              <Pressable
                style={[styles.outlineButton, { flex: 1, marginLeft: 6 }]}
                onPress={() => handleExport("pdf")}
              >
                <FileText size={14} color={COLORS.text} style={styles.btnIcon} />
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
    backgroundColor: COLORS.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  courseName: {
    fontSize: TYPOGRAPHY.sizes.screenTitle - 2,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    fontFamily: FONTS.heading,
    textAlign: "center",
  },
  chipsRow: {
    alignItems: "center",
    marginTop: SPACING.sm,
    marginBottom: SPACING.base,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderSubtle,
    marginVertical: SPACING.lg,
  },
  metadataContainer: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: SPACING.base,
  },
  archiveInfoContainer: {
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(193, 127, 36, 0.15)",
    marginBottom: SPACING.base,
  },
  archiveHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  archiveTitle: {
    fontSize: TYPOGRAPHY.sizes.metadata,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.warning,
    textTransform: "uppercase",
  },
  metadataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  metaLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaIcon: {
    marginRight: SPACING.xs,
  },
  metadataLabel: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  metadataValue: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
  },
  metricsContainer: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: SPACING.lg,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  metricLabel: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  metricValue: {
    fontSize: TYPOGRAPHY.sizes.sectionTitle,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primary,
    fontFamily: FONTS.heading,
  },
  emptyStateBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(193, 127, 36, 0.15)",
  },
  emptyStateText: {
    flex: 1,
    color: COLORS.warning,
    fontSize: TYPOGRAPHY.sizes.body,
    lineHeight: 22,
    fontFamily: FONTS.body,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  feedbackIcon: {
    marginRight: SPACING.sm,
  },
  buttonStack: {
    gap: SPACING.sm,
  },
  primaryButton: {
    ...BUTTON_VARIANTS.primary,
    height: 48,
    ...SHADOWS.xs,
  },
  primaryButtonText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  dangerButton: {
    ...BUTTON_VARIANTS.secondary,
    backgroundColor: COLORS.errorLight,
    borderColor: "rgba(176, 58, 46, 0.15)",
    height: 48,
  },
  dangerButtonText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  outlineButton: {
    ...BUTTON_VARIANTS.outline,
    height: 48,
  },
  btnIcon: {
    marginRight: SPACING.xs,
  },
  outlineButtonText: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  exportLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  exportLoaderText: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
  },
  errorContainer: {
    backgroundColor: COLORS.errorLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: "rgba(176, 58, 46, 0.15)",
    marginHorizontal: SPACING.base,
    marginVertical: SPACING.sm,
    alignItems: "center",
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
