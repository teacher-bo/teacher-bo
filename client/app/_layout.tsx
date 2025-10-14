import { Stack } from "expo-router";

import "../global.css";
import { AppProvider } from "@/providers/AppProvider";

export default function RootLayout() {
  return (
    <AppProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AppProvider>
  );
}
