import React, { useState, useEffect, useCallback } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  TextInput
} from "react-native";
import { getAdminManualCorrections } from "../services/admin";
import { COLORS, TYPOGRAPHY, LAYOUT } from "../utils/theme";

export default function AdminAuditCenterScreen() {
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [reasonSearch, setReasonSearch] = useState("");
  const [error, setError] = useState("");

  const loadCorrections = useCallback(async (pageNum = 1, isRefresh = false) => {
    if (pageNum > 1) {
      setLoadingMore(true);
    } else if (!isRefresh) {
      setLoading(true);
    }
    try {
      const response = await getAdminManualCorrections({
        reason: reasonSearch || undefined,
        page: pageNum,
        limit: 20
      });
      const data = response.data;
      if (pageNum === 1) {
        setCorrections(data.items);
      } else {
        setCorrections((prev) => [...prev, ...data.items]);
      }
      setPage(data.page);
      setTotalPages(data.totalPages);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load audit logs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [reasonSearch]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadCorrections(1);
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [loadCorrections]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCorrections(1, true);
  }, [loadCorrections]);

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      loadCorrections(page + 1);
    }
  };

  const renderCorrectionItem = ({ item }) => {
    const dateStr = new Date(item.correctedOn).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.studentName}>{item.student.name}</Text>
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>
        <Text style={styles.infoText}>
          <Text style={styles.bold}>Course: </Text>
          {item.course.name} {item.course.code ? `(${item.course.code})` : ""}
        </Text>
        <Text style={styles.infoText}>
          <Text style={styles.bold}>Corrected By: </Text>
          {item.teacher.name}
        </Text>
        <View style={styles.reasonBlock}>
          <Text style={styles.reasonLabel}>Reason for Correction:</Text>
          <Text style={styles.reasonText}>{item.reason || "Not specified"}</Text>
        </View>
      </View>
    );
  };

  if (loading && corrections.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Filter Header */}
      <View style={styles.filterBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Filter by correction reason..."
          value={reasonSearch}
          onChangeText={setReasonSearch}
          placeholderTextColor="#94a3b8"
        />
      </View>

      {error ? (
        <View style={styles.center}>
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
          <Pressable style={styles.retryButton} onPress={() => loadCorrections(1)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={corrections}
          keyExtractor={(item, idx) => idx.toString()}
          renderItem={renderCorrectionItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No correction records found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 16
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  filterBar: {
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  searchInput: {
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.buttonRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    height: 44,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  studentName: {
    fontSize: 15,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.heading.fontFamily
  },
  dateText: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily
  },
  infoText: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginBottom: 4
  },
  bold: {
    fontWeight: "bold",
    color: COLORS.primary
  },
  reasonBlock: {
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#64748b",
    marginBottom: 2
  },
  reasonText: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontStyle: "italic"
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center"
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40
  },
  emptyText: {
    fontSize: 14,
    color: "#64748b",
    fontFamily: TYPOGRAPHY.body.fontFamily
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
    paddingHorizontal: 20
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: TYPOGRAPHY.body.fontFamily
  }
});
