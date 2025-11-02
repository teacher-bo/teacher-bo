import React, { useMemo } from "react";
import {
  TouchableOpacityProps,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius, FontSize } from "@/constants/Layout";
import { useColorScheme } from "@/hooks/useColorScheme";

export interface ButtonProps extends TouchableOpacityProps {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  iconLeft?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  iconLeft,
  iconRight,
  fullWidth = false,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const buttonStyle = useMemo((): ViewStyle => {
    // Size styles
    let paddingVertical: number, paddingHorizontal: number;
    switch (size) {
      case "sm":
        paddingVertical = Spacing.sm;
        paddingHorizontal = Spacing.md;
        break;
      case "lg":
        paddingVertical = Spacing.lg;
        paddingHorizontal = Spacing.xl;
        break;
      default: // md
        paddingVertical = Spacing.md;
        paddingHorizontal = Spacing.lg;
    }

    // Variant styles
    let backgroundColor: string, borderColor: string, borderWidth: number;
    switch (variant) {
      case "secondary":
        backgroundColor = colors.secondary;
        borderColor = Colors.common.transparent;
        borderWidth = 0;
        break;
      case "outline":
        backgroundColor = Colors.common.transparent;
        borderColor = colors.accent;
        borderWidth = 1;
        break;
      case "ghost":
        backgroundColor = Colors.common.transparent;
        borderColor = Colors.common.transparent;
        borderWidth = 0;
        break;
      case "danger":
        backgroundColor = colors.error;
        borderColor = Colors.common.transparent;
        borderWidth = 0;
        break;
      default: // primary
        backgroundColor = colors.primary;
        borderColor = Colors.common.transparent;
        borderWidth = 0;
    }

    const isDisabled = disabled || isLoading;
    if (isDisabled) {
      backgroundColor = colors.muted;
    }

    return {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: BorderRadius.md,
      paddingVertical,
      paddingHorizontal,
      backgroundColor,
      borderColor,
      borderWidth,
      width: fullWidth ? "100%" : "auto",
      opacity: isDisabled ? 0.6 : 1,
    };
  }, [variant, size, fullWidth, disabled, isLoading, colors]);

  const textStyle = useMemo((): TextStyle => {
    let fontSize: number;
    switch (size) {
      case "sm":
        fontSize = FontSize.sm;
        break;
      case "lg":
        fontSize = FontSize.lg;
        break;
      default: // md
        fontSize = FontSize.md;
    }

    let color: string;
    switch (variant) {
      case "secondary":
        color = colors.text;
        break;
      case "outline":
      case "ghost":
        color = colors.accent;
        break;
      case "danger":
      case "primary":
      default:
        color = Colors.common.white;
    }

    return {
      fontWeight: "600",
      textAlign: "center",
      fontSize,
      color,
    };
  }, [variant, size, colors]);

  const getIconColor = () => {
    switch (variant) {
      case "secondary":
        return colors.text;
      case "outline":
      case "ghost":
        return colors.accent;
      case "danger":
      case "primary":
      default:
        return Colors.common.white;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case "sm":
        return 16;
      case "lg":
        return 24;
      default: // md
        return 20;
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      style={[buttonStyle, style]}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={getIconColor()} />
      ) : (
        <>
          {iconLeft && (
            <View style={{ marginRight: Spacing.sm }}>
              <Ionicons
                name={iconLeft}
                size={getIconSize()}
                color={getIconColor()}
              />
            </View>
          )}
          <Text style={textStyle}>{children}</Text>
          {iconRight && (
            <View style={{ marginLeft: Spacing.sm }}>
              <Ionicons
                name={iconRight}
                size={getIconSize()}
                color={getIconColor()}
              />
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}
