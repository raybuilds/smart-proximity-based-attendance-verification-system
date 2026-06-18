import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  getStudentAttendanceHistoryForCourse,
  correctAttendanceManually,
} from "../services/reports";

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
        <ActivityIndicator size="large" color="#2C5F2D" />
      </View>
    );
  }

  if (errorMessage || !data) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{errorMessage || "Failed to load data"}</Text>
        </View>
      </View>
    );
  }

  const { student, course, summary, timeline } = data;
  const { reliabilityPercentage, hasAttendanceData } = summary;

  // Reliability Badge Info
  let reliabilityBadgeColor = "#64748B"; // gray
  let reliabilityBadgeText = "No Attendance Data";

  if (hasAttendanceData) {
    if (reliabilityPercentage >= 90) {
      reliabilityBadgeColor = "#166534"; // green
      reliabilityBadgeText = "Highly Verified";
    } else if (reliabilityPercentage >= 70) {
      reliabilityBadgeColor = "#b45309"; // amber
      reliabilityBadgeText = "Moderately Verified";
    } else {
      reliabilityBadgeColor = "#dc2626"; // red
      reliabilityBadgeText = "Frequent Manual Corrections";
    }
  }

  return (
    <View style={styles.container}>
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
          <View
            style={[
              styles.badge,
              { backgroundColor: reliabilityBadgeColor, alignSelf: "center", marginTop: 4 },
            ]}
          >
            <Text style={styles.badgeText}>{reliabilityBadgeText}</Text>
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

      {/* 4. Timeline list */}
      <FlatList
        data={timeline}
        keyExtractor={(item) => item.sessionId.toString()}
        contentContainerStyle={styles.timelineList}
        renderItem={({ item }) => {
          const isPresent = item.status === "Present";
          const isManual = item.method === "MANUAL";
          const isQR = item.method === "QR";

          let statusBadgeColor = "#dc2626"; // ABSENT
          let statusBadgeText = "ABSENT";
          if (isQR) {
            statusBadgeColor = "#2563eb"; // QR (blue)
            statusBadgeText = "QR PRESENT";
          } else if (isManual) {
            statusBadgeColor = "#b45309"; // MANUAL (amber)
            statusBadgeText = "MANUAL PRESENT";
          }

          return (
            <View style={styles.timelineCard}>
              <View style={styles.timelineHeader}>
                <Text style={styles.sessionDateText}>
                  Session: {formatDate(item.sessionDate)}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: statusBadgeColor }]}>
                  <Text style={styles.statusBadgeText}>{statusBadgeText}</Text>
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
                    <Text style={styles.disabledLockText}>MANUAL CORRECTED</Text>
                  </View>
                </View>
              ) : isQR ? (
                <View style={styles.correctionDetails}>
                  <Text style={styles.detailLabel}>
                    Method: <Text style={styles.detailVal}>QR Verified Scan</Text>
                  </Text>
                </View>
              ) : (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.markPresentButton}
                    onPress={() => handleOpenCorrection(item.attendanceId, item.sessionId)}
                  >
                    <Text style={styles.markPresentButtonText}>Mark Present</Text>
                  </TouchableOpacity>
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
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reason for Attendance Correction</Text>
            <Text style={styles.modalSubtitle}>
              Please select a correction reason. This will be stored permanently in the audit logs.
            </Text>

            <ScrollView style={styles.reasonsList}>
              {CORRECTION_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <TouchableOpacity
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
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmCorrection}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
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
    backgroundColor: "#F5F1E8",
  },
  container: {
    flex: 1,
    padding: 14,
    backgroundColor: "#F5F1E8",
  },
  headerCard: {
    backgroundColor: "#2C5F2D",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
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
    borderRadius: 10,
    minWidth: 90,
  },
  studentName: {
    fontSize: 19,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "serif",
    marginBottom: 2,
  },
  studentRoll: {
    fontSize: 13,
    color: "#E2E8F0",
    marginBottom: 4,
  },
  courseName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FCD34D", // Amber-yellowish accent
  },
  percentageText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  percentageLabel: {
    fontSize: 10,
    color: "#E2E8F0",
    marginTop: 2,
  },
  analyticsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  analyticsCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
  },
  analyticsLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: 4,
    textAlign: "center",
  },
  analyticsValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2C5F2D",
    textAlign: "center",
  },
  reliabilityPercentText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginTop: 6,
    textAlign: "center",
  },
  badge: {
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
    elevation: 1,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  summaryLabel: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  timelineList: {
    paddingBottom: 20,
  },
  timelineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 1,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sessionDateText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  statusBadge: {
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  correctionDetails: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 4,
  },
  detailVal: {
    color: "#0F172A",
    fontWeight: "700",
  },
  actionRow: {
    marginTop: 4,
    alignItems: "flex-end",
  },
  markPresentButton: {
    backgroundColor: "#2C5F2D",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  markPresentButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  disabledLockBadge: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  disabledLockText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "85%",
    maxHeight: "80%",
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C5F2D",
    fontFamily: "serif",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 18,
  },
  reasonsList: {
    marginBottom: 16,
  },
  reasonOption: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
    alignItems: "center",
  },
  reasonOptionSelected: {
    borderColor: "#2C5F2D",
    backgroundColor: "#EBF5EB",
  },
  reasonOptionText: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "600",
  },
  reasonOptionTextSelected: {
    color: "#2C5F2D",
    fontWeight: "700",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginRight: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "700",
  },
  confirmButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#2C5F2D",
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  errorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 15,
    textAlign: "center",
  },
});
