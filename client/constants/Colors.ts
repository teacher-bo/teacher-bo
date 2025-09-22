/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
    border: "#E5E7EB",
    card: "#F9FAFB",
    error: "#EF4444",
    warning: "#F59E0B",
    success: "#10B981",
    info: "#3B82F6",
    primary: "#0a7ea4",
    secondary: "#6B7280",
    accent: "#8B5CF6",
    muted: "#F3F4F6",
    // Board game specific colors
    gameCard: "#FFFFFF",
    gameCardShadow: "#00000010",
    rating: "#FFC107",
    complexity: "#FF6B6B",
    playTime: "#4ECDC4",
    playerCount: "#45B7D1",
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
    border: "#374151",
    card: "#1F2937",
    error: "#F87171",
    warning: "#FBBF24",
    success: "#34D399",
    info: "#60A5FA",
    primary: "#60A5FA",
    secondary: "#9CA3AF",
    accent: "#A78BFA",
    muted: "#374151",
    // Board game specific colors
    gameCard: "#1F2937",
    gameCardShadow: "#00000030",
    rating: "#FFC107",
    complexity: "#FF8A80",
    playTime: "#4ECDC4",
    playerCount: "#64B5F6",
  },
  common: {
    // Colors that don't change between themes
    white: "#FFFFFF",
    black: "#000000",
    transparent: "transparent",
    // Social colors
    facebook: "#1877F2",
    twitter: "#1DA1F2",
    instagram: "#E4405F",
    youtube: "#FF0000",
    // Status colors
    online: "#10B981",
    offline: "#6B7280",
    away: "#F59E0B",
    busy: "#EF4444",
    // Game availability
    available: "#10B981",
    outOfStock: "#EF4444",
    preOrder: "#F59E0B",
    // Difficulty levels
    beginner: "#10B981",
    intermediate: "#F59E0B",
    advanced: "#EF4444",
    expert: "#8B5CF6",
  },
  // Gradients
  gradients: {
    primary: ["#0a7ea4", "#60A5FA"],
    secondary: ["#6B7280", "#9CA3AF"],
    success: ["#10B981", "#34D399"],
    error: ["#EF4444", "#F87171"],
    warning: ["#F59E0B", "#FBBF24"],
    gaming: ["#8B5CF6", "#A78BFA"],
    sunset: ["#FF6B6B", "#FFD93D"],
    ocean: ["#4ECDC4", "#44A08D"],
  },
};

// Helper functions for colors
export const getColorByTheme = (
  theme: "light" | "dark",
  colorName: keyof typeof Colors.light
) => {
  return Colors[theme][colorName];
};

export const getCommonColor = (colorName: keyof typeof Colors.common) => {
  return Colors.common[colorName];
};

export const getGradient = (gradientName: keyof typeof Colors.gradients) => {
  return Colors.gradients[gradientName];
};

// Game-specific color mappings
export const gameColors = {
  complexity: {
    1: Colors.common.beginner,
    2: Colors.common.beginner,
    3: Colors.common.intermediate,
    4: Colors.common.advanced,
    5: Colors.common.expert,
  },
  availability: {
    available: Colors.common.available,
    "out-of-stock": Colors.common.outOfStock,
    "pre-order": Colors.common.preOrder,
  },
  playerCount: (count: number) => {
    if (count <= 2) return "#FF6B6B";
    if (count <= 4) return "#4ECDC4";
    if (count <= 6) return "#45B7D1";
    return "#8B5CF6";
  },
  playTime: (minutes: number) => {
    if (minutes <= 30) return "#10B981"; // Green for quick games
    if (minutes <= 90) return "#F59E0B"; // Yellow for medium games
    if (minutes <= 180) return "#EF4444"; // Red for long games
    return "#8B5CF6"; // Purple for epic games
  },
};
