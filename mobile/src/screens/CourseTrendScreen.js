import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";
import Svg, {
  Path,
  Circle,
  Text as SvgText,
  Line,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { getCourseTrends } from "../services/reports";

const { width: screenWidth } = Dimensions.get("window");

export default function CourseTrendScreen({ route }) {
  if (__DEV__) {
    console.log("[CourseTrend] Screen mounted");
  }
  const { courseId } = route.params;
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeIndex, setActiveIndex] = useState(null);

  const loadTrends = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await getCourseTrends(courseId);
      setTrends(response);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Could not load attendance trends."
      );
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      </View>
    );
  }

  const { averageAttendance, highestAttendance, lowestAttendance, data } = trends || {};

  const hasSessions = data && data.length > 0;

  const formatDateLabel = (dateStr) => {
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const day = parts[2];
    const month = months[parseInt(parts[1], 10) - 1] || parts[1];
    const year = parts[0];
    return `${day}-${month}-${year}`;
  };

  // SVG dimensions
  const svgWidth = screenWidth - 48; // Padding margins
  const svgHeight = 240;
  const chartMargin = { left: 40, right: 20, top: 30, bottom: 40 };
  const chartWidth = svgWidth - chartMargin.left - chartMargin.right;
  const chartHeight = svgHeight - chartMargin.top - chartMargin.bottom;

  const getX = (index) => {
    if (data.length <= 1) return chartMargin.left + chartWidth / 2;
    return chartMargin.left + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (percentage) => {
    return chartMargin.top + chartHeight - (percentage / 100) * chartHeight;
  };

  let linePath = "";
  let areaPath = "";

  if (hasSessions) {
    const points = data.map(
      (d, idx) => `${getX(idx)},${getY(d.attendancePercentage)}`
    );
    linePath = `M ${points.join(" L ")}`;
    
    // Closed path for gradient fill
    areaPath = `
      M ${getX(0)},${chartMargin.top + chartHeight}
      L ${points.join(" L ")}
      L ${getX(data.length - 1)},${chartMargin.top + chartHeight}
      Z
    `;
  }

  const activePoint = activeIndex !== null ? data[activeIndex] : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 1. Statistics Cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: "#3b82f6" }]}>
          <Text style={styles.statNum}>{averageAttendance?.toFixed(2)}%</Text>
          <Text style={styles.statLabel}>Avg Attendance</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: "#10b981" }]}>
          <Text style={styles.statNum}>{highestAttendance?.toFixed(2)}%</Text>
          <Text style={styles.statLabel}>Highest Record</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: "#ef4444" }]}>
          <Text style={styles.statNum}>{lowestAttendance?.toFixed(2)}%</Text>
          <Text style={styles.statLabel}>Lowest Record</Text>
        </View>
      </View>

      {/* 2. Chart Section */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Session-wise Attendance Trend</Text>
        
        {!hasSessions ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No attendance sessions available yet.</Text>
          </View>
        ) : (
          <View style={styles.chartWrapper}>
            <Svg width={svgWidth} height={svgHeight}>
              <Defs>
                <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                  <Stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </LinearGradient>
              </Defs>

              {/* Grid Lines */}
              {[0, 25, 50, 75, 100].map((tick) => (
                <React.Fragment key={tick}>
                  <Line
                    x1={chartMargin.left}
                    y1={getY(tick)}
                    x2={svgWidth - chartMargin.right}
                    y2={getY(tick)}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                  />
                  <SvgText
                    x={chartMargin.left - 10}
                    y={getY(tick) + 4}
                    fontSize="10"
                    fill="#94a3b8"
                    textAnchor="end"
                    fontWeight="600"
                  >
                    {tick}%
                  </SvgText>
                </React.Fragment>
              ))}

              {/* X Axis Ticks */}
              {data.map((d, idx) => {
                // Label every few sessions if count is high, to avoid clutter
                const shouldShowLabel =
                  data.length <= 8 ||
                  idx === 0 ||
                  idx === data.length - 1 ||
                  idx % Math.ceil(data.length / 5) === 0;

                return (
                  <React.Fragment key={idx}>
                    <Line
                      x1={getX(idx)}
                      y1={chartMargin.top + chartHeight}
                      x2={getX(idx)}
                      y2={chartMargin.top + chartHeight + 5}
                      stroke="#cbd5e1"
                      strokeWidth="1"
                    />
                    {shouldShowLabel && (
                      <SvgText
                        x={getX(idx)}
                        y={chartMargin.top + chartHeight + 18}
                        fontSize="9"
                        fill="#64748b"
                        textAnchor="middle"
                        fontWeight="600"
                      >
                        S#{idx + 1}
                      </SvgText>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Area path */}
              <Path d={areaPath} fill="url(#gradient)" />

              {/* Line path */}
              <Path
                d={linePath}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
              />

              {/* Points */}
              {data.map((d, idx) => (
                <React.Fragment key={idx}>
                  <Circle
                    cx={getX(idx)}
                    cy={getY(d.attendancePercentage)}
                    r={activeIndex === idx ? 6 : 4}
                    fill={activeIndex === idx ? "#1e40af" : "#3b82f6"}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  {/* Click overlay */}
                  <Circle
                    cx={getX(idx)}
                    cy={getY(d.attendancePercentage)}
                    r={20}
                    fill="transparent"
                    onPress={() => setActiveIndex(idx === activeIndex ? null : idx)}
                  />
                </React.Fragment>
              ))}
            </Svg>

            {/* Interactive Tooltip view */}
            {activePoint && (
              <View
                style={[
                  styles.tooltip,
                  {
                    left: Math.max(
                      10,
                      Math.min(
                        svgWidth - 160,
                        getX(activeIndex) - 75
                      )
                    ),
                    top: Math.max(
                      5,
                      getY(activePoint.attendancePercentage) - 70
                    ),
                  },
                ]}
              >
                <Text style={styles.tooltipTitle}>Session #{activeIndex + 1}</Text>
                <Text style={styles.tooltipText}>
                  Attendance: {activePoint.attendancePercentage.toFixed(2)}%
                </Text>
                <Text style={styles.tooltipSubText}>
                  Date: {formatDateLabel(activePoint.date)}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f8fafc",
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderLeftWidth: 4,
  },
  statNum: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },
  chartCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 16,
  },
  chartWrapper: {
    position: "relative",
    alignItems: "center",
  },
  tooltip: {
    position: "absolute",
    backgroundColor: "#1e293b",
    borderRadius: 8,
    padding: 8,
    width: 150,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    borderWidth: 1,
    borderColor: "#475569",
    zIndex: 999,
  },
  tooltipTitle: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
    marginBottom: 2,
  },
  tooltipText: {
    color: "#93c5fd",
    fontWeight: "600",
    fontSize: 11,
  },
  tooltipSubText: {
    color: "#94a3b8",
    fontSize: 10,
    marginTop: 2,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 15,
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 15,
    textAlign: "center",
  },
});
