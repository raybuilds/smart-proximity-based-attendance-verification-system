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

import { GraduationCap, Mail, Lock } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BUTTON_VARIANTS, LAYOUT } from "../utils/theme";

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("admin@attendance.local");
  const [password, setPassword] = useState("Password@123");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin() {
    if (__DEV__) {
      console.log('[LOGIN] Attempting login for:', email);
    }
    try {
      setIsSubmitting(true);
      setErrorMessage("");
      await signIn({ email, password });
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Login failed. Please check your credentials and try again.";
      if (__DEV__) {
        console.log('[LOGIN] Login failed:', error?.response?.data || error.message);
      }
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        {/* Brand Header */}
        <View style={styles.headerContainer}>
          <View style={styles.iconWrapper}>
            <GraduationCap size={44} color={COLORS.primary} strokeWidth={1.5} />
          </View>
          <Text style={styles.portalTitle}>University Portal</Text>
          <Text style={styles.portalSubtitle}>Attendance & Verification System</Text>
        </View>

        <View style={styles.card}>
          {/* Card Title */}
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to access your dashboard.
          </Text>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Mail size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Enter your email"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputContainer}>
              <Lock size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                placeholder="Enter your password"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry
                style={styles.input}
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          {/* Error Message */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <View style={styles.errorAccent} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Login Button */}
          <Pressable
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.textInverse} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </Pressable>

          {/* Register Button */}
          <Pressable
            style={styles.registerButton}
            onPress={() => navigation.navigate("Register")}
          >
            <Text style={styles.registerButtonText}>Create an Account</Text>
          </Pressable>

          {/* Helper */}
          <Text style={styles.helperText}>
            Test with the seeded admin, teacher, or student credentials.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: LAYOUT.screenPadding,
    paddingVertical: SPACING.xxl,
    backgroundColor: COLORS.background,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.sm,
    ...SHADOWS.xs,
  },
  portalTitle: {
    fontSize: TYPOGRAPHY.sizes.screenTitle,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: TYPOGRAPHY.heading.fontWeight,
    color: COLORS.primary,
    textAlign: "center",
  },
  portalSubtitle: {
    fontSize: TYPOGRAPHY.sizes.label,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.xxs,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: LAYOUT.cardPadding,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.sectionTitle + 2,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SPACING.xxs,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.base,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.sizes.label,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    height: LAYOUT.inputHeight,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  errorBox: {
    flexDirection: "row",
    backgroundColor: COLORS.errorLight,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    overflow: "hidden",
  },
  errorAccent: {
    width: 4,
    backgroundColor: COLORS.error,
    borderTopLeftRadius: RADIUS.md,
    borderBottomLeftRadius: RADIUS.md,
  },
  errorText: {
    flex: 1,
    color: COLORS.error,
    fontSize: TYPOGRAPHY.sizes.body,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    lineHeight: 20,
  },
  button: {
    ...BUTTON_VARIANTS.primary,
    marginTop: SPACING.xs,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  registerButton: {
    ...BUTTON_VARIANTS.secondary,
    marginTop: SPACING.md,
  },
  registerButtonText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  helperText: {
    marginTop: SPACING.lg,
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.metadata,
    lineHeight: 18,
    textAlign: "center",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
});
