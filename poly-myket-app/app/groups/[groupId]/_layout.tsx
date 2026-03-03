import React from "react";
import { Stack, useRouter } from "expo-router";
import { HeaderBackButton } from "@react-navigation/elements";

export default function GroupDetailLayout() {
  const router = useRouter();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Group",
          headerLeft: (props) => (
            <HeaderBackButton {...props} onPress={() => router.back()} />
          ),
        }}
      />
      <Stack.Screen name="bets" options={{ headerShown: false }} />
    </Stack>
  );
}
