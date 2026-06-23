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
import { COLORS, TYPOGRAPHY, LAYOUT, SHADOWS } from "../utils/theme";
import { Search, ChevronRight, Users, BookOpen, Hash, Layers } from "lucide-react-native";

export default function AdminStudentListScreen({ navigation }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    department: "",
    year: "",
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
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => navigation.navigate("AdminStudentDetail", { id: item.id })}
      >
        {/* Card Header: Name + Status Badge */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleBlock}>
            <Text style={styles.studentName}>{item.name}</Text>
            <View style={styles.rollRow}>
              <Hash size={12} color={COLORS.textSecondary} style={{ marginRight: 3 }} />
              <Text style={styles.rollNumber}>{item.rollNumber}</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <Pressable
              style={[
                styles.statusBadge,
                item.isActive ? styles.badgeActive : styles.badgeInactive
              ]}
              onPress={() => handleToggleStatus(item)}
            >
              <Text
                style={[
                  styles.statusText,
                  item.isActive ? styles.statusTextActive : styles.statusTextInactive
                ]}
              >
                {item.isActive ? "Active" : "Inactive"}
              </Text>
            </Pressable>
            <ChevronRight size={18} color={COLORS.textSecondary} style={{ marginLeft: 8 }} />
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Card Details Row */}
        <View style={styles.cardDetails}>
          <View style={styles.detailChip}>
            <BookOpen size={12} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.detailText}>{item.department}</Text>
          </View>
          <View style={styles.detailChip}>
            <Layers size={12} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.detailText}>Sem {item.year}</Text>
          </View>
          <View style={styles.detailChip}>
            <Text style={styles.detailText}>Sec {item.section}</Text>
          </View>
        </View>

        {/* Attendance Row */}
        <View style={styles.attendanceRow}>
          <Text style={styles.attendanceLabel}>Overall Attendance</Text>
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
      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <Search size={18} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name or roll number…"
          placeholderTextColor={COLORS.textSecondary}
          value={filters.search}
          onChangeText={(text) => setFilters((prev) => ({ ...prev, search: text }))}
        />
      </View>

      {/* Filter Row */}
      <View style={styles.filtersRow}>
        <TextInput
          style={styles.filterInput}
          placeholder="Dept"
          placeholderTextColor={COLORS.textSecondary}
          value={filters.department}
          onChangeText={(text) => setFilters((prev) => ({ ...prev, department: text }))}
        />
        <TextInput
          style={styles.filterInput}
          placeholder="Sem"
          placeholderTextColor={COLORS.textSecondary}
          keyboardType="numeric"
          value={filters.year}
          onChangeText={(text) => setFilters((prev) => ({ ...prev, year: text }))}
        />
        <TextInput
          style={styles.filterInput}
          placeholder="Sec"
          placeholderTextColor={COLORS.textSecondary}
          value={filters.section}
          onChangeText={(text) => setFilters((prev) => ({ ...prev, section: text }))}
        />
      </View>

      {/* Count Label */}
      {!loading && (
        <View style={styles.countRow}>
          <Users size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.countText}>
            {students.length} {students.length === 1 ? "student" : "students"} found
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading students…</Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderStudentItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Users size={36} color={COLORS.border} />
              </View>
              <Text style={styles.emptyTitle}>No Students Found</Text>
              <Text style={styles.emptyText}>
                Try adjusting your search or filter criteria.
              </Text>
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
    backgroundColor: COLORS.background,
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: LAYOUT.spacing.lg
  },

  /* ── Search Bar ── */
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.inputRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 48,
    paddingHorizontal: LAYOUT.spacing.md,
    marginBottom: LAYOUT.spacing.md,
    ...SHADOWS.sm
  },
  searchIcon: {
    marginRight: LAYOUT.spacing.sm
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },

  /* ── Filters Row ── */
  filtersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: LAYOUT.spacing.sm,
    marginBottom: LAYOUT.spacing.md
  },
  filterInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: LAYOUT.inputRadius,
    height: 42,
    paddingHorizontal: LAYOUT.spacing.md,
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },

  /* ── Count Label ── */
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: LAYOUT.spacing.md
  },
  countText: {
    fontSize: TYPOGRAPHY.sizes.metadata,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },

  /* ── Loading ── */
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: LAYOUT.spacing.md
  },
  loadingText: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },

  /* ── List ── */
  listContent: {
    paddingBottom: LAYOUT.spacing.xxl
  },

  /* ── Card ── */
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: LAYOUT.cardPadding,
    marginBottom: LAYOUT.cardGap,
    ...SHADOWS.sm
  },
  cardPressed: {
    opacity: 0.92,
    backgroundColor: COLORS.backgroundAlt
  },

  /* ── Card Header ── */
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: LAYOUT.spacing.md
  },
  cardTitleBlock: {
    flex: 1,
    marginRight: LAYOUT.spacing.sm
  },
  studentName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    marginBottom: 3
  },
  rollRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  rollNumber: {
    fontSize: TYPOGRAPHY.sizes.metadata,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center"
  },

  /* ── Status Badge / Pill ── */
  statusBadge: {
    borderRadius: LAYOUT.chipRadius,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  badgeActive: {
    backgroundColor: COLORS.successLight
  },
  badgeInactive: {
    backgroundColor: COLORS.errorLight
  },
  statusText: {
    fontSize: TYPOGRAPHY.sizes.label,
    fontWeight: "600",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  statusTextActive: {
    color: COLORS.success
  },
  statusTextInactive: {
    color: COLORS.error
  },

  /* ── Divider ── */
  divider: {
    height: 1,
    backgroundColor: COLORS.borderSubtle,
    marginBottom: LAYOUT.spacing.md
  },

  /* ── Card Details ── */
  cardDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: LAYOUT.spacing.sm,
    marginBottom: LAYOUT.spacing.md
  },
  detailChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: LAYOUT.chipRadius,
    paddingHorizontal: LAYOUT.spacing.sm,
    paddingVertical: 3
  },
  detailText: {
    fontSize: TYPOGRAPHY.sizes.metadata,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },

  /* ── Attendance Row ── */
  attendanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  attendanceLabel: {
    fontSize: TYPOGRAPHY.sizes.label,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  attendanceValue: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: TYPOGRAPHY.heading.fontFamily
  },
  textRisk: {
    color: COLORS.error
  },
  textSafe: {
    color: COLORS.success
  },

  /* ── Empty State ── */
  emptyState: {
    flex: 1,
    paddingVertical: 60,
    alignItems: "center"
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.backgroundAlt,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: LAYOUT.spacing.lg,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.sizes.sectionTitle,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    marginBottom: LAYOUT.spacing.sm
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    textAlign: "center",
    paddingHorizontal: LAYOUT.spacing.xl
  }
});
