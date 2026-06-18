import React, { useCallback, useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  Plus,
  Edit2,
  Archive,
  RefreshCw,
  AlertTriangle,
  BookOpen,
  Sparkles,
  Layers,
  GraduationCap,
  Calendar,
  Users,
  Info,
  CheckCircle,
  XCircle,
} from "lucide-react-native";
import { getCourses, createCourse, deleteCourse, updateCourse, unarchiveCourse } from "../services/courses";
import EligibilityChips from "../components/EligibilityChips";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BUTTON_VARIANTS, BADGES, LAYOUT, FONTS } from "../utils/theme";

export default function CourseManagementScreen() {
  console.log("[CourseManagement] render");
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [section, setSection] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // Edit state
  const [editingCourse, setEditingCourse] = useState(null);
  
  // Archival modal state
  const [archiveModalVisible, setArchiveModalVisible] = useState(false);
  const [courseToArchive, setCourseToArchive] = useState(null);
  const [archiveReason, setArchiveReason] = useState("");
  
  // Show archived toggle state
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    console.log("[CourseManagement] mounted");
    return () => {
      console.log("[CourseManagement] unmounted");
    };
  }, []);

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await getCourses(showArchived);
      setCourses(response.courses || []);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Could not load courses."
      );
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useFocusEffect(
    useCallback(() => {
      loadCourses();
    }, [loadCourses])
  );

  useEffect(() => {
    loadCourses();
  }, [showArchived, loadCourses]);

  async function handleSubmit() {
    const trimmed = courseName.trim();
    if (!trimmed) {
      setErrorMessage("Course name is required.");
      return;
    }
    if (trimmed.length < 2) {
      setErrorMessage("Course name must be at least 2 characters.");
      return;
    }
    if (trimmed.length > 100) {
      setErrorMessage("Course name cannot exceed 100 characters.");
      return;
    }

    const payload = {
      name: trimmed,
      code: courseCode.trim() || null,
      department: department.trim() || null,
      semester: semester.trim() ? parseInt(semester, 10) : null,
      section: section.trim() || null,
    };

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");
      
      if (editingCourse) {
        await updateCourse(editingCourse.id, payload);
        setSuccessMessage("Course updated successfully!");
        setEditingCourse(null);
      } else {
        await createCourse(payload);
        setSuccessMessage("Course created successfully!");
      }
      
      setCourseName("");
      setCourseCode("");
      setDepartment("");
      setSemester("");
      setSection("");
      
      const response = await getCourses(showArchived);
      setCourses(response.courses || []);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Operation failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEditCourse(course) {
    setEditingCourse(course);
    setCourseName(course.name);
    setCourseCode(course.code || "");
    setDepartment(course.department || "");
    setSemester(course.semester ? course.semester.toString() : "");
    setSection(course.section || "");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function cancelEdit() {
    setEditingCourse(null);
    setCourseName("");
    setCourseCode("");
    setDepartment("");
    setSemester("");
    setSection("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openArchiveModal(course) {
    setCourseToArchive(course);
    setArchiveReason("");
    setArchiveModalVisible(true);
  }

  async function handleArchiveCourse() {
    if (!courseToArchive) return;
    try {
      setErrorMessage("");
      setSuccessMessage("");
      await deleteCourse(courseToArchive.id, archiveReason.trim() || null);
      setArchiveModalVisible(false);
      setSuccessMessage("Course archived successfully.");
      
      const response = await getCourses(showArchived);
      setCourses(response.courses || []);
    } catch (error) {
      setArchiveModalVisible(false);
      setErrorMessage(
        error.response?.data?.message || "Could not archive course."
      );
    }
  }

  async function handleRestoreCourse(courseId) {
    try {
      setErrorMessage("");
      setSuccessMessage("");
      await unarchiveCourse(courseId);
      setSuccessMessage("Course restored successfully.");
      
      const response = await getCourses(showArchived);
      setCourses(response.courses || []);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Could not restore course."
      );
    }
  }

  const livePreviewData = {
    department: department || null,
    semester: semester ? parseInt(semester, 10) : null,
    section: section || null,
  };

  const renderHeader = () => (
    <View>
      {/* 1. Add/Edit Course Card */}
      <View style={[styles.card, editingCourse && styles.editingCard]}>
        <View style={styles.formHeaderRow}>
          <BookOpen size={20} color={COLORS.primary} style={styles.formIcon} />
          <Text style={styles.sectionTitle}>
            {editingCourse ? "Edit Course Parameters" : "Create New Course"}
          </Text>
        </View>
        
        <Text style={styles.fieldLabel}>Course Name *</Text>
        <TextInput
          placeholder="e.g. Operating Systems"
          placeholderTextColor={COLORS.textSecondary}
          style={styles.input}
          value={courseName}
          onChangeText={(text) => {
            setCourseName(text);
            if (errorMessage) setErrorMessage("");
            if (successMessage) setSuccessMessage("");
          }}
        />

        <Text style={styles.fieldLabel}>Course Code (Optional)</Text>
        <TextInput
          placeholder="e.g. CS401"
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="characters"
          style={styles.input}
          value={courseCode}
          onChangeText={(text) => {
            setCourseCode(text);
            if (errorMessage) setErrorMessage("");
            if (successMessage) setSuccessMessage("");
          }}
        />

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.fieldLabel}>Dept</Text>
            <TextInput
              placeholder="CSE"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="characters"
              style={styles.input}
              value={department}
              onChangeText={(text) => {
                setDepartment(text);
                if (errorMessage) setErrorMessage("");
                if (successMessage) setSuccessMessage("");
              }}
            />
          </View>
          <View style={[styles.col, { marginHorizontal: SPACING.md }]}>
            <Text style={styles.fieldLabel}>Semester</Text>
            <TextInput
              placeholder="e.g. 6"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="number-pad"
              style={styles.input}
              value={semester}
              onChangeText={(text) => {
                setSemester(text);
                if (errorMessage) setErrorMessage("");
                if (successMessage) setSuccessMessage("");
              }}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.fieldLabel}>Section</Text>
            <TextInput
              placeholder="e.g. A"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="characters"
              style={styles.input}
              value={section}
              onChangeText={(text) => {
                setSection(text);
                if (errorMessage) setErrorMessage("");
                if (successMessage) setSuccessMessage("");
              }}
            />
          </View>
        </View>

        {/* Live Preview UI */}
        <View style={styles.previewContainer}>
          <View style={styles.previewHeaderRow}>
            <Sparkles size={14} color={COLORS.primary} style={styles.previewIcon} />
            <Text style={styles.previewLabel}>Eligible Students Preview</Text>
          </View>
          <View style={styles.chipsWrapper}>
            <EligibilityChips eligibility={livePreviewData} />
          </View>
        </View>

        {successMessage ? (
          <View style={[styles.feedbackBox, styles.successBox]}>
            <CheckCircle size={16} color={COLORS.success} style={styles.feedbackIcon} />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}
        
        {errorMessage ? (
          <View style={[styles.feedbackBox, styles.errorBox]}>
            <XCircle size={16} color={COLORS.error} style={styles.feedbackIcon} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.formActions}>
          {editingCourse ? (
            <Pressable
              style={styles.cancelFormBtn}
              onPress={cancelEdit}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelFormBtnText}>Cancel</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={[styles.submitBtn, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.textInverse} />
            ) : (
              <>
                <Plus size={16} color={COLORS.textInverse} />
                <Text style={styles.buttonText}>
                  {editingCourse ? "Save Changes" : "Create Course"}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {/* 2. Course Header & Filter Toggle */}
      <View style={styles.listHeaderRow}>
        <Text style={styles.listHeader}>Your Enrolled Courses</Text>
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Show Archived</Text>
          <Switch
            value={showArchived}
            onValueChange={setShowArchived}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={showArchived ? COLORS.primary : COLORS.textSecondary}
          />
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {loading && courses.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Info size={32} color={COLORS.textSecondary} style={styles.emptyIcon} />
              <Text style={styles.emptyText}>No registered courses found.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.courseItemCard, item.isArchived && styles.archivedItemCard]}>
              <View style={styles.courseInfo}>
                <View style={styles.courseTitleRow}>
                  <Text style={styles.courseName}>
                    {item.code ? `${item.code} - ${item.name}` : item.name}
                  </Text>
                  {item.isArchived && (
                    <View style={styles.archiveBadge}>
                      <Text style={styles.archiveBadgeText}>Archived</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.cardChipsWrapper}>
                  <EligibilityChips eligibility={item} isArchived={item.isArchived} />
                </View>

                <View style={styles.metaInfoRow}>
                  <Users size={13} color={COLORS.textSecondary} style={styles.metaIcon} />
                  <Text style={styles.studentCountText}>
                    Eligible Students: <Text style={styles.boldText}>{item.eligibleStudentCount !== undefined ? item.eligibleStudentCount : 0}</Text>
                  </Text>
                </View>

                <View style={styles.metaInfoRow}>
                  <Calendar size={13} color={COLORS.textSecondary} style={styles.metaIcon} />
                  <Text style={styles.courseMeta}>
                    Created: {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              
              {item.isArchived ? (
                <Pressable
                  style={styles.restoreButton}
                  onPress={() => handleRestoreCourse(item.id)}
                >
                  <RefreshCw size={14} color={COLORS.success} />
                  <Text style={styles.restoreButtonText}>Restore</Text>
                </Pressable>
              ) : (
                <View style={styles.actionButtonsCol}>
                  <Pressable
                    style={styles.editBtnLink}
                    onPress={() => startEditCourse(item)}
                  >
                    <Edit2 size={14} color={COLORS.primary} />
                    <Text style={styles.editBtnLinkText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => openArchiveModal(item)}
                  >
                    <Archive size={14} color={COLORS.error} />
                    <Text style={styles.deleteButtonText}>Archive</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* 4. Custom Archive Modal */}
      <Modal transparent visible={archiveModalVisible} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalAlertHeader}>
              <AlertTriangle size={32} color={COLORS.warning} />
              <Text style={styles.modalTitle}>Archive Course?</Text>
            </View>
            <Text style={styles.modalText}>
              This course will no longer appear when starting new attendance sessions.{"\n\n"}
              Historical attendance records and reports will remain fully available.
            </Text>
            
            <Text style={styles.modalInputLabel}>Archive Reason (Optional)</Text>
            <TextInput
              placeholder="e.g. Course completed"
              placeholderTextColor={COLORS.textSecondary}
              style={styles.modalInput}
              value={archiveReason}
              onChangeText={setArchiveReason}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setArchiveModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.archiveBtn}
                onPress={handleArchiveCourse}
              >
                <Text style={styles.archiveBtnText}>Archive</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginHorizontal: SPACING.base,
    marginTop: SPACING.base,
    marginBottom: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  editingCard: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  formHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.base,
  },
  formIcon: {
    marginRight: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.sectionTitle,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.text,
    fontFamily: FONTS.heading,
  },
  fieldLabel: {
    fontSize: TYPOGRAPHY.sizes.metadata,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.base,
    height: LAYOUT.inputHeight - 2,
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    marginBottom: SPACING.md,
    fontFamily: FONTS.body,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  col: {
    flex: 1,
  },
  previewContainer: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: SPACING.base,
  },
  previewHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  previewIcon: {
    marginRight: SPACING.xs,
  },
  previewLabel: {
    fontSize: TYPOGRAPHY.sizes.label,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textSecondary,
  },
  chipsWrapper: {
    marginTop: SPACING.xs,
  },
  cardChipsWrapper: {
    marginVertical: SPACING.xs,
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.sm,
  },
  submitBtn: {
    ...BUTTON_VARIANTS.primary,
    height: 46,
    paddingHorizontal: SPACING.xl,
  },
  cancelFormBtn: {
    ...BUTTON_VARIANTS.outline,
    height: 46,
    paddingHorizontal: SPACING.xl,
  },
  cancelFormBtnText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontFamily: FONTS.body,
  },
  feedbackBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.base,
  },
  successBox: {
    backgroundColor: COLORS.successLight,
    borderColor: "rgba(45, 106, 79, 0.15)",
  },
  errorBox: {
    backgroundColor: COLORS.errorLight,
    borderColor: "rgba(176, 58, 46, 0.15)",
  },
  feedbackIcon: {
    marginRight: SPACING.sm,
  },
  successText: {
    flex: 1,
    color: COLORS.success,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semibold,
    fontFamily: FONTS.body,
  },
  errorText: {
    flex: 1,
    color: COLORS.error,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semibold,
    fontFamily: FONTS.body,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    marginHorizontal: SPACING.base,
  },
  listHeader: {
    fontSize: TYPOGRAPHY.sizes.sectionTitle,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    fontFamily: FONTS.heading,
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  toggleLabel: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  listContainer: {
    paddingBottom: SPACING.xxl,
  },
  courseItemCard: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.md,
    marginHorizontal: SPACING.base,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.xs,
  },
  archivedItemCard: {
    backgroundColor: COLORS.backgroundAlt,
    borderColor: COLORS.border,
    opacity: 0.85,
  },
  courseInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  courseTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  courseName: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    fontFamily: FONTS.heading,
  },
  archiveBadge: {
    ...BADGES.warning,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 1,
  },
  archiveBadgeText: {
    fontSize: TYPOGRAPHY.sizes.micro,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.warning,
  },
  metaInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.xs,
  },
  metaIcon: {
    marginRight: SPACING.xs,
  },
  studentCountText: {
    fontSize: TYPOGRAPHY.sizes.metadata,
    color: COLORS.text,
    fontFamily: FONTS.body,
  },
  boldText: {
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  courseMeta: {
    fontSize: TYPOGRAPHY.sizes.metadata,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
  },
  actionButtonsCol: {
    alignItems: "flex-end",
    gap: SPACING.xs,
  },
  editBtnLink: {
    ...BUTTON_VARIANTS.outline,
    height: 32,
    paddingHorizontal: SPACING.md,
    borderColor: COLORS.primary,
  },
  editBtnLinkText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sizes.metadata,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  deleteButton: {
    ...BUTTON_VARIANTS.danger,
    backgroundColor: COLORS.errorLight,
    height: 32,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(176, 58, 46, 0.15)",
  },
  deleteButtonText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.sizes.metadata,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  restoreButton: {
    ...BUTTON_VARIANTS.secondary,
    backgroundColor: COLORS.successLight,
    height: 32,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(45, 106, 79, 0.15)",
  },
  restoreButtonText: {
    color: COLORS.success,
    fontSize: TYPOGRAPHY.sizes.metadata,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  emptyContainer: {
    padding: SPACING.xxl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: SPACING.base,
    marginTop: SPACING.md,
  },
  emptyIcon: {
    marginBottom: SPACING.sm,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontFamily: FONTS.body,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    width: "100%",
    padding: SPACING.xl,
    ...SHADOWS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalAlertHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
    justifyContent: "center",
    gap: SPACING.sm,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.sizes.sectionTitle,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    fontFamily: FONTS.heading,
  },
  modalText: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: SPACING.base,
    fontFamily: FONTS.body,
  },
  modalInputLabel: {
    fontSize: TYPOGRAPHY.sizes.metadata,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textTransform: "uppercase",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.base,
    height: LAYOUT.inputHeight - 4,
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    marginBottom: SPACING.base,
    fontFamily: FONTS.body,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  cancelBtn: {
    ...BUTTON_VARIANTS.outline,
    flex: 1,
    height: 44,
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  archiveBtn: {
    ...BUTTON_VARIANTS.danger,
    flex: 1,
    height: 44,
  },
  archiveBtnText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});
