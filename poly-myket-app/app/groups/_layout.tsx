import React from "react";
import { Stack, useRouter } from "expo-router";
import { HeaderBackButton } from "@react-navigation/elements";

export default function GroupsLayout() {
  const router = useRouter();

  return (
    <Stack>
      <Stack.Screen
        name="new"
        options={{
          title: "New Group",
          headerLeft: (props) => (
            <HeaderBackButton {...props} onPress={() => router.back()} />
          ),
        }}
      />
      <Stack.Screen
        name="join"
        options={{
          title: "Join Group",
          headerLeft: (props) => (
            <HeaderBackButton {...props} onPress={() => router.back()} />
          ),
        }}
      />
      <Stack.Screen
        name="[groupId]"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
