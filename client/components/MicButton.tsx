import React from "react";
import { TouchableOpacity, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type ConversationState =
  | "IDLE"
  | "GREETING"
  | "LISTENING"
  | "PROCESSING"
  | "SPEAKING";

interface MicButtonProps {
  conversationState: ConversationState;
  onPress: () => void;
}

export default function MicButton({
  conversationState,
  onPress,
}: MicButtonProps) {
  // Determine if mic is active (listening)
  const isActive = conversationState === "LISTENING";

  // Determine if button should be disabled
  const isDisabled = conversationState === "PROCESSING";

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={
          isActive
            ? ["#FF3B30", "#FF6B6B"] // Red gradient when active (listening)
            : isDisabled
            ? ["#555", "#444"] // Gray when processing
            : ["#007AFF", "#0051D5"] // Blue gradient when inactive
        }
        style={styles.gradient}
      >
        {/* Mic icon */}
        <Ionicons name={isActive ? "stop" : "mic"} size={32} color="#fff" />
      </LinearGradient>

      {/* Pulsing effect when listening */}
      {isActive && <View style={styles.pulseOuter} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 72,
    height: 72,
    justifyContent: "center",
    alignItems: "center",
  },
  gradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
  activeRing: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  activeRingInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  pulseOuter: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255, 59, 48, 0.3)",
    opacity: 0.5,
  },
});
