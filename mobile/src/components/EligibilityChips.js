import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function EligibilityChips({ eligibility, isArchived }) {
  const containerStyle = [styles.container];
  
  if (!eligibility || (!eligibility.department && !eligibility.semester && !eligibility.section)) {
    return (
      <View style={containerStyle}>
        <View style={[styles.chip, styles.fallbackChip]}>
          <Text style={[styles.chipText, styles.fallbackChipText]}>No Eligibility Rules</Text>
        </View>
        {isArchived ? (
          <View style={[styles.chip, styles.archiveChip]}>
            <Text style={[styles.chipText, styles.archiveChipText]}>Archived</Text>
          </View>
        ) : null}
      </View>
    );
  }

  const chips = [];
  if (eligibility.department) chips.push({ label: eligibility.department });
  if (eligibility.semester) chips.push({ label: `Sem ${eligibility.semester}` });
  if (eligibility.section) chips.push({ label: `Sec ${eligibility.section}` });

  return (
    <View style={containerStyle}>
      {chips.map((chip, idx) => (
        <View key={idx} style={styles.chip}>
          <Text style={styles.chipText}>{chip.label}</Text>
        </View>
      ))}
      {isArchived ? (
        <View style={[styles.chip, styles.archiveChip]}>
          <Text style={[styles.chipText, styles.archiveChipText]}>Archived</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    gap: 6,
  },
  chip: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    color: "#1e40af",
    fontSize: 12,
    fontWeight: "600",
  },
  fallbackChip: {
    backgroundColor: "#f1f5f9",
    borderColor: "#cbd5e1",
  },
  fallbackChipText: {
    color: "#475569",
  },
  archiveChip: {
    backgroundColor: "#fef2f2",
    borderColor: "#fca5a5",
  },
  archiveChipText: {
    color: "#b91c1c",
  },
});
