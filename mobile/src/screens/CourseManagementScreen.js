import React, { useCallback, useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  Switch,
  Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getCourses, createCourse, deleteCourse, updateCourse, unarchiveCourse } from "../services/courses";
import EligibilityChips from "../components/EligibilityChips";
import { formatEligibility } from "../utils/eligibility";

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
    console.trace("[CourseManagement] loadCourses");
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

  useFocusEffect(
    React.useCallback(() => {
      console.log("[CourseManagement] focused");

      return () => {
        console.log("[CourseManagement] blurred");
      };
    }, [])
  );

  useEffect(() => {
    loadCourses();
  }, [showArchived, loadCourses]);

  async function handleSubmit() {
    console.trace("[CourseManagement] handleSubmit");
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
      
      // Reload courses
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

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {editingCourse ? "Edit Course" : "Add New Course"}
        </Text>
        
        <Text style={styles.fieldLabel}>Course Name *</Text>
        <TextInput
          placeholder="e.g. Data Mining"
          placeholderTextColor="#94a3b8"
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
          placeholder="e.g. MTH401"
          placeholderTextColor="#94a3b8"
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
            <Text style={styles.fieldLabel}>Dept (Optional)</Text>
            <TextInput
              placeholder="e.g. CSE"
              placeholderTextColor="#94a3b8"
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
          <View style={[styles.col, { marginHorizontal: 8 }]}>
            <Text style={styles.fieldLabel}>Sem (Optional)</Text>
            <TextInput
              placeholder="e.g. 5"
              placeholderTextColor="#94a3b8"
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
            <Text style={styles.fieldLabel}>Sec (Optional)</Text>
            <TextInput
              placeholder="e.g. A"
              placeholderTextColor="#94a3b8"
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
          <Text style={styles.previewLabel}>Eligible Students Preview:</Text>
          <EligibilityChips eligibility={livePreviewData} />
        </View>

        {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.formActions}>
          {editingCourse ? (
            <Pressable
              style={[styles.button, styles.cancelFormBtn]}
              onPress={cancelEdit}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelFormBtnText}>Cancel</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={[styles.button, styles.submitBtn, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>
                {editingCourse ? "Save Changes" : "Create Course"}
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.listHeaderRow}>
        <Text style={styles.listHeader}>Your Courses</Text>
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Show Archived</Text>
          <Switch
            value={showArchived}
            onValueChange={setShowArchived}
            trackColor={{ false: "#cbd5e1", true: "#bfdbfe" }}
            thumbColor={showArchived ? "#1d4ed8" : "#94a3b8"}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f172a" />
        </View>
      ) : courses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No courses found.</Text>
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.courseItemCard}>
              <View style={styles.courseInfo}>
                <View style={styles.courseTitleRow}>
                  <Text style={styles.courseName}>{item.code ? `${item.code} - ${item.name}` : item.name}</Text>
                </View>
                
                <EligibilityChips eligibility={item} isArchived={item.isArchived} />

                <Text style={styles.studentCountText}>
                  Eligible Students: {item.eligibleStudentCount !== undefined ? item.eligibleStudentCount : 0}
                </Text>

                <Text style={styles.courseMeta}>
                  Created: {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
              
              {item.isArchived ? (
                <Pressable
                  style={styles.restoreButton}
                  onPress={() => handleRestoreCourse(item.id)}
                >
                  <Text style={styles.restoreButtonText}>Restore</Text>
                </Pressable>
              ) : (
                <View style={styles.actionButtonsCol}>
                  <Pressable
                    style={styles.editBtnLink}
                    onPress={() => startEditCourse(item)}
                  >
                    <Text style={styles.editBtnLinkText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => openArchiveModal(item)}
                  >
                    <Text style={styles.deleteButtonText}>Archive</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* Custom Archive Modal */}
      <Modal transparent visible={archiveModalVisible} animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Archive Course?</Text>
            <Text style={styles.modalText}>
              This course will no longer appear when starting new attendance sessions.{"\n\n"}
              Historical attendance records and reports will remain available.
            </Text>
            
            <Text style={styles.fieldLabel}>Archive Reason (Optional)</Text>
            <TextInput
              placeholder="e.g. Course completed"
              placeholderTextColor="#94a3b8"
              style={styles.modalInput}
              value={archiveReason}
              onChangeText={setArchiveReason}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setArchiveModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.archiveBtn]}
                onPress={handleArchiveCourse}
              >
                <Text style={styles.archiveBtnText}>Archive</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8fafc",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0f172a",
    backgroundColor: "#ffffff",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  col: {
    flex: 1,
  },
  previewContainer: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtn: {
    backgroundColor: "#0f172a",
    minWidth: 120,
  },
  cancelFormBtn: {
    backgroundColor: "#f1f5f9",
    marginRight: 10,
  },
  cancelFormBtnText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  successText: {
    color: "#166534",
    fontSize: 14,
    marginBottom: 10,
    textAlign: "center",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    marginBottom: 10,
    textAlign: "center",
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  listHeader: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  toggleLabel: {
    fontSize: 14,
    color: "#475569",
    marginRight: 8,
    fontWeight: "500",
  },
  listContainer: {
    paddingBottom: 20,
  },
  courseItemCard: {
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
  courseInfo: {
    flex: 1,
    marginRight: 12,
  },
  courseTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  courseName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
  },
  studentCountText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
    marginTop: 6,
    marginBottom: 2,
  },
  courseMeta: {
    fontSize: 11,
    color: "#94a3b8",
  },
  actionButtonsCol: {
    alignItems: "flex-end",
  },
  editBtnLink: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  editBtnLinkText: {
    color: "#1d4ed8",
    fontSize: 14,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  deleteButtonText: {
    color: "#ef4444",
    fontSize: 13,
    fontWeight: "600",
  },
  restoreButton: {
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  restoreButtonText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyContainer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 15,
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    width: "100%",
    padding: 24,
    shadowColor: "#0f172a",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
    textAlign: "center",
  },
  modalText: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 18,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0f172a",
    backgroundColor: "#ffffff",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    backgroundColor: "#f1f5f9",
    marginRight: 12,
  },
  cancelBtnText: {
    color: "#475569",
    fontSize: 15,
    fontWeight: "600",
  },
  archiveBtn: {
    backgroundColor: "#ef4444",
  },
  archiveBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
