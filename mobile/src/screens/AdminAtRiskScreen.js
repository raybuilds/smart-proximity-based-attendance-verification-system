import React, { useState, useEffect, useCallback } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import { getAdminAtRisk } from "../services/admin";
import { COLORS, TYPOGRAPHY, LAYOUT, SHADOWS } from "../utils/theme";
import {
  AlertTriangle,
  Users,
  BookOpen,
  TrendingDown,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from "lucide-react-native";

// ── Helper: derive risk level from attendance percentage ──────────────────────
function getRiskLevel(pct) {
  const p = parseFloat(pct);
  if (p < 50) return { label: "Critical", bg: COLORS.errorLight, fg: COLORS.error };
  if (p < 65) return { label: "High Risk", bg: COLORS.warningLight, fg: COLORS.warning };
  return { label: "At Risk", bg: "#FDF3E3", fg: COLORS.warning };
}

export default function AdminAtRiskScreen({ navigation }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadStudents = useCallback(async () => {
    try {
      const response = await getAdminAtRisk();
      setStudents(response.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load at-risk students list.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStudents();
  }, [loadStudents]);

  // ── Render: individual student risk card ────────────────────────────────────
  const renderStudentItem = ({ item }) => {
    const risk = getRiskLevel(item.attendancePercentage);
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => navigation.navigate("AdminStudentDetail", { id: item.studentId })}
      >
        {/* Top row: name + attendance % */}
        <View style={styles.cardTopRow}>
          <View style={styles.studentAvatarCircle}>
            <Text style={styles.studentAvatarText}>
              {item.name ? item.name.charAt(0).toUpperCase() : "?"}
            </Text>
          </View>
          <View style={styles.nameBlock}>
            <Text style={styles.studentName} numberOfLines={1}>{item.name}</Text>
            {item.rollNumber ? (
              <Text style={styles.rollText}>Roll No: {item.rollNumber}</Text>
            ) : null}
          </View>
          <View style={styles.percentageBlock}>
            <Text style={styles.percentageValue}>{item.attendancePercentage}%</Text>
            <Text style={styles.percentageLabel}>Attendance</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Bottom row: dept, semester, classes needed, risk badge */}
        <View style={styles.cardBottomRow}>
          <View style={styles.metaChipsRow}>
            {item.department ? (
              <View style={styles.metaChip}>
                <BookOpen size={11} color={COLORS.textSecondary} />
                <Text style={styles.metaChipText}>{item.department}</Text>
              </View>
            ) : null}
            {item.semester ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>Sem {item.semester}</Text>
              </View>
            ) : null}
          </View>

          {/* Risk level badge */}
          <View style={[styles.riskBadge, { backgroundColor: risk.bg }]}>
            <AlertCircle size={11} color={risk.fg} />
            <Text style={[styles.riskBadgeText, { color: risk.fg }]}>{risk.label}</Text>
          </View>
        </View>

        {/* Classes needed warning row */}
        <View style={styles.neededRow}>
          <TrendingDown size={13} color={COLORS.error} />
          <Text style={styles.neededText}>
            Consecutive classes needed: {item.classesNeededFor75}
          </Text>
        </View>

        {/* Chevron */}
        <View style={styles.chevronWrapper}>
          <ChevronRight size={16} color={COLORS.textSecondary} />
        </View>
      </Pressable>
    );
  };

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading at-risk students…</Text>
      </View>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={styles.center}>
        <View style={styles.errorCard}>
          <AlertTriangle size={32} color={COLORS.error} style={{ marginBottom: 10 }} />
          <Text style={styles.errorTitle}>Unable to Load Data</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
        <Pressable style={styles.retryButton} onPress={loadStudents}>
          <RefreshCw size={16} color={COLORS.textInverse} />
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  // ── Main list ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <FlatList
        data={students}
        keyExtractor={(item) => item.studentId.toString()}
        renderItem={renderStudentItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListHeaderComponent={
          <>
            {/* Warning header card */}
            <View style={styles.headerCard}>
              <View style={styles.headerCardIconBg}>
                <AlertTriangle size={22} color={COLORS.warning} />
              </View>
              <View style={styles.headerCardContent}>
                <Text style={styles.headerCardTitle}>Students At Risk</Text>
                <Text style={styles.headerCardSub}>
                  Students with attendance below 75% requiring immediate attention
                </Text>
              </View>
            </View>

            {/* Count summary bar */}
            {students.length > 0 && (
              <View style={styles.summaryBar}>
                <View style={styles.summaryItem}>
                  <Users size={16} color={COLORS.error} />
                  <Text style={styles.summaryCount}>{students.length}</Text>
                  <Text style={styles.summaryLabel}>
                    {students.length === 1 ? "Student" : "Students"}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <AlertCircle size={16} color={COLORS.warning} />
                  <Text style={styles.summaryCount}>
                    {students.filter(s => parseFloat(s.attendancePercentage) < 50).length}
                  </Text>
                  <Text style={styles.summaryLabel}>Critical</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <TrendingDown size={16} color={COLORS.warning} />
                  <Text style={styles.summaryCount}>
                    {students.filter(s => {
                      const p = parseFloat(s.attendancePercentage);
                      return p >= 50 && p < 75;
                    }).length}
                  </Text>
                  <Text style={styles.summaryLabel}>High Risk</Text>
                </View>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <CheckCircle size={36} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>All Clear!</Text>
            <Text style={styles.emptyText}>
              No students are currently below the 75% attendance threshold.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Layout ──────────────────────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: LAYOUT.screenPadding
  },
  listContainer: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: LAYOUT.spacing.lg,
    paddingBottom: LAYOUT.spacing.xxl,
    flexGrow: 1
  },

  // ── Loading ─────────────────────────────────────────────────────────────────
  loadingText: {
    marginTop: LAYOUT.spacing.md,
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.body.fontFamily
  },

  // ── Warning Header Card ─────────────────────────────────────────────────────
  headerCard: {
    backgroundColor: COLORS.warningLight,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: "#F0D9B5",
    padding: LAYOUT.cardPadding,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: LAYOUT.spacing.md,
    ...SHADOWS.sm
  },
  headerCardIconBg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FDE9C7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: LAYOUT.spacing.md,
    borderWidth: 1,
    borderColor: "#F0D9B5"
  },
  headerCardContent: {
    flex: 1
  },
  headerCardTitle: {
    fontSize: TYPOGRAPHY.sizes.sectionTitle,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.warning,
    marginBottom: 3
  },
  headerCardSub: {
    fontSize: TYPOGRAPHY.sizes.metadata,
    color: "#8B6914",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    lineHeight: 16
  },

  // ── Count Summary Bar ───────────────────────────────────────────────────────
  summaryBar: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: LAYOUT.spacing.md,
    paddingHorizontal: LAYOUT.spacing.base,
    marginBottom: LAYOUT.cardGap,
    ...SHADOWS.xs
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: LAYOUT.spacing.xs
  },
  summaryCount: {
    fontSize: TYPOGRAPHY.sizes.cardMetricSm,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.sizes.micro,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: TYPOGRAPHY.weights.medium
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.borderSubtle
  },

  // ── Student Risk Card ───────────────────────────────────────────────────────
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
    opacity: 0.93,
    transform: [{ scale: 0.992 }]
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: LAYOUT.spacing.md
  },
  studentAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.errorLight,
    borderWidth: 1.5,
    borderColor: "#F0B8B3",
    justifyContent: "center",
    alignItems: "center",
    marginRight: LAYOUT.spacing.md
  },
  studentAvatarText: {
    fontSize: 17,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.error
  },
  nameBlock: {
    flex: 1,
    paddingRight: LAYOUT.spacing.sm
  },
  studentName: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    marginBottom: 2
  },
  rollText: {
    fontSize: TYPOGRAPHY.sizes.metadata,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: TYPOGRAPHY.weights.medium
  },
  percentageBlock: {
    alignItems: "center",
    backgroundColor: COLORS.errorLight,
    borderRadius: LAYOUT.inputRadius,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#F0B8B3"
  },
  percentageValue: {
    fontSize: TYPOGRAPHY.sizes.cardMetricSm,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.error,
    lineHeight: 22
  },
  percentageLabel: {
    fontSize: TYPOGRAPHY.sizes.micro,
    color: COLORS.error,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: TYPOGRAPHY.weights.medium,
    opacity: 0.75
  },

  // ── Card Divider ────────────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: COLORS.borderSubtle,
    marginBottom: LAYOUT.spacing.md
  },

  // ── Card Bottom: meta chips + risk badge ────────────────────────────────────
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: LAYOUT.spacing.sm
  },
  metaChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: LAYOUT.spacing.sm,
    flexWrap: "wrap",
    flex: 1
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: LAYOUT.chipRadius,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  metaChipText: {
    fontSize: TYPOGRAPHY.sizes.micro,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: TYPOGRAPHY.weights.medium
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: LAYOUT.chipRadius,
    paddingHorizontal: 9,
    paddingVertical: 4
  },
  riskBadgeText: {
    fontSize: TYPOGRAPHY.sizes.micro,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: TYPOGRAPHY.weights.semibold
  },

  // ── Classes Needed Row ──────────────────────────────────────────────────────
  neededRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: LAYOUT.spacing.xs,
    backgroundColor: COLORS.errorLight,
    borderRadius: 8,
    paddingHorizontal: LAYOUT.spacing.sm,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#F0B8B3",
    marginTop: LAYOUT.spacing.xs
  },
  neededText: {
    fontSize: TYPOGRAPHY.sizes.label,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.error,
    flex: 1
  },

  // ── Chevron ─────────────────────────────────────────────────────────────────
  chevronWrapper: {
    position: "absolute",
    right: LAYOUT.spacing.md,
    top: LAYOUT.spacing.md
  },

  // ── Empty State ─────────────────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 56,
    paddingHorizontal: LAYOUT.screenPadding
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: LAYOUT.spacing.lg,
    borderWidth: 1,
    borderColor: "#B2D8CA"
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.sizes.sectionTitle,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primary,
    marginBottom: LAYOUT.spacing.sm
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    textAlign: "center",
    lineHeight: 20
  },

  // ── Error State ─────────────────────────────────────────────────────────────
  errorCard: {
    backgroundColor: COLORS.errorLight,
    borderRadius: LAYOUT.cardRadius,
    padding: LAYOUT.cardPadding,
    borderWidth: 1,
    borderColor: "#F0B8B3",
    marginBottom: LAYOUT.spacing.lg,
    alignItems: "center",
    width: "100%",
    ...SHADOWS.sm
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.error,
    marginBottom: LAYOUT.spacing.xs
  },
  errorText: {
    color: COLORS.error,
    textAlign: "center",
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontSize: TYPOGRAPHY.sizes.body,
    opacity: 0.85
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.buttonRadius,
    height: LAYOUT.buttonHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: LAYOUT.spacing.sm,
    paddingHorizontal: LAYOUT.spacing.xl,
    ...SHADOWS.sm
  },
  retryButtonText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.sizes.bodyLg,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontFamily: TYPOGRAPHY.body.fontFamily
  }
});
