import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import ActiveSessionScreen from "../screens/ActiveSessionScreen";
import DashboardScreen from "../screens/DashboardScreen";
import LoginScreen from "../screens/LoginScreen";
import StartSessionScreen from "../screens/StartSessionScreen";
import TeacherDashboardScreen from "../screens/TeacherDashboardScreen";
import CourseManagementScreen from "../screens/CourseManagementScreen";
import StudentScannerScreen from "../screens/StudentScannerScreen";
import WifiDetectionScreen from "../screens/WifiDetectionScreen";
import BleTestScreen from "../screens/BleTestScreen";
import TeacherReportsScreen from "../screens/TeacherReportsScreen";
import StudentDetailScreen from "../screens/StudentDetailScreen";
import AttendanceHistoryScreen from "../screens/AttendanceHistoryScreen";
import RegisterScreen from "../screens/RegisterScreen";
import CourseDetailReportScreen from "../screens/CourseDetailReportScreen";
import StudentAttendanceReportScreen from "../screens/StudentAttendanceReportScreen";
import DefaulterReportScreen from "../screens/DefaulterReportScreen";
import CourseTrendScreen from "../screens/CourseTrendScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  console.log('[Navigator] render');
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerTitleAlign: "center",
        headerStyle: {
          backgroundColor: "#2C5F2D",
        },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: {
          fontFamily: "serif",
          fontWeight: "bold",
        },
        contentStyle: {
          backgroundColor: "#F5F1E8",
        },
      }}
    >
      {isAuthenticated ? (
        user?.role === "teacher" ? (
          <>
            <Stack.Screen
              name="TeacherDashboard"
              component={TeacherDashboardScreen}
              options={{ title: "Teacher Dashboard", headerBackVisible: false }}
            />
            <Stack.Screen
              name="StartSession"
              component={StartSessionScreen}
              options={{ title: "Start Session" }}
            />
            <Stack.Screen
              name="ActiveSession"
              component={ActiveSessionScreen}
              options={{ title: "Active Session", headerBackVisible: false }}
            />
            <Stack.Screen
              name="TeacherReports"
              component={TeacherReportsScreen}
              options={{ title: "Course Reports" }}
            />
            <Stack.Screen
             name="StudentDetail"
             component={StudentDetailScreen}
             options={{ title: "Student Details" }}
             />
            <Stack.Screen
              name="CourseManagement"
              component={CourseManagementScreen}
              options={{ title: "Course Management" }}
            />
            <Stack.Screen
              name="CourseDetailReport"
              component={CourseDetailReportScreen}
              options={{ title: "Course Details" }}
            />
            <Stack.Screen
              name="StudentAttendanceReport"
              component={StudentAttendanceReportScreen}
              options={{ title: "Student Attendance" }}
            />
            <Stack.Screen
              name="DefaulterReport"
              component={DefaulterReportScreen}
              options={{ title: "Defaulter Report" }}
            />
            <Stack.Screen
              name="CourseTrend"
              component={CourseTrendScreen}
              options={{ title: "Attendance Trends" }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{ title: "Dashboard", headerBackVisible: false }}
            />
            <Stack.Screen
              name="StudentScanner"
              component={StudentScannerScreen}
              options={{ title: "Scan Attendance" }}
            />
            <Stack.Screen
              name="WifiDetection"
              component={WifiDetectionScreen}
              options={{ title: "WiFi Detection" }}
            />
             <Stack.Screen
  name="AttendanceHistory"
  component={AttendanceHistoryScreen}
  options={{
    title: "Attendance History",
  }}
/>
            <Stack.Screen
              name="BleTest"
              component={BleTestScreen}
              options={{ title: "BLE Test" }}
            />
          </>
        )
      ) : (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: "Login", headerBackVisible: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ title: "Register" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
});

