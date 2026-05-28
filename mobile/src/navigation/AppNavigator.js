import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import ActiveSessionScreen from "../screens/ActiveSessionScreen";
import DashboardScreen from "../screens/DashboardScreen";
import LoginScreen from "../screens/LoginScreen";
import StartSessionScreen from "../screens/StartSessionScreen";
import StudentScannerScreen from "../screens/StudentScannerScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
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
        contentStyle: {
          backgroundColor: "#f8fafc",
        },
      }}
    >
      {isAuthenticated ? (
        user?.role === "teacher" ? (
          <>
            <Stack.Screen
              name="StartSession"
              component={StartSessionScreen}
              options={{ title: "Teacher Dashboard", headerBackVisible: false }}
            />
            <Stack.Screen
              name="ActiveSession"
              component={ActiveSessionScreen}
              options={{ title: "Active Session", headerBackVisible: false }}
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
          </>
        )
      ) : (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: "Login", headerBackVisible: false }}
        />
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
