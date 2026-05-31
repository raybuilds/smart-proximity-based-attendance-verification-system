import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";

import { getStudentReports } from "../services/reports";
//import { Pressable } from "react-native";

export default function TeacherReportsScreen({ navigation }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      const response = await getStudentReports();
      setStudents(response.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={students}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => (
      <Pressable
  style={styles.card}
  onPress={() =>
    navigation.navigate("StudentDetail", {
      student: item,
    })
  }
>
  <Text style={styles.name}>{item.name}</Text>

  <Text>Roll No: {item.rollNumber}</Text>

  <Text>
    Attendance: {item.attendancePercentage}%
  </Text>

  <Text>
    Present: {item.presentCount}
  </Text>

  <Text>
    Absent: {item.absentCount}
  </Text>
</Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  container: {
    padding: 16,
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },

  name: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
});