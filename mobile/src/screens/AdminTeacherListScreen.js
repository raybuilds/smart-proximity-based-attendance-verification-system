import React, { useState, useEffect, useCallback } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Alert
} from "react-native";
import { getAdminTeachers, toggleUserStatus } from "../services/admin";
import { COLORS, TYPOGRAPHY, LAYOUT } from "../utils/theme";
import InteractiveCard from "../components/InteractiveCard";
import FadeInContainer from "../components/FadeInContainer";
import SkeletonCard from "../components/SkeletonCard";
import EmptyState from "../components/EmptyState";
import { GraduationCap } from "lucide-react-native";

export default function AdminTeacherListScreen({ navigation }) {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAdminTeachers();
      setTeachers(response.data);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not load teachers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  const handleToggleStatus = (teacher) => {
    const newStatus = !teacher.isActive;
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
              await toggleUserStatus(teacher.userId, newStatus);
              // Update state locally
              setTeachers((prev) =>
                prev.map((t) =>
                  t.userId === teacher.userId ? { ...t, isActive: newStatus } : t
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

  const renderTeacherItem = ({ item }) => {
    return (
      <InteractiveCard
        style={styles.card}
        onPress={() => navigation.navigate("AdminTeacherDetail", { id: item.id })}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.teacherName}>{item.name}</Text>
            <Text style={styles.employeeId}>Employee ID: {item.employeeId}</Text>
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

        <View style={styles.cardStats}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{item.coursesCount}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{item.studentsCount}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{item.manualCorrections}</Text>
            <Text style={styles.statLabel}>Corrections</Text>
          </View>
        </View>
      </InteractiveCard>
    );
  };

  return (
    <FadeInContainer style={styles.container}>
      {loading ? (
        <ScrollView style={{ flex: 1 }}>
          <SkeletonCard height={120} marginVertical={6} borderRadius={LAYOUT.cardRadius} />
          <SkeletonCard height={120} marginVertical={6} borderRadius={LAYOUT.cardRadius} />
          <SkeletonCard height={120} marginVertical={6} borderRadius={LAYOUT.cardRadius} />
        </ScrollView>
      ) : (
        <FlatList
          data={teachers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTeacherItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              Icon={GraduationCap}
              title="No Teachers Found"
              description="Registered teachers will appear in this oversight directory."
            />
          }
        />
      )}
    </FadeInContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.background
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
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 8
  },
  teacherName: {
    fontSize: 15,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.heading.fontFamily
  },
  employeeId: {
    fontSize: 11,
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
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: COLORS.success
  },
  badgeInactive: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: COLORS.error
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  cardStats: {
    flexDirection: "row",
    justifyContent: "space-around"
  },
  statBox: {
    alignItems: "center"
  },
  statVal: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.heading.fontFamily
  },
  statLabel: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginTop: 2
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
