import { Stack } from "expo-router";
import Head from "expo-router/head";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { useEffect } from "react";

import "../global.css";
import { AppProvider } from "@/providers/AppProvider";

export default function RootLayout() {
  const title = Constants.expoConfig?.web?.name;

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      return;
    }

    if (Platform.OS === "web") {
      import("logrocket").then((LogRocket) => {
        LogRocket.default.init("zxsoci/teacherbo");
      });
    } else {
      import("@logrocket/react-native").then((LogRocket) => {
        LogRocket.default.init("zxsoci/teacherbo");
      });
    }
  }, []);

  return (
    <AppProvider>
      <Head>
        <title>{title}</title>
      </Head>
      <Stack
        screenOptions={{
          contentStyle: {
            backgroundColor: "#242b38",
          },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            contentStyle: {
              backgroundColor: "#242b38",
            },
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AppProvider>
  );
}
