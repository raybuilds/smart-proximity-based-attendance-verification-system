import React from "react";
import { StyleSheet, View } from "react-native";
import { COLORS } from "../utils/theme";

export default function SkeletonCard({ height = 80, marginVertical = 8, borderRadius = 8 }) {
  return (
    <View
      style={[
        styles.skeleton,
        {
          height,
          marginVertical,
          borderRadius,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "#EDE8DA", // Warm parchment gray/cream to match the theme
    opacity: 0.65,
    width: "100%",
  },
});
