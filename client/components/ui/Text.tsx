import React from "react";
import { Text as RNText, TextProps, StyleSheet } from "react-native";

type CustomTextProps = TextProps & {
  weight?: "regular" | "medium" | "semibold" | "bold" | 400 | 500 | 600 | 700;
};

export function Text({ style, weight, ...props }: CustomTextProps) {
  return <RNText style={[styles.defaultText, style]} {...props} />;
}

const styles = StyleSheet.create({
  defaultText: {
    fontFamily: "Pretendard",
  },
});
