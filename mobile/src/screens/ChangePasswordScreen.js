import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from "react-native";
import { Lock } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, BUTTON_VARIANTS, LAYOUT, FONTS } from "../utils/theme";

export default function ChangePasswordScreen({ navigation }) {
  const { signOut } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handlePasswordChange() {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setErrorMessage("All fields are required.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("New passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");
      
      await api.post("/auth/change-password", {
        oldPassword,
        newPassword,
      });

      setSuccessMessage("Password successfully updated. Please sign in again with your new password.");
      Alert.alert(
        "Success",
        "Password changed successfully. You will now be signed out to log in again.",
        [{ text: "OK", onPress: () => signOut() }]
      );
    } catch (error) {
      const message = error.response?.data?.message || "Failed to update password.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconWrapper}>
            <Lock size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Update Your Password</Text>
          <Text style={styles.subtitle}>
            You are logging in with a temporary password or a password update is required for your account. Please set a new secure password.
          </Text>

          {/* Old Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Current Temporary Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Enter current password"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry
                style={styles.input}
                value={oldPassword}
                onChangeText={setOldPassword}
              />
            </View>
          </View>

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>New Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Enter new password (min 6 chars)"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Confirm new password"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
          </View>

          {/* Error Message */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Success Message */}
          {successMessage ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          <Pressable
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handlePasswordChange}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.textInverse} />
            ) : (
              <Text style={styles.buttonText}>Change Password & Log Out</Text>
            )}
          </Pressable>

          <Pressable style={styles.signOutButton} onPress={signOut}>
            <Text style={styles.signOutButtonText}>Cancel & Sign Out</Text>
          </Pressable>
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
    paddingVertical: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: LAYOUT.cardPadding,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
    alignItems: "center",
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.sectionTitle + 2,
    fontFamily: FONTS.heading,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  inputGroup: {
    width: "100%",
    marginBottom: SPACING.base,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.sizes.label,
    fontFamily: FONTS.body,
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
  input: {
    flex: 1,
    height: "100%",
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    color: COLORS.text,
    fontFamily: FONTS.body,
  },
  errorBox: {
    width: "100%",
    backgroundColor: COLORS.errorLight,
    borderColor: "rgba(176, 58, 46, 0.15)",
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.sizes.body,
    fontFamily: FONTS.body,
    textAlign: "center",
  },
  successBox: {
    width: "100%",
    backgroundColor: COLORS.successLight,
    borderColor: "rgba(45, 106, 79, 0.15)",
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  successText: {
    color: COLORS.success,
    fontSize: TYPOGRAPHY.sizes.body,
    fontFamily: FONTS.body,
    textAlign: "center",
  },
  button: {
    ...BUTTON_VARIANTS.primary,
    width: "100%",
    marginTop: SPACING.xs,
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
  signOutButton: {
    ...BUTTON_VARIANTS.outline,
    width: "100%",
    borderColor: COLORS.border,
    marginTop: SPACING.md,
  },
  signOutButtonText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontFamily: FONTS.body,
  },
});
