import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { COLORS, NAVIGATOR_STYLE } from "../utils/theme";

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

import StudentAttendanceHistoryScreen from "../screens/StudentAttendanceHistoryScreen";
import StudentCourseAttendanceScreen from "../screens/StudentCourseAttendanceScreen";
import AdminDashboardScreen from "../screens/AdminDashboardScreen";
import AdminStudentListScreen from "../screens/AdminStudentListScreen";
import AdminStudentDetailScreen from "../screens/AdminStudentDetailScreen";
import AdminTeacherListScreen from "../screens/AdminTeacherListScreen";
import AdminTeacherDetailScreen from "../screens/AdminTeacherDetailScreen";

import AdminCourseListScreen from "../screens/AdminCourseListScreen";
import AdminCourseDetailScreen from "../screens/AdminCourseDetailScreen";
import AdminAuditCenterScreen from "../screens/AdminAuditCenterScreen";
import AdminLiveSessionsScreen from "../screens/AdminLiveSessionsScreen";
import AdminAtRiskScreen from "../screens/AdminAtRiskScreen";
import AdminAnalyticsScreen from "../screens/AdminAnalyticsScreen";
import AdminArchivedCoursesScreen from "../screens/AdminArchivedCoursesScreen";
import AdminArchivedCourseDetailScreen from "../screens/AdminArchivedCourseDetailScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";


const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Determine stack to show based on Auth state
  return (
    <Stack.Navigator
      screenOptions={NAVIGATOR_STYLE}
    >
      {isAuthenticated ? (
        user?.needsPasswordChange ? (
          <Stack.Screen
            name="ChangePassword"
            component={ChangePasswordScreen}
            options={{ title: "Update Password", headerBackVisible: false }}
          />
        ) : user?.role === "admin" ? (
          <>
            <Stack.Screen
              name="AdminDashboard"
              component={AdminDashboardScreen}
              options={{ title: "Admin Dashboard", headerBackVisible: false }}
            />
            <Stack.Screen
              name="AdminStudentList"
              component={AdminStudentListScreen}
              options={{ title: "Manage Students" }}
            />
            <Stack.Screen
              name="AdminStudentDetail"
              component={AdminStudentDetailScreen}
              options={{ title: "Student Detail" }}
            />
            <Stack.Screen
              name="AdminTeacherList"
              component={AdminTeacherListScreen}
              options={{ title: "Manage Teachers" }}
            />
            <Stack.Screen
              name="AdminTeacherDetail"
              component={AdminTeacherDetailScreen}
              options={{ title: "Teacher Detail" }}
            />
            <Stack.Screen
              name="AdminCourseList"
              component={AdminCourseListScreen}
              options={{ title: "Courses Oversight" }}
            />
            <Stack.Screen
              name="AdminCourseDetail"
              component={AdminCourseDetailScreen}
              options={{ title: "Course Overview" }}
            />
            <Stack.Screen
              name="AdminAuditCenter"
              component={AdminAuditCenterScreen}
              options={{ title: "Audit Center" }}
            />
            <Stack.Screen
              name="AdminLiveSessions"
              component={AdminLiveSessionsScreen}
              options={{ title: "Live Sessions" }}
            />
            <Stack.Screen
              name="AdminAtRisk"
              component={AdminAtRiskScreen}
              options={{ title: "At Risk Students" }}
            />
            <Stack.Screen
              name="AdminAnalytics"
              component={AdminAnalyticsScreen}
              options={{ title: "Institutional Analytics" }}
            />
            <Stack.Screen
              name="AdminArchivedCourses"
              component={AdminArchivedCoursesScreen}
              options={{ title: "Course Archive" }}
            />
            <Stack.Screen
              name="AdminArchivedCourseDetail"
              component={AdminArchivedCourseDetailScreen}
              options={{ title: "Archived Course Details" }}
            />
          </>
        ) : user?.role === "teacher" ? (
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
              name="StudentAttendanceHistory"
              component={StudentAttendanceHistoryScreen}
              options={{ title: "Student Attendance History" }}
            />
            <Stack.Screen
              name="DefaulterReport"
              component={DefaulterReportScreen}
              options={{ title: "Defaulter Report" }}
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
                title: "My Courses",
              }}
            />
            <Stack.Screen
              name="StudentCourseAttendance"
              component={StudentCourseAttendanceScreen}
              options={{
                title: "Course Attendance",
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
    backgroundColor: COLORS.background,
  },
});
