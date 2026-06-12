import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  Modal,
  FlatList,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { getActiveSession, startSession } from "../services/attendance";
import { getCourses } from "../services/courses";
import EligibilityChips from "../components/EligibilityChips";
import { COLORS, TYPOGRAPHY, LAYOUT } from "../utils/theme";

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
          
          // Pre-select first course if available
          if (teacherCourses.length > 0 && !selectedCourse) {
            setSelectedCourse(null); // start with unselected to force explicit choice or set it
          }
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
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  // Warning state if teacher has zero courses
  if (courses.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Start Session</Text>
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              You must create a course before starting an attendance session.
            </Text>
          </View>

          <Pressable
            style={styles.primaryButton}
            onPress={() => navigation.navigate("CourseManagement")}
          >
            <Text style={styles.primaryButtonText}>Manage Courses</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Start Session</Text>
        <Text style={styles.subtitle}>
          Welcome, {user?.name}. Start a live attendance session when your class begins.
        </Text>

        <Text style={styles.fieldLabel}>Course</Text>
        <Pressable
          style={styles.dropdownSelector}
          onPress={() => setShowDropdown(true)}
        >
          <Text style={styles.dropdownSelectorText}>
            {selectedCourse ? selectedCourse.name : "Select a Course ▼"}
          </Text>
        </Pressable>

        {selectedCourse ? (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Eligible Students:</Text>
            <EligibilityChips eligibility={selectedCourse} />
            <Text style={styles.previewCount}>
              Matching Students: {selectedCourse.eligibleStudentCount !== undefined ? selectedCourse.eligibleStudentCount : 0}
            </Text>
          </View>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Pressable
          style={[
            styles.primaryButton,
            (!selectedCourse || isStarting) && styles.buttonDisabled,
          ]}
          onPress={handleStartSession}
          disabled={!selectedCourse || isStarting}
        >
          {isStarting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>Start Attendance Session</Text>
          )}
        </Pressable>
      </View>

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
                  <Text style={styles.modalItemText}>{item.name}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 26,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: TYPOGRAPHY.heading.fontWeight,
    color: COLORS.primary,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 10,
    marginBottom: 20,
    textAlign: "center",
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  dropdownSelector: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: LAYOUT.inputRadius,
    paddingHorizontal: 16,
    height: 48,
    backgroundColor: COLORS.surface,
    marginBottom: 20,
    justifyContent: "center",
  },
  dropdownSelectorText: {
    fontSize: 16,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  previewCard: {
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.cardRadius,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  previewCount: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
    marginTop: 8,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  warningBox: {
    backgroundColor: "#fffbeb",
    borderRadius: LAYOUT.cardRadius,
    padding: 16,
    borderWidth: 1,
    borderColor: "#fde68a",
    marginBottom: 24,
  },
  warningText: {
    color: "#92400e",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  errorText: {
    marginBottom: 12,
    color: COLORS.error,
    textAlign: "center",
    lineHeight: 20,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.buttonRadius,
    height: LAYOUT.buttonHeight,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.modalRadius,
    width: "100%",
    maxHeight: "60%",
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: TYPOGRAPHY.heading.fontWeight,
    color: COLORS.primary,
    marginBottom: 16,
    textAlign: "center",
  },
  modalItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalItemText: {
    fontSize: 16,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  closeButton: {
    marginTop: 16,
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.buttonRadius,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "700",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
});
