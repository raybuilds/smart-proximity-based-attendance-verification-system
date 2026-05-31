import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getTeacherOverview } from "../services/reports";
import { useAuth } from "../context/AuthContext";
import { getActiveSession, startSession } from "../services/attendance";

export default function StartSessionScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [overview, setOverview] = useState(null);
  useFocusEffect(
    useCallback(() => {
      async function checkActiveSession() {
  try {
    const [sessionResponse, overviewResponse] =
      await Promise.all([
        getActiveSession(),
        getTeacherOverview(),
      ]);

    setOverview(overviewResponse.data);

    if (sessionResponse.session) {
      navigation.replace("ActiveSession", {
        session: sessionResponse.session,
      });
    }
  } catch (error) {
    setErrorMessage(
      error.response?.data?.message ||
        "Could not load dashboard information."
    );
  }
}

      checkActiveSession();
    }, [navigation])
  );

  async function handleStartSession() {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const response = await startSession();
      navigation.replace("ActiveSession", {
        session: response.session,
      });
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          "Could not start the attendance session."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Teacher Dashboard</Text>
        <Text style={styles.subtitle}>
          Welcome, {user?.name}. Start a live attendance session when your class begins.
        </Text>

        <View style={styles.infoBox}>
          {overview ? (
  <View style={styles.analyticsBox}>
    <Text style={styles.analyticsTitle}>
      Attendance Analytics
    </Text>

    <Text style={styles.analyticsText}>
      Students: {overview.totalStudents}
    </Text>

    <Text style={styles.analyticsText}>
      Sessions: {overview.totalSessions}
    </Text>

    <Text style={styles.analyticsText}>
      Records: {overview.totalAttendanceRecords}
    </Text>

    <Text style={styles.analyticsText}>
      Attendance: {overview.attendancePercentage}%
    </Text>
  </View>
) : null}
          <Text style={styles.infoText}>Role: {user?.role}</Text>
          <Text style={styles.infoText}>Email: {user?.email}</Text>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Pressable
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={handleStartSession}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>Start Attendance Session</Text>
          )}
        </Pressable>
        <Pressable
         style={styles.secondaryButton}
         onPress={() =>
         navigation.navigate("TeacherReports")
        }
       >
        <Text style={styles.secondaryButtonText}>
              View Student Reports
        </Text>
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
  buttonDisabled: {
    opacity: 0.7,
  },
  analyticsBox: {
  backgroundColor: "#f8fafc",
  borderRadius: 12,
  padding: 16,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: "#e2e8f0",
},

analyticsTitle: {
  fontSize: 18,
  fontWeight: "700",
  color: "#0f172a",
  marginBottom: 10,
},

analyticsText: {
  fontSize: 15,
  color: "#334155",
  marginBottom: 6,
},
});
