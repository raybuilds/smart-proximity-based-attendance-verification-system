import React, { useState, useEffect, useCallback } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  Pressable,
  RefreshControl
} from "react-native";
import { BookOpen } from "lucide-react-native";
import { getAdminCourses } from "../services/admin";
import { COLORS, TYPOGRAPHY, LAYOUT } from "../utils/theme";
import FadeInContainer from "../components/FadeInContainer";
import InteractiveCard from "../components/InteractiveCard";
import SkeletonCard from "../components/SkeletonCard";
import EmptyState from "../components/EmptyState";

export default function AdminCourseListScreen({ navigation }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadCourses = useCallback(async () => {
    try {
      const response = await getAdminCourses();
      setCourses(response.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load courses oversight data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCourses();
  }, [loadCourses]);

  const getBadgeStyle = (pct) => {
    if (pct >= 85) return styles.badgeGreen;
    if (pct >= 75) return styles.badgeAmber;
    return styles.badgeRed;
  };

  const renderCourseItem = ({ item }) => {
    return (
      <InteractiveCard
        style={styles.card}
        onPress={() => navigation.navigate("AdminCourseDetail", { id: item.courseId })}
      >
        <View style={styles.cardRow}>
          <View style={styles.mainInfo}>
            <Text style={styles.courseCode}>{item.courseCode || "N/A"}</Text>
            <Text style={styles.courseName}>{item.courseName}</Text>
            <Text style={styles.teacherName}>Instructor: {item.teacherName}</Text>
            <Text style={styles.metaText}>
              Dept: {item.department} | Sem: {item.year} | Sec: {item.section}
            </Text>
          </View>
          <View style={styles.sideInfo}>
            <View style={[styles.pctBadge, getBadgeStyle(item.attendancePercentage)]}>
              <Text style={styles.pctText}>{item.attendancePercentage}%</Text>
            </View>
            <Text style={styles.studentsLabel}>{item.studentCount} Students</Text>
            {item.activeSession ? (
              <View style={styles.activeSessionIndicator}>
                <Text style={styles.activeSessionText}>LIVE</Text>
              </View>
            ) : null}
          </View>
        </View>
      </InteractiveCard>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <SkeletonCard height={96} marginVertical={8} />
        <SkeletonCard height={96} marginVertical={8} />
        <SkeletonCard height={96} marginVertical={8} />
        <SkeletonCard height={96} marginVertical={8} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
        <Pressable style={styles.retryButton} onPress={loadCourses}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FadeInContainer style={styles.container}>
      <FlatList
        data={courses}
        keyExtractor={(item) => item.courseId.toString()}
        renderItem={renderCourseItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <EmptyState
            Icon={BookOpen}
            title="No Courses Yet"
            description="Create a course to begin managing attendance."
          />
        }
      />
    </FadeInContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  listContainer: {
    padding: 16,
    flexGrow: 1
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.cardRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  mainInfo: {
    flex: 1,
    paddingRight: 8
  },
  courseCode: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginBottom: 2
  },
  courseName: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    marginBottom: 4
  },
  teacherName: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    opacity: 0.8,
    marginBottom: 2
  },
  metaText: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  sideInfo: {
    alignItems: "flex-end",
    justifyContent: "center"
  },
  pctBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 4
  },
  badgeGreen: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC"
  },
  badgeAmber: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D"
  },
  badgeRed: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5"
  },
  pctText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e293b",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  studentsLabel: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  activeSessionIndicator: {
    marginTop: 6,
    backgroundColor: "#FEE2E2",
    borderColor: "#EF4444",
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  activeSessionText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#EF4444"
  },
  errorCard: {
    backgroundColor: "#FEE2E2",
    borderRadius: LAYOUT.cardRadius,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    marginBottom: 16
  },
  errorText: {
    color: COLORS.error,
    textAlign: "center",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.buttonRadius,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: "center"
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.body.fontFamily
  }
});
