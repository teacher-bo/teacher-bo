import { Stack } from "expo-router";
import Head from "expo-router/head";
import Constants from "expo-constants";

import "../global.css";
import { AppProvider } from "@/providers/AppProvider";

export default function RootLayout() {
  const title = Constants.expoConfig?.web?.name;
  return (
    <AppProvider>
      <Head>
        <title>{title}</title>
      </Head>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AppProvider>
  );
}
