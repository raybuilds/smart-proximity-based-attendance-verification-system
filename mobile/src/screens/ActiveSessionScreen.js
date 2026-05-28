import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { endSession, getActiveSession } from "../services/attendance";

export default function ActiveSessionScreen({ navigation, route }) {
  const [session, setSession] = useState(route.params?.session || null);
  const [isLoading, setIsLoading] = useState(!route.params?.session);
  const [isEnding, setIsEnding] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadSession() {
      if (session) {
        return;
      }

      try {
        const response = await getActiveSession();

        if (!response.session) {
          navigation.replace("StartSession");
          return;
        }

        setSession(response.session);
      } catch (error) {
        setErrorMessage(
          error.response?.data?.message ||
            "Could not load the active attendance session."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, [navigation, session]);

  async function handleEndSession() {
    try {
      setIsEnding(true);
      setErrorMessage("");
      await endSession();
      navigation.replace("StartSession");
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Could not end the attendance session."
      );
    } finally {
      setIsEnding(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={styles.errorText}>No active session found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Active Session</Text>
        <Text style={styles.subtitle}>
          Share this session code with students to mark attendance later.
        </Text>

        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Session Code</Text>
          <Text style={styles.codeValue}>{session.sessionCode}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Status: {session.isActive ? "Active" : "Inactive"}</Text>
          <Text style={styles.infoText}>
            Started: {new Date(session.startedAt).toLocaleString()}
          </Text>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Pressable
          style={[styles.primaryButton, isEnding && styles.buttonDisabled]}
          onPress={handleEndSession}
          disabled={isEnding}
        >
          {isEnding ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>End Session</Text>
          )}
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
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 10,
    marginBottom: 20,
    textAlign: "center",
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
  },
  codeBox: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 18,
  },
  codeLabel: {
    color: "#cbd5e1",
    fontSize: 14,
    marginBottom: 8,
  },
  codeValue: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 4,
  },
  infoBox: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
  },
  infoText: {
    color: "#1e293b",
    fontSize: 15,
    marginBottom: 6,
  },
  errorText: {
    marginBottom: 12,
    color: "#dc2626",
    textAlign: "center",
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
