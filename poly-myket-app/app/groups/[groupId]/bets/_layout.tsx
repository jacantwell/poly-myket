import React from "react";
import { Stack, useRouter } from "expo-router";
import { HeaderBackButton } from "@react-navigation/elements";

export default function BetsLayout() {
  const router = useRouter();

  return (
    <Stack>
      <Stack.Screen
        name="new"
        options={{
          title: "Create Bet",
          headerLeft: (props) => (
            <HeaderBackButton {...props} onPress={() => router.back()} />
          ),
        }}
      />
      <Stack.Screen
        name="[betId]"
        options={{
          title: "Bet Detail",
          headerLeft: (props) => (
            <HeaderBackButton {...props} onPress={() => router.back()} />
          ),
        }}
      />
    </Stack>
  );
}
