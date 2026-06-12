import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import { COLORS, TYPOGRAPHY, LAYOUT } from "../utils/theme";

export default function RegisterScreen({ navigation }) {
  const { signUp } = useAuth();
  
  // Always visible fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("student"); // "student" | "teacher"

  // Conditionally rendered student fields
  const [rollNumber, setRollNumber] = useState("");
  const [semester, setSemester] = useState("");
  const [section, setSection] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleRegister() {
    // Trimming whitespaces on general fields
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedDepartment = department.trim();

    // Prevent submission if empty strings containing only spaces are entered
    if (!trimmedName || !trimmedEmail || !trimmedPassword || !trimmedDepartment) {
      setErrorMessage("Please fill in all general fields.");
      return;
    }

    if (trimmedPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    let registrationData = {
      name: trimmedName,
      email: trimmedEmail,
      password: trimmedPassword,
      role,
      department: trimmedDepartment,
    };

    if (role === "student") {
      const trimmedRoll = rollNumber.trim();
      const trimmedSection = section.trim();
      const trimmedSemester = semester.trim();

      if (!trimmedRoll || !trimmedSection || !trimmedSemester) {
        setErrorMessage("Please fill in all student details.");
        return;
      }

      const semNum = parseInt(trimmedSemester, 10);
      if (isNaN(semNum) || semNum <= 0) {
        setErrorMessage("Semester must be a positive number.");
        return;
      }

      registrationData = {
        ...registrationData,
        rollNumber: trimmedRoll,
        semester: semNum,
        section: trimmedSection,
      };
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      await signUp(registrationData);
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Registration failed. Please check your details and try again.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>
          Sign up as a student or teacher to get started.
        </Text>

        {/* Tab-based Role Selector */}
        <View style={styles.roleContainer}>
          <Pressable
            style={[styles.roleTab, role === "student" && styles.roleTabActive]}
            onPress={() => {
              setRole("student");
              setErrorMessage("");
            }}
          >
            <Text style={[styles.roleText, role === "student" && styles.roleTextActive]}>
              Student
            </Text>
          </Pressable>
          <Pressable
            style={[styles.roleTab, role === "teacher" && styles.roleTabActive]}
            onPress={() => {
              setRole("teacher");
              setErrorMessage("");
            }}
          >
            <Text style={[styles.roleText, role === "teacher" && styles.roleTextActive]}>
              Teacher
            </Text>
          </Pressable>
        </View>

        {/* General Inputs */}
        <TextInput
          placeholder="Name"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />

        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          placeholder="Password (min 6 chars)"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        <TextInput
          placeholder="Department"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          value={department}
          onChangeText={setDepartment}
        />

        {/* Conditionally Rendered Student Fields */}
        {role === "student" && (
          <>
            <TextInput
              placeholder="Roll Number"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              value={rollNumber}
              onChangeText={setRollNumber}
            />

            <TextInput
              keyboardType="number-pad"
              placeholder="Semester"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              value={semester}
              onChangeText={setSemester}
            />

            <TextInput
              placeholder="Section (e.g. A)"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              value={section}
              onChangeText={setSection}
            />
          </>
        )}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Pressable
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.linkButton}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.linkText}>Already have an account? Login</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
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
    marginTop: 8,
    marginBottom: 20,
    fontSize: 14,
    lineHeight: 20,
    color: "#64748b",
    textAlign: "center",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  roleContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: LAYOUT.inputRadius,
    marginBottom: 16,
    overflow: "hidden",
  },
  roleTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: COLORS.surface,
  },
  roleTabActive: {
    backgroundColor: COLORS.primary,
  },
  roleText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  roleTextActive: {
    color: "#ffffff",
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: LAYOUT.inputRadius,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    marginBottom: 14,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  button: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.buttonRadius,
    height: LAYOUT.buttonHeight,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  errorText: {
    marginBottom: 8,
    color: COLORS.error,
    fontSize: 14,
    textAlign: "center",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  linkButton: {
    marginTop: 16,
    alignItems: "center",
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
});
