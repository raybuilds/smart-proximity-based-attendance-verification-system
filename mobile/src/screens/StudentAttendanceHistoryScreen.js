import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  Pressable,
  View,
  Alert,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  getStudentAttendanceHistoryForCourse,
  correctAttendanceManually,
} from "../services/reports";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BUTTON_VARIANTS, BADGES, FONTS, LAYOUT } from "../utils/theme";
import { CheckCircle, XCircle, Clock, Shield, Calendar, Edit2, AlertTriangle, AlertCircle, Sparkles } from "lucide-react-native";

const CORRECTION_REASONS = [
  "QR Scan Failed",
  "Phone Issue",
  "Network Issue",
  "Emergency",
  "Other",
];

const formatDate = (isoString) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const day = d.getDate().toString().padStart(2, "0");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

export default function StudentAttendanceHistoryScreen({ route, navigation }) {
  const { courseId, studentId } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Correction Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedAttendanceId, setSelectedAttendanceId] = useState(null);
  const [selectedReason, setSelectedReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await getStudentAttendanceHistoryForCourse(
        courseId,
        studentId
      );
      setData(response.data);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Could not load attendance history."
      );
    } finally {
      setLoading(false);
    }
  }, [courseId, studentId]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const handleOpenCorrection = (attendanceId, sessionId) => {
    setSelectedAttendanceId(attendanceId);
    setSelectedSessionId(sessionId);
    setSelectedReason(CORRECTION_REASONS[0]);
    setModalVisible(true);
  };

  const handleConfirmCorrection = async () => {
    if (!selectedReason) {
      Alert.alert("Error", "Please select a correction reason");
      return;
    }

    try {
      setSubmitting(true);
      await correctAttendanceManually(selectedAttendanceId, selectedReason);
      setModalVisible(false);
      Alert.alert("Success", "Attendance corrected successfully.");
      loadHistory();
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to submit manual correction."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (errorMessage || !data) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <AlertCircle size={24} color={COLORS.error} style={styles.feedbackIcon} />
          <Text style={styles.errorText}>{errorMessage || "Failed to load data"}</Text>
        </View>
      </View>
    );
  }

  const { student, course, summary, timeline } = data;
  const { reliabilityPercentage, hasAttendanceData } = summary;

  // Reliability Badge Info
  let reliabilityBadgeStyle = BADGES.neutral;
  let reliabilityBadgeText = "No Attendance Data";

  if (hasAttendanceData) {
    if (reliabilityPercentage >= 90) {
      reliabilityBadgeStyle = BADGES.success;
      reliabilityBadgeText = "Highly Verified";
    } else if (reliabilityPercentage >= 70) {
      reliabilityBadgeStyle = BADGES.warning;
      reliabilityBadgeText = "Moderately Verified";
    } else {
      reliabilityBadgeStyle = BADGES.danger;
      reliabilityBadgeText = "Frequent Manual Corrections";
    }
  }

  const renderHeader = () => (
    <View>
      {/* 1. Header Details */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.studentName}>{student.name}</Text>
            <Text style={styles.studentRoll}>Roll: {student.rollNumber}</Text>
            <Text style={styles.courseName}>{course.name}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.percentageText}>{summary.attendancePercentage}%</Text>
            <Text style={styles.percentageLabel}>Attendance</Text>
          </View>
        </View>
      </View>

      {/* 2. Analytics grid cards */}
      <View style={styles.analyticsRow}>
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsLabel}>Last Attended</Text>
          <Text style={styles.analyticsValue}>
            {summary.lastAttendedDate ? formatDate(summary.lastAttendedDate) : "Never"}
          </Text>
        </View>
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsLabel}>Absence Streak</Text>
          <Text style={styles.analyticsValue}>
            {summary.currentAbsenceStreak}{" "}
            {summary.currentAbsenceStreak === 1 ? "Session" : "Sessions"}
          </Text>
        </View>
      </View>

      <View style={styles.analyticsRow}>
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsLabel}>Reliability</Text>
          <View style={[styles.badge, { backgroundColor: reliabilityBadgeStyle.backgroundColor, borderColor: reliabilityBadgeStyle.borderColor }]}>
            <Text style={[styles.badgeText, { color: reliabilityBadgeStyle.color }]}>{reliabilityBadgeText}</Text>
          </View>
          {hasAttendanceData && (
            <Text style={styles.reliabilityPercentText}>{reliabilityPercentage}% QR Verified</Text>
          )}
        </View>
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsLabel}>Corrections Logged</Text>
          <Text style={styles.analyticsValue}>{summary.correctionCount || 0}</Text>
        </View>
      </View>

      {/* 3. Summary row */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.totalSessions}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.presentCount}</Text>
          <Text style={styles.summaryLabel}>Present</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.absentCount}</Text>
          <Text style={styles.summaryLabel}>Absent</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.qrCount}</Text>
          <Text style={styles.summaryLabel}>QR</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.manualCount}</Text>
          <Text style={styles.summaryLabel}>Manual</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Attendance Timeline</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={timeline}
        keyExtractor={(item) => item.sessionId.toString()}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.timelineList}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isPresent = item.status === "Present" || item.status === "present";
          const isManual = item.method === "MANUAL";
          const isQR = item.method === "QR";
          const isAutoAbsent = item.method === "AUTO_ABSENT";

          let statusStyle = BADGES.danger;
          let statusBadgeText = "ABSENT";
          let StatusIcon = XCircle;

          if (isQR) {
            statusStyle = BADGES.success;
            statusBadgeText = "QR PRESENT";
            StatusIcon = CheckCircle;
          } else if (isManual) {
            statusStyle = BADGES.warning;
            statusBadgeText = "MANUAL PRESENT";
            StatusIcon = Clock;
          } else if (isAutoAbsent) {
            statusStyle = BADGES.neutral;
            statusBadgeText = "AUTO ABSENT";
            StatusIcon = XCircle;
          }

          return (
            <View style={styles.timelineCard}>
              <View style={styles.timelineHeader}>
                <View style={styles.sessionDateWrap}>
                  <Calendar size={15} color={COLORS.textSecondary} style={styles.calendarIcon} />
                  <Text style={styles.sessionDateText}>
                    Session: {formatDate(item.sessionDate)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor, borderColor: statusStyle.borderColor }]}>
                  <StatusIcon size={12} color={statusStyle.color} style={styles.badgeIcon} />
                  <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>{statusBadgeText}</Text>
                </View>
              </View>

              {isManual ? (
                <View style={styles.correctionDetails}>
                  <Text style={styles.detailLabel}>
                    Corrected: <Text style={styles.detailVal}>{formatDate(item.correctionDate)}</Text>
                  </Text>
                  <Text style={styles.detailLabel}>
                    Reason: <Text style={styles.detailVal}>{item.correctionReason}</Text>
                  </Text>
                  <Text style={styles.detailLabel}>
                    Modified By: <Text style={styles.detailVal}>{item.modifiedBy}</Text>
                  </Text>
                  <View style={styles.disabledLockBadge}>
                    <Shield size={12} color={COLORS.textSecondary} style={styles.badgeIcon} />
                    <Text style={styles.disabledLockText}>MANUAL AUDITED</Text>
                  </View>
                </View>
              ) : isQR ? (
                <View style={styles.correctionDetails}>
                  <Text style={styles.detailLabel}>
                    Verification: <Text style={styles.detailVal}>Secure QR & WiFi Proximity Verified</Text>
                  </Text>
                </View>
              ) : (
                <View style={styles.actionRow}>
                  <Pressable
                    style={styles.markPresentButton}
                    onPress={() => handleOpenCorrection(item.attendanceId, item.sessionId)}
                  >
                    <Edit2 size={13} color={COLORS.textInverse} style={styles.badgeIcon} />
                    <Text style={styles.markPresentButtonText}>Mark Present</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        }}
      />

      {/* 5. Correction selection Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalAlertHeader}>
              <AlertTriangle size={24} color={COLORS.warning} />
              <Text style={styles.modalTitle}>Attendance Correction</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              Please select a valid correction reason. This will be stored permanently in the audit logs.
            </Text>

            <ScrollView style={styles.reasonsList} showsVerticalScrollIndicator={false}>
              {CORRECTION_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <Pressable
                    key={reason}
                    style={[
                      styles.reasonOption,
                      isSelected && styles.reasonOptionSelected,
                    ]}
                    onPress={() => setSelectedReason(reason)}
                  >
                    <Text
                      style={[
                        styles.reasonOptionText,
                        isSelected && styles.reasonOptionTextSelected,
                      ]}
                    >
                      {reason}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.confirmButton}
                onPress={handleConfirmCorrection}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={COLORS.textInverse} />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm Log</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    flex: 1,
    padding: SPACING.base,
    backgroundColor: COLORS.background,
  },
  headerCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    padding: 10,
    borderRadius: RADIUS.md,
    minWidth: 90,
  },
  studentName: {
    fontSize: TYPOGRAPHY.sizes.screenTitle - 4,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textInverse,
    fontFamily: FONTS.heading,
    marginBottom: 2,
  },
  studentRoll: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.primaryLight,
    fontFamily: FONTS.body,
    marginBottom: 4,
  },
  courseName: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.warningLight,
    fontFamily: FONTS.heading,
  },
  percentageText: {
    fontSize: TYPOGRAPHY.sizes.cardMetricSm + 2,
    fontWeight: TYPOGRAPHY.weights.extrabold,
    color: COLORS.textInverse,
    fontFamily: FONTS.body,
  },
  percentageLabel: {
    fontSize: TYPOGRAPHY.sizes.micro,
    color: COLORS.primaryLight,
    marginTop: 2,
    textTransform: "uppercase",
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  analyticsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  analyticsCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.xs,
  },
  analyticsLabel: {
    fontSize: TYPOGRAPHY.sizes.micro,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    marginBottom: 4,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  analyticsValue: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primary,
    textAlign: "center",
    fontFamily: FONTS.heading,
  },
  reliabilityPercentText: {
    fontSize: TYPOGRAPHY.sizes.metadata,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.text,
    marginTop: 6,
    textAlign: "center",
    fontFamily: FONTS.body,
  },
  badge: {
    borderRadius: RADIUS.xxl,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    alignSelf: "center",
    marginTop: 4,
  },
  badgeText: {
    fontSize: TYPOGRAPHY.sizes.micro - 1,
    fontWeight: TYPOGRAPHY.weights.bold,
    textAlign: "center",
    textTransform: "uppercase",
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    ...SHADOWS.xs,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.sizes.sectionTitle,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    fontFamily: FONTS.heading,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.sizes.micro,
    color: COLORS.textSecondary,
    marginTop: 2,
    textTransform: "uppercase",
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.sectionTitle - 2,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
    fontFamily: FONTS.heading,
    paddingHorizontal: 4,
  },
  timelineList: {
    paddingBottom: SPACING.xl,
  },
  timelineCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.xs,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  sessionDateWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  calendarIcon: {
    marginRight: SPACING.xs,
  },
  sessionDateText: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    fontFamily: FONTS.heading,
  },
  statusBadge: {
    borderRadius: RADIUS.xxl,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  badgeIcon: {
    marginRight: 4,
  },
  statusBadgeText: {
    fontSize: TYPOGRAPHY.sizes.micro - 1,
    fontWeight: TYPOGRAPHY.weights.bold,
    textTransform: "uppercase",
  },
  correctionDetails: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  detailLabel: {
    fontSize: TYPOGRAPHY.sizes.metadata,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  detailVal: {
    color: COLORS.text,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  actionRow: {
    marginTop: 4,
    alignItems: "flex-end",
  },
  markPresentButton: {
    ...BUTTON_VARIANTS.primary,
    height: 32,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  markPresentButtonText: {
    color: COLORS.textInverse,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: TYPOGRAPHY.sizes.metadata,
  },
  disabledLockBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.backgroundAlt,
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    alignSelf: "flex-start",
    marginTop: SPACING.sm,
  },
  disabledLockText: {
    fontSize: TYPOGRAPHY.sizes.micro - 1,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    width: "85%",
    maxHeight: "80%",
    ...SHADOWS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalAlertHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.sizes.sectionTitle,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primary,
    fontFamily: FONTS.heading,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.base,
    lineHeight: 18,
    fontFamily: FONTS.body,
  },
  reasonsList: {
    marginBottom: SPACING.base,
  },
  reasonOption: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    alignItems: "center",
  },
  reasonOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  reasonOptionText: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.text,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  reasonOptionTextSelected: {
    color: COLORS.primaryDark,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  cancelButton: {
    ...BUTTON_VARIANTS.outline,
    flex: 1,
    height: 40,
  },
  cancelButtonText: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  confirmButton: {
    ...BUTTON_VARIANTS.primary,
    flex: 1,
    height: 40,
  },
  confirmButtonText: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.textInverse,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  errorCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: "rgba(176, 58, 46, 0.15)",
    alignItems: "center",
  },
  feedbackIcon: {
    marginRight: SPACING.sm,
  },
  errorText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    textAlign: "center",
    fontFamily: FONTS.body,
  },
});
