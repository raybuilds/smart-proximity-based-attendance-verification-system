import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";

export default function AnimatedNumber({ value, duration = 600, style }) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = React.useState(0);

  useEffect(() => {
    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: value,
      duration,
      useNativeDriver: false, // Must be false to listen to value updates
    }).start();

    const listener = animatedValue.addListener(({ value: current }) => {
      setDisplayValue(Math.round(current));
    });

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [value, duration, animatedValue]);

  return <Text style={style}>{displayValue}</Text>;
}
