import React from "react";
import { View, StyleSheet } from "react-native";
import { betColors } from "../lib/theme";

interface ProbabilityBarProps {
  yesProbability: number;
}

export function ProbabilityBar({ yesProbability }: ProbabilityBarProps) {
  return (
    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          {
            width: `${yesProbability}%`,
            backgroundColor: betColors.yes,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f4f4f5",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
});
