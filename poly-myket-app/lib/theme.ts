import { MD3LightTheme, configureFonts } from "react-native-paper";
import type { MD3Theme } from "react-native-paper";
import type { BetStatusColor } from "poly-myket-shared";

// Converted from oklch design tokens in globals.css
const colors = {
  yes: "#2d9a3f",
  yesLight: "#d4f5db",
  no: "#d93b3b",
  noLight: "#fde0e0",
};

export const theme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#18181b",
    primaryContainer: "#f4f4f5",
    secondary: colors.yes,
    secondaryContainer: colors.yesLight,
    tertiary: colors.no,
    tertiaryContainer: colors.noLight,
    error: colors.no,
    errorContainer: colors.noLight,
    surface: "#ffffff",
    surfaceVariant: "#f4f4f5",
    background: "#ffffff",
    outline: "#e4e4e7",
  },
  fonts: configureFonts({ config: { fontFamily: "System" } }),
};

export const betColors = colors;

export const statusColorMap: Record<BetStatusColor, string> = {
  green: colors.yes,
  gray: "#71717a",
  red: colors.no,
  muted: "#a1a1aa",
};
