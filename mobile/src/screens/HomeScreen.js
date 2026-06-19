import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { testBackendConnection } from "../services/api";

export default function HomeScreen() {
  const [status, setStatus] = useState("Tap below to test backend connection");

  async function handleConnectionTest() {
    try {
      setStatus("Testing connection...");
      const data = await testBackendConnection();
      setStatus(data.message);
    } catch (error) {
      setStatus("Connection failed. Check WiFi, IP, backend, or firewall.");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Digital Proximity Attendance</Text>
      <Text style={styles.status}>{status}</Text>
      <Pressable style={styles.button} onPress={handleConnectionTest}>
        <Text style={styles.buttonText}>Test Backend Connection</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "#f8fafc",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#0f172a",
    textAlign: "center",
  },
  status: {
    marginTop: 16,
    fontSize: 15,
    color: "#334155",
    textAlign: "center",
    lineHeight: 22,
  },
  button: {
    marginTop: 20,
    backgroundColor: "#0f172a",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});
