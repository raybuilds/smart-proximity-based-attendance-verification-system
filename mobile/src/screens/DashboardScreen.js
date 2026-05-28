import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import { getProtectedProfile } from "../services/auth";

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const [protectedMessage, setProtectedMessage] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleProtectedCheck() {
    try {
      setIsFetching(true);
      setErrorMessage("");
      const response = await getProtectedProfile();
      setProtectedMessage(
        `${response.message} (${response.user.email} - ${response.user.role})`
      );
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          "Could not verify protected route access."
      );
    } finally {
      setIsFetching(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Attendance Dashboard</Text>
        <Text style={styles.subtitle}>You are now logged in.</Text>

        <View style={styles.detailsBox}>
          <Text style={styles.detailText}>Name: {user?.name}</Text>
          <Text style={styles.detailText}>Email: {user?.email}</Text>
          <Text style={styles.detailText}>Role: {user?.role}</Text>
        </View>

        {protectedMessage ? (
          <Text style={styles.successText}>{protectedMessage}</Text>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Pressable
          style={[styles.button, isFetching && styles.buttonDisabled]}
          onPress={handleProtectedCheck}
          disabled={isFetching}
        >
          {isFetching ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Test Protected Route</Text>
          )}
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={signOut}>
          <Text style={styles.secondaryButtonText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#f8fafc",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 24,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    color: "#475569",
    textAlign: "center",
    marginBottom: 20,
  },
  detailsBox: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
  },
  detailText: {
    color: "#1e293b",
    fontSize: 15,
    marginBottom: 6,
  },
  successText: {
    marginBottom: 12,
    color: "#15803d",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    marginBottom: 12,
    color: "#dc2626",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#0f172a",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700",
  },
});
