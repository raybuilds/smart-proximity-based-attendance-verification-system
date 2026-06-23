import React, { useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function InteractiveCard({ children, onPress, style, disabled }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.97,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={({ pressed }) => [
        style,
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}
