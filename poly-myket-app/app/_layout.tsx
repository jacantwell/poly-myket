import React from "react";
import { Stack } from "expo-router";
import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-expo";
import { PaperProvider } from "react-native-paper";
import Toast from "react-native-toast-message";
import { tokenCache } from "../lib/clerk-token-cache";
import { theme } from "../lib/theme";
import { ApiSetup } from "../components/ApiSetup";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <PaperProvider theme={theme}>
          <ApiSetup />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="groups" />
            <Stack.Screen name="invite" />
          </Stack>
          <Toast />
        </PaperProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
