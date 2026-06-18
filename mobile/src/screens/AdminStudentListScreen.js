import React, { useState, useEffect, useCallback } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  ActivityIndicator,
  Alert
} from "react-native";
import { getAdminStudents, toggleUserStatus } from "../services/admin";
import { COLORS, TYPOGRAPHY, LAYOUT } from "../utils/theme";

export default function AdminStudentListScreen({ navigation }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    department: "",
    semester: "",
    section: ""
  });

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAdminStudents(filters);
      setStudents(response.data);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not load students.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadStudents();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [loadStudents]);

  const handleToggleStatus = (student) => {
    const newStatus = !student.isActive;
    const actionText = newStatus ? "activate" : "deactivate";
    const message = newStatus
      ? "This user will be allowed to log in."
      : "This user will be unable to log in until reactivated.";

    Alert.alert(
      `${newStatus ? "Activate" : "Deactivate"} User?`,
      message,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await toggleUserStatus(student.userId, newStatus);
              // Update state locally
              setStudents((prev) =>
                prev.map((s) =>
                  s.userId === student.userId ? { ...s, isActive: newStatus } : s
                )
              );
            } catch (err) {
              console.error(err);
              Alert.alert("Error", err.response?.data?.message || "Failed to update user status.");
            }
          }
        }
      ]
    );
  };

  const renderStudentItem = ({ item }) => {
    return (
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate("AdminStudentDetail", { id: item.id })}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.studentName}>{item.name}</Text>
            <Text style={styles.rollNumber}>{item.rollNumber}</Text>
          </View>
          <Pressable
            style={[
              styles.statusBadge,
              item.isActive ? styles.badgeActive : styles.badgeInactive
            ]}
            onPress={() => handleToggleStatus(item)}
          >
            <Text style={styles.statusText}>{item.isActive ? "ACTIVE" : "INACTIVE"}</Text>
          </Pressable>
        </View>

        <View style={styles.cardDetails}>
          <Text style={styles.detailText}>Dept: {item.department}</Text>
          <Text style={styles.detailText}>Sem: {item.semester}</Text>
          <Text style={styles.detailText}>Sec: {item.section}</Text>
        </View>

        <View style={styles.attendanceRow}>
          <Text style={styles.attendanceLabel}>Overall Attendance:</Text>
          <Text
            style={[
              styles.attendanceValue,
              item.overallAttendance < 75 ? styles.textRisk : styles.textSafe
            ]}
          >
            {item.overallAttendance}%
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <TextInput
        style={styles.input}
        placeholder="Search Name or Roll Number..."
        value={filters.search}
        onChangeText={(text) => setFilters((prev) => ({ ...prev, search: text }))}
      />

      {/* Roster Filters Row */}
      <View style={styles.filtersRow}>
        <TextInput
          style={[styles.input, styles.filterInput]}
          placeholder="Dept"
          value={filters.department}
          onChangeText={(text) => setFilters((prev) => ({ ...prev, department: text }))}
        />
        <TextInput
          style={[styles.input, styles.filterInput]}
          placeholder="Sem"
          keyboardType="numeric"
          value={filters.semester}
          onChangeText={(text) => setFilters((prev) => ({ ...prev, semester: text }))}
        />
        <TextInput
          style={[styles.input, styles.filterInput]}
          placeholder="Sec"
          value={filters.section}
          onChangeText={(text) => setFilters((prev) => ({ ...prev, section: text }))}
        />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderStudentItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No students found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.background
  },
  input: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: LAYOUT.inputRadius,
    height: 40,
    paddingHorizontal: 12,
    marginBottom: 10,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  filtersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  filterInput: {
    width: "31%",
    marginBottom: 0
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  listContent: {
    paddingBottom: 20
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  studentName: {
    fontSize: 15,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.heading.fontFamily
  },
  rollNumber: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginTop: 2
  },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  badgeActive: {
    backgroundColor: "#DCFCE7", // Light Green
    borderWidth: 1,
    borderColor: COLORS.success
  },
  badgeInactive: {
    backgroundColor: "#FEE2E2", // Light Red
    borderWidth: 1,
    borderColor: COLORS.error
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  cardDetails: {
    flexDirection: "row",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 8
  },
  detailText: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginRight: 16
  },
  attendanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  attendanceLabel: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  attendanceValue: {
    fontSize: 15,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  textRisk: {
    color: COLORS.error
  },
  textSafe: {
    color: COLORS.success
  },
  emptyState: {
    padding: 30,
    alignItems: "center"
  },
  emptyText: {
    fontSize: 14,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily
  }
});
