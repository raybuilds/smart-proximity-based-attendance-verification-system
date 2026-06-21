import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  FlatList,
  ScrollView,
} from "react-native";
import * as Location from "expo-location";
import WifiManager from "react-native-wifi-reborn";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { getActiveSession, startSession } from "../services/attendance";
import { getCourses } from "../services/courses";
import { getProfile, updateTeacherHotspot } from "../services/auth";
import EligibilityChips from "../components/EligibilityChips";
import { COLORS, TYPOGRAPHY, LAYOUT, SHADOWS, RADIUS, SPACING, BUTTON_VARIANTS, BADGES, FONTS } from "../utils/theme";
import {
  PlayCircle,
  BookOpen,
  ChevronRight,
  Play,
  AlertTriangle,
  AlertCircle,
  Users,
  BookMarked,
  Info,
  Wifi,
  Signal,
} from "lucide-react-native";

const RSSI_OPTIONS = [
  { label: "Close Proximity (-65 dBm)", value: -65 },
  { label: "Normal Range (-70 dBm)", value: -70 },
  { label: "Mid Range (-75 dBm)", value: -75 },
  { label: "Wide Range (-80 dBm)", value: -80 },
];

export default function StartSessionScreen({ navigation }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  // Distinguishes a genuine empty list from a network/server failure
  const [loadError, setLoadError] = useState(false);

  // Hotspot & RSSI states
  const [registeredSSID, setRegisteredSSID] = useState("");
  const [registeredBSSID, setRegisteredBSSID] = useState("");
  const [rssiThreshold, setRssiThreshold] = useState(-70);
  const [showRssiModal, setShowRssiModal] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedSSID, setDetectedSSID] = useState("");
  const [detectedBSSID, setDetectedBSSID] = useState("");
  const [detectionFailed, setDetectionFailed] = useState(false);
  const [isManualInput, setIsManualInput] = useState(false);
  const [manualHotspotName, setManualHotspotName] = useState("");

  const detectCurrentNetwork = useCallback(async () => {
    try {
      setIsDetecting(true);
      setErrorMessage("");
      setDetectionFailed(false);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMessage("Location permission is required to detect WiFi Hotspot Name.");
        setDetectionFailed(true);
        setIsDetecting(false);
        return;
      }

      if (!WifiManager) {
        setDetectedSSID("MockTeacherWiFi");
        setDetectedBSSID(null);
        setIsDetecting(false);
        return;
      }

      const ssidVal = await WifiManager.getCurrentWifiSSID();
      if (!ssidVal) {
        setDetectionFailed(true);
        setIsDetecting(false);
        return;
      }

      let bssidVal = null;
      try {
        bssidVal = await WifiManager.getBSSID();
      } catch (err) {
        // Fallback: ignore BSSID detection failure
      }

      setDetectedSSID(ssidVal);
      setDetectedBSSID(bssidVal);
      setDetectionFailed(false);
    } catch (error) {
      setDetectionFailed(true);
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      setLoadError(false);

      // Use allSettled so that a failure in one call (e.g. getActiveSession
      // on a cold Render.com start, or a 403/500 from any endpoint) does NOT
      // prevent courses from loading.
      const [sessionResult, coursesResult, profileResult] = await Promise.allSettled([
        getActiveSession(),
        getCourses(),
        getProfile(),
      ]);

      // 1. Handle active session check (non-fatal if it fails)
      if (sessionResult.status === "fulfilled" && sessionResult.value?.session) {
        navigation.replace("ActiveSession", {
          session: sessionResult.value.session,
        });
        return;
      }

      // 2. Handle courses (critical — show error if this fails)
      if (coursesResult.status === "fulfilled") {
        const teacherCourses = coursesResult.value?.courses || [];
        setCourses(teacherCourses);
        setSelectedCourse(null);
        setLoadError(false);
      } else {
        // courses fetch itself failed — show a meaningful error and stop
        const err = coursesResult.reason;
        setErrorMessage(
          err?.response?.data?.message ||
            "Could not load your courses. Please check your connection and try again."
        );
        setLoadError(true);
        setIsLoading(false);
        return;
      }

      // 3. Handle profile (non-fatal — pre-fill hotspot if available)
      if (profileResult.status === "fulfilled" && profileResult.value?.user?.teacher) {
        setRegisteredSSID(profileResult.value.user.teacher.registeredSSID || "");
        setRegisteredBSSID(profileResult.value.user.teacher.registeredBSSID || "");
        // Auto-detect network when opening the screen
        detectCurrentNetwork();
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          "Could not load courses or session status."
      );
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [navigation]);

  useFocusEffect(loadData);

  async function handleRetry() {
    await loadData();
  }

  async function handleStartSession() {
    if (!selectedCourse) {
      setErrorMessage("Please select a course first.");
      return;
    }

    if (!registeredSSID.trim()) {
      setErrorMessage("Please configure your hotspot SSID settings before starting attendance.");
      return;
    }

    try {
      setIsStarting(true);
      setErrorMessage("");

      // Update hotspot configuration in backend
      await updateTeacherHotspot({
        registeredSSID: registeredSSID.trim(),
        registeredBSSID: registeredBSSID ? registeredBSSID.trim() : null,
      });

      const response = await startSession(selectedCourse.id, rssiThreshold);
      navigation.replace("ActiveSession", {
        session: response.session,
      });
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          "Could not start the attendance session."
      );
    } finally {
      setIsStarting(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading courses…</Text>
      </View>
    );
  }

  if (courses.length === 0) {
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <View style={styles.headerIconWrap}>
            <PlayCircle size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.screenTitle}>Start Session</Text>
          <Text style={styles.screenSubtitle}>
            {loadError
              ? "There was a problem loading your courses."
              : "Launch a live attendance session for your class"}
          </Text>
        </View>

        <View style={loadError ? styles.errorCard : styles.warningCard}>
          <View style={styles.warningCardHeader}>
            <AlertTriangle size={20} color={loadError ? COLORS.error : COLORS.warning} />
            <Text
              style={[
                styles.warningCardTitle,
                loadError && { color: COLORS.error },
              ]}
            >
              {loadError ? "Connection Error" : "No Courses Found"}
            </Text>
          </View>
          <Text style={styles.warningCardBody}>
            {loadError
              ? errorMessage ||
                "Could not reach the server. Please check your internet connection and try again."
              : "You must create a course before starting an attendance session. Head over to Course Management to set up your first course."}
          </Text>
        </View>

        {loadError ? (
          <Pressable style={styles.primaryButton} onPress={handleRetry}>
            <Info size={18} color={COLORS.textInverse} />
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.primaryButton}
            onPress={() => navigation.navigate("CourseManagement")}
          >
            <BookMarked size={18} color={COLORS.textInverse} />
            <Text style={styles.primaryButtonText}>Manage Courses</Text>
          </Pressable>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerSection}>
        <View style={styles.headerIconWrap}>
          <PlayCircle size={32} color={COLORS.primary} />
        </View>
        <Text style={styles.screenTitle}>Start Session</Text>
        <Text style={styles.screenSubtitle}>
          Welcome, {user?.name}. Select a course and launch a live attendance
          session when your class begins.
        </Text>
      </View>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <AlertCircle size={18} color={COLORS.error} />
          <Text style={styles.errorCardText}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Select Course</Text>
        <Text style={styles.sectionHint}>
          Tap a course below to select it for this session
        </Text>

        <View style={styles.courseListContainer}>
          {courses.map((item) => {
            const isSelected =
              selectedCourse && selectedCourse.id === item.id;
            return (
              <Pressable
                key={item.id.toString()}
                style={[
                  styles.courseCard,
                  isSelected && styles.courseCardSelected,
                ]}
                onPress={() => {
                  setSelectedCourse(item);
                  setErrorMessage("");
                }}
              >
                <View style={[styles.courseCardIconWrap, isSelected && styles.courseCardIconWrapSelected]}>
                  <BookOpen
                    size={20}
                    color={isSelected ? COLORS.primary : COLORS.textSecondary}
                  />
                </View>
                <View style={styles.courseCardBody}>
                  {item.code ? (
                    <Text
                      style={[
                        styles.courseCode,
                        isSelected && styles.courseCodeSelected,
                      ]}
                    >
                      {item.code}
                    </Text>
                  ) : null}
                  <Text
                    style={[
                      styles.courseName,
                      isSelected && styles.courseNameSelected,
                    ]}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                </View>
                <View
                  style={[
                    styles.courseRadio,
                    isSelected && styles.courseRadioSelected,
                  ]}
                >
                  {isSelected && (
                    <View style={styles.courseRadioDot} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {selectedCourse ? (
        <View style={styles.previewCard}>
          <View style={styles.previewCardHeader}>
            <Users size={18} color={COLORS.primary} />
            <Text style={styles.previewCardTitle}>Session Preview</Text>
          </View>
          <View style={styles.previewDivider} />
          <Text style={styles.previewLabel}>Eligible Students Target</Text>
          <View style={styles.chipsWrapper}>
            <EligibilityChips eligibility={selectedCourse} />
          </View>
          <View style={styles.previewCountRow}>
            <Text style={styles.previewCountLabel}>Matching Roster Count</Text>
            <Text style={styles.previewCountValue}>
              {selectedCourse.eligibleStudentCount !== undefined
                ? selectedCourse.eligibleStudentCount
                : 0}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Network Configuration Card */}
      <View style={styles.configCard}>
        <View style={styles.configCardHeader}>
          <Wifi size={18} color={COLORS.primary} />
          <Text style={styles.configCardTitle}>Hotspot & Verification Settings</Text>
        </View>
        <View style={styles.previewDivider} />

        <Text style={styles.configLabel}>Registered WiFi Network</Text>
        <View style={styles.wifiDetailsContainer}>
          <Text style={styles.wifiDetailText}>
            Hotspot Name: <Text style={styles.boldText}>{registeredSSID || "Not Registered"}</Text>
          </Text>
          <Text style={styles.wifiDetailText}>
            MAC Address: <Text style={styles.boldText}>{registeredBSSID || "Optional / Auto-detect"}</Text>
          </Text>
        </View>

        {/* Auto-detected Network Block */}
        {isDetecting ? (
          <View style={[styles.wifiDetailsContainer, { marginTop: 12, alignItems: "center" }]}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={[styles.wifiDetailText, { marginTop: 4 }]}>Detecting WiFi network...</Text>
          </View>
        ) : detectedSSID ? (
          <View style={[styles.wifiDetailsContainer, { marginTop: 12, borderColor: COLORS.success, backgroundColor: "rgba(45, 117, 85, 0.05)" }]}>
            <Text style={[styles.configLabel, { marginTop: 0, color: COLORS.success }]}>Detected Network</Text>
            <Text style={styles.wifiDetailText}>
              Hotspot Name: <Text style={styles.boldText}>{detectedSSID}</Text>
            </Text>
            {detectedBSSID ? (
              <Text style={styles.wifiDetailText}>
                MAC Address: <Text style={styles.boldText}>{detectedBSSID}</Text>
              </Text>
            ) : null}
            <Pressable
              style={[styles.primaryButton, { marginTop: 12 }]}
              onPress={() => {
                setRegisteredSSID(detectedSSID);
                setRegisteredBSSID(detectedBSSID || null);
                setDetectedSSID("");
                setDetectedBSSID("");
              }}
            >
              <Text style={styles.primaryButtonText}>Use Current Network</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Detection Failed & Retry Block */}
        {detectionFailed && !detectedSSID && !isDetecting ? (
          <View style={[styles.wifiDetailsContainer, { marginTop: 12, borderColor: COLORS.error, backgroundColor: "rgba(220, 53, 69, 0.05)" }]}>
            <Text style={[styles.wifiDetailText, { color: COLORS.error, fontWeight: "600" }]}>
              Unable to detect your current network.
            </Text>
            <Pressable
              style={[styles.secondaryButton, { marginTop: 8 }]}
              onPress={detectCurrentNetwork}
            >
              <Text style={styles.secondaryButtonText}>Retry Detection</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Manual Fallback Option */}
        {!isManualInput ? (
          <Pressable
            style={{ marginTop: 12, marginBottom: 8 }}
            onPress={() => setIsManualInput(true)}
          >
            <Text style={{ color: COLORS.primary, fontWeight: "600", textDecorationLine: "underline" }}>
              Can't detect your network? Enter Hotspot Name Manually
            </Text>
          </Pressable>
        ) : (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.configLabel}>Manual Hotspot Name</Text>
            <TextInput
              style={styles.configInput}
              placeholder="e.g. Teacher_Hotspot, MyPhone, Ray_5G"
              placeholderTextColor={COLORS.textSecondary}
              value={manualHotspotName}
              onChangeText={(text) => {
                setManualHotspotName(text);
                setRegisteredSSID(text);
                setRegisteredBSSID(null); // Manual hotspot name has no BSSID
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={{ marginTop: 8 }}
              onPress={() => {
                setIsManualInput(false);
                setManualHotspotName("");
              }}
            >
              <Text style={{ color: COLORS.textSecondary, textDecorationLine: "underline" }}>
                Switch back to auto-detection
              </Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.configLabel}>Expected Classroom Signal</Text>
        <Pressable
          style={styles.thresholdSelector}
          onPress={() => setShowRssiModal(true)}
        >
          <Signal size={16} color={COLORS.primary} style={{ marginRight: 8 }} />
          <Text style={styles.thresholdSelectorText}>
            {RSSI_OPTIONS.find((opt) => opt.value === rssiThreshold)?.label ||
              `Custom (${rssiThreshold} dBm)`}
          </Text>
          <ChevronRight size={16} color={COLORS.textSecondary} />
        </Pressable>
      </View>

      <Pressable
        style={[
          styles.primaryButton,
          (!selectedCourse || isStarting) && styles.buttonDisabled,
        ]}
        onPress={handleStartSession}
        disabled={!selectedCourse || isStarting}
      >
        {isStarting ? (
          <ActivityIndicator color={COLORS.textInverse} size="small" />
        ) : (
          <>
            <Play size={18} color={COLORS.textInverse} />
            <Text style={styles.primaryButtonText}>
              Start Attendance Session
            </Text>
          </>
        )}
      </Pressable>

      {/* RSSI Selection Modal */}
      <Modal transparent visible={showRssiModal} animationType="fade">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowRssiModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Expected Classroom Signal</Text>
            <Text style={styles.modalSubtitle}>
              Select the calibration reference for classroom network analytics. This is used for signal strength auditing and does not block student check-ins.
            </Text>
            <FlatList
              data={RSSI_OPTIONS}
              keyExtractor={(item) => item.value.toString()}
              renderItem={({ item }) => {
                const isSelected = rssiThreshold === item.value;
                return (
                  <Pressable
                    style={styles.modalItem}
                    onPress={() => {
                      setRssiThreshold(item.value);
                      setShowRssiModal(false);
                    }}
                  >
                    <Signal
                      size={16}
                      color={isSelected ? COLORS.primary : COLORS.textSecondary}
                      style={{ marginRight: 10 }}
                    />
                    <Text
                      style={[
                        styles.modalItemText,
                        isSelected && { color: COLORS.primary, fontWeight: "bold" },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <View style={styles.courseRadioDot} />
                    )}
                  </Pressable>
                );
              }}
            />
            <Pressable
              style={styles.closeButton}
              onPress={() => setShowRssiModal(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal transparent visible={showDropdown} animationType="fade">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select a Course</Text>
            <FlatList
              data={courses}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedCourse(item);
                    setShowDropdown(false);
                    setErrorMessage("");
                  }}
                >
                  <BookOpen size={16} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
                  <Text style={styles.modalItemText}>
                    {item.code ? `${item.code} - ${item.name}` : item.name}
                  </Text>
                  <ChevronRight size={16} color={COLORS.textSecondary} />
                </Pressable>
              )}
            />
            <Pressable
              style={styles.closeButton}
              onPress={() => setShowDropdown(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl + 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    marginTop: SPACING.sm,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: LAYOUT.sectionGap,
  },
  headerIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.xs,
  },
  screenTitle: {
    fontSize: TYPOGRAPHY.sizes.screenTitle,
    fontFamily: FONTS.heading,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  screenSubtitle: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    fontFamily: FONTS.body,
    paddingHorizontal: SPACING.md,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.errorLight,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(176, 58, 46, 0.15)",
    padding: SPACING.base,
    marginBottom: LAYOUT.cardGap,
  },
  errorCardText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.error,
    fontWeight: TYPOGRAPHY.weights.semibold,
    fontFamily: FONTS.body,
  },
  warningCard: {
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(193, 127, 36, 0.15)",
    padding: LAYOUT.cardPadding,
    marginBottom: LAYOUT.cardGap,
    ...SHADOWS.xs,
  },
  warningCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  warningCardTitle: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.warning,
    fontFamily: FONTS.body,
  },
  warningCardBody: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.text,
    lineHeight: 22,
    fontFamily: FONTS.body,
  },
  sectionBlock: {
    marginBottom: LAYOUT.cardGap,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.sectionTitle,
    fontFamily: FONTS.heading,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  sectionHint: {
    fontSize: TYPOGRAPHY.sizes.label,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    marginBottom: SPACING.md,
  },
  courseListContainer: {
    gap: SPACING.sm,
  },
  courseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.base,
    ...SHADOWS.xs,
  },
  courseCardSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  courseCardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  courseCardIconWrapSelected: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.primary,
  },
  courseCardBody: {
    flex: 1,
    gap: 2,
  },
  courseCode: {
    fontSize: TYPOGRAPHY.sizes.metadata,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  courseCodeSelected: {
    color: COLORS.primary,
  },
  courseName: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.text,
    fontFamily: FONTS.heading,
  },
  courseNameSelected: {
    color: COLORS.primaryDark,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  courseRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: SPACING.sm,
  },
  courseRadioSelected: {
    borderColor: COLORS.primary,
  },
  courseRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  previewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: LAYOUT.cardPadding,
    marginBottom: LAYOUT.cardGap,
    ...SHADOWS.sm,
  },
  previewCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  previewCardTitle: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primary,
    fontFamily: FONTS.heading,
  },
  previewDivider: {
    height: 1,
    backgroundColor: COLORS.borderSubtle,
    marginBottom: SPACING.md,
  },
  previewLabel: {
    fontSize: TYPOGRAPHY.sizes.label,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    fontFamily: FONTS.body,
    textTransform: "uppercase",
  },
  chipsWrapper: {
    marginVertical: SPACING.xs,
  },
  previewCountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  previewCountLabel: {
    fontSize: TYPOGRAPHY.sizes.label,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  previewCountValue: {
    fontSize: TYPOGRAPHY.sizes.cardMetricSm,
    fontFamily: FONTS.heading,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primary,
  },
  primaryButton: {
    ...BUTTON_VARIANTS.primary,
    marginTop: SPACING.sm,
    ...SHADOWS.xs,
  },
  primaryButtonText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontFamily: FONTS.body,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(44, 36, 22, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: LAYOUT.screenPadding,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    width: "100%",
    maxHeight: "65%",
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.lg,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.sizes.sectionTitle,
    fontFamily: FONTS.heading,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primary,
    marginBottom: SPACING.base,
    textAlign: "center",
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  modalItemText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.text,
    fontFamily: FONTS.body,
    lineHeight: 20,
  },
  closeButton: {
    marginTop: SPACING.base,
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: RADIUS.md,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeButtonText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    fontFamily: FONTS.body,
  },
  configCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: LAYOUT.cardPadding,
    marginBottom: LAYOUT.cardGap,
    ...SHADOWS.sm,
  },
  configCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  configCardTitle: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primary,
    fontFamily: FONTS.heading,
  },
  configLabel: {
    fontSize: TYPOGRAPHY.sizes.label,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
    fontFamily: FONTS.body,
    textTransform: "uppercase",
  },
  configInput: {
    height: 52,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.text,
    fontFamily: FONTS.body,
    backgroundColor: COLORS.background,
  },
  thresholdSelector: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background,
    justifyContent: "space-between",
  },
  thresholdSelectorText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.text,
    fontFamily: FONTS.body,
  },
  modalSubtitle: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
    marginBottom: SPACING.md,
    textAlign: "center",
  },
  secondaryButton: {
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semibold,
    fontFamily: FONTS.body,
  },
  wifiDetailsContainer: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  wifiDetailText: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.text,
    fontFamily: FONTS.body,
  },
  boldText: {
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});
