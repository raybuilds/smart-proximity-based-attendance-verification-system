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
import { COLORS, TYPOGRAPHY, LAYOUT, SPACING, RADIUS, SHADOWS, BUTTON_VARIANTS, BADGES, FONTS } from "../utils/theme";
import { AlertCircle, User, Award, Mail, Lock, Building, GraduationCap, Layers, Sparkles } from "lucide-react-native";

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
  const [year, setYear] = useState("");
  const [section, setSection] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleRegister() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedDepartment = department.trim();

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
      const trimmedYear = year.trim();

      if (!trimmedRoll || !trimmedSection || !trimmedYear) {
        setErrorMessage("Please fill in all student details.");
        return;
      }

      const semNum = parseInt(trimmedYear, 10);
      if (isNaN(semNum) || semNum <= 0) {
        setErrorMessage("Year must be a positive number.");
        return;
      }

      registrationData = {
        ...registrationData,
        rollNumber: trimmedRoll,
        year: semNum,
        section: trimmedSection,
      };
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      if (__DEV__) console.log("REGISTER PAYLOAD", registrationData);
      const response = await signUp(registrationData);
      if (__DEV__) console.log("REGISTER RESPONSE", response);
    } catch (error) {
      if (__DEV__) {
        console.log("REGISTER ERROR", error);
        console.log("REGISTER ERROR DATA", error?.response?.data);
      }
      
      let message = "Registration failed. Please try again.";
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message === "Network Error" || !error.response) {
        message = "Unable to connect to server.";
      }
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
            <GraduationCap size={16} color={role === "student" ? COLORS.textInverse : COLORS.textSecondary} style={styles.roleIcon} />
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
            <Award size={16} color={role === "teacher" ? COLORS.textInverse : COLORS.textSecondary} style={styles.roleIcon} />
            <Text style={[styles.roleText, role === "teacher" && styles.roleTextActive]}>
              Teacher
            </Text>
          </Pressable>
        </View>

        {/* General Inputs */}
        <View style={styles.inputWrapper}>
          <User size={16} color={COLORS.textSecondary} style={styles.inputIcon} />
          <TextInput
            placeholder="Full Name"
            placeholderTextColor={COLORS.textSecondary}
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputWrapper}>
          <Mail size={16} color={COLORS.textSecondary} style={styles.inputIcon} />
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email Address"
            placeholderTextColor={COLORS.textSecondary}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputWrapper}>
          <Lock size={16} color={COLORS.textSecondary} style={styles.inputIcon} />
          <TextInput
            placeholder="Password (min 6 chars)"
            placeholderTextColor={COLORS.textSecondary}
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <View style={styles.inputWrapper}>
          <Building size={16} color={COLORS.textSecondary} style={styles.inputIcon} />
          <TextInput
            placeholder="Department (e.g. CSE)"
            placeholderTextColor={COLORS.textSecondary}
            style={styles.input}
            value={department}
            onChangeText={setDepartment}
          />
        </View>

        {/* Conditionally Rendered Student Fields */}
        {role === "student" && (
          <>
            <View style={styles.dividerBlock}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>Student Academic Details</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.inputWrapper}>
              <Award size={16} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                placeholder="Roll Number (e.g. 2021CSE102)"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.input}
                value={rollNumber}
                onChangeText={setRollNumber}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputWrapper, { flex: 1, marginRight: SPACING.sm }]}>
                <Layers size={16} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  keyboardType="number-pad"
                  placeholder="Year (e.g. 6)"
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.input}
                  value={year}
                  onChangeText={setYear}
                />
              </View>

              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <Sparkles size={16} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  placeholder="Section (e.g. A)"
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.input}
                  value={section}
                  onChangeText={setSection}
                />
              </View>
            </View>
          </>
        )}

        {errorMessage ? (
          <View style={[styles.feedbackBox, styles.errorBox]}>
            <AlertCircle size={16} color={COLORS.error} style={styles.feedbackIcon} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.textInverse} />
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
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.xl,
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
  title: {
    fontSize: TYPOGRAPHY.sizes.screenTitle,
    fontFamily: FONTS.heading,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primary,
    textAlign: "center",
  },
  subtitle: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
    fontSize: TYPOGRAPHY.sizes.body,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: "center",
    fontFamily: FONTS.body,
  },
  roleContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.base,
    overflow: "hidden",
    backgroundColor: COLORS.background,
    padding: 3,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderRadius: RADIUS.sm,
  },
  roleTabActive: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.xs,
  },
  roleIcon: {
    marginRight: SPACING.xs,
  },
  roleText: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
  },
  roleTextActive: {
    color: COLORS.textInverse,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.base,
    height: 48,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.text,
    fontFamily: FONTS.body,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dividerBlock: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: SPACING.base,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.borderSubtle,
  },
  dividerLabel: {
    fontSize: TYPOGRAPHY.sizes.micro,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textTransform: "uppercase",
    marginHorizontal: SPACING.sm,
    letterSpacing: 0.5,
  },
  button: {
    ...BUTTON_VARIANTS.primary,
    marginTop: SPACING.sm,
    height: 48,
    ...SHADOWS.xs,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
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
  errorBox: {
    backgroundColor: COLORS.errorLight,
    borderColor: "rgba(176, 58, 46, 0.15)",
  },
  feedbackIcon: {
    marginRight: SPACING.sm,
  },
  errorText: {
    flex: 1,
    color: COLORS.error,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semibold,
    fontFamily: FONTS.body,
  },
  linkButton: {
    marginTop: SPACING.base,
    alignItems: "center",
  },
  linkText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semibold,
    fontFamily: FONTS.body,
  },
});
