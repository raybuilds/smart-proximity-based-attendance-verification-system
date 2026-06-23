import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, TYPOGRAPHY } from "../utils/theme";

export default function EmptyState({ Icon, title, description }) {
  return (
    <View style={styles.container}>
      {Icon && (
        <View style={styles.iconWrapper}>
          <Icon size={48} color={COLORS.textSecondary} strokeWidth={1.5} />
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    width: "100%",
  },
  iconWrapper: {
    marginBottom: 12,
    opacity: 0.8,
  },
  title: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.heading.fontFamily,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
});
