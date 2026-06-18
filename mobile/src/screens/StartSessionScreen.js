import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  Modal,
  FlatList,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { getActiveSession, startSession } from "../services/attendance";
import { getCourses } from "../services/courses";
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
} from "lucide-react-native";

export default function StartSessionScreen({ navigation }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useFocusEffect(
    useCallback(() => {
      async function checkActiveSessionAndLoadCourses() {
        try {
          setIsLoading(true);
          setErrorMessage("");

          const [sessionResponse, coursesResponse] = await Promise.all([
            getActiveSession(),
            getCourses(),
          ]);

          if (sessionResponse.session) {
            navigation.replace("ActiveSession", {
              session: sessionResponse.session,
            });
            return;
          }

          const teacherCourses = coursesResponse.courses || [];
          setCourses(teacherCourses);
          setSelectedCourse(null);
        } catch (error) {
          setErrorMessage(
            error.response?.data?.message ||
              "Could not load courses or session status."
          );
        } finally {
          setIsLoading(false);
        }
      }

      checkActiveSessionAndLoadCourses();
    }, [navigation])
  );

  async function handleStartSession() {
    if (!selectedCourse) {
      setErrorMessage("Please select a course first.");
      return;
    }

    try {
      setIsStarting(true);
      setErrorMessage("");
      const response = await startSession(selectedCourse.id);
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
            Launch a live attendance session for your class
          </Text>
        </View>

        <View style={styles.warningCard}>
          <View style={styles.warningCardHeader}>
            <AlertTriangle size={20} color={COLORS.warning} />
            <Text style={styles.warningCardTitle}>No Courses Found</Text>
          </View>
          <Text style={styles.warningCardBody}>
            You must create a course before starting an attendance session.
            Head over to Course Management to set up your first course.
          </Text>
        </View>

        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.navigate("CourseManagement")}
        >
          <BookMarked size={18} color={COLORS.textInverse} />
          <Text style={styles.primaryButtonText}>Manage Courses</Text>
        </Pressable>
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
});
