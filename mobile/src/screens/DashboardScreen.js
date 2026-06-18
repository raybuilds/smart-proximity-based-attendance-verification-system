import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import { getProtectedProfile } from "../services/auth";
import {
  getStudentSelfReport,
} from "../services/reports";
import { COLORS, TYPOGRAPHY, LAYOUT } from "../utils/theme";

export default function DashboardScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [protectedMessage, setProtectedMessage] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [attendanceReport, setAttendanceReport] =
  useState(null);

   useEffect(() => {
    async function loadReport() {
      try {
        const response =
          await getStudentSelfReport();

        setAttendanceReport(
          response.data
        );
      } catch (error) {
        console.log(error);
      }
    }

    if (user?.role === "student") {
      loadReport();
    }
  }, [user]);

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
        <Text style={styles.subtitle}>
          {user?.role === "student"
            ? "You are signed in as a student."
            : "You are now logged in."}
        </Text>

        <View style={styles.detailsBox}>
          <Text style={styles.detailText}>Name: {user?.name}</Text>
          <Text style={styles.detailText}>Email: {user?.email}</Text>
          <Text style={styles.detailText}>Role: {user?.role}</Text>
        </View>

        {protectedMessage ? (
          <Text style={styles.successText}>{protectedMessage}</Text>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

 {user?.role === "student" ? (
  <>
    {attendanceReport ? (
      <View style={styles.detailsBox}>
        <Text style={styles.detailText}>
          Attendance: {attendanceReport.attendancePercentage}%
        </Text>

        <Text style={styles.detailText}>
          Present: {attendanceReport.presentCount}
        </Text>

        <Text style={styles.detailText}>
          Absent: {attendanceReport.absentCount}
        </Text>

        <Text style={styles.detailText}>
          Total Sessions: {attendanceReport.totalSessions}
        </Text>
      </View>
    ) : null}

    <Pressable
      style={styles.button}
      onPress={() => navigation.navigate("StudentScanner")}
    >
      <Text style={styles.buttonText}>Scan Attendance QR</Text>
    </Pressable>
<Pressable
  style={[
    styles.button,
    { marginTop: 12 },
  ]}
  onPress={() =>
    navigation.navigate(
      "AttendanceHistory"
    )
  }
>
  <Text style={styles.buttonText}>
    My Courses
  </Text>
</Pressable>
  </>
) : (
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
)}
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
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  detailsBox: {
    backgroundColor: "#eff6ff",
    borderRadius: LAYOUT.inputRadius,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  detailText: {
    color: COLORS.text,
    fontSize: 15,
    marginBottom: 6,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  successText: {
    marginBottom: 12,
    color: COLORS.success,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  errorText: {
    marginBottom: 12,
    color: COLORS.error,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  button: {
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
  secondaryButton: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: LAYOUT.buttonRadius,
    height: LAYOUT.buttonHeight,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surface,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "700",
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
});
