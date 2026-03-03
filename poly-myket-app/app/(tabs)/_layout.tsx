import React from "react";
import { Tabs, Redirect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

export default function TabsLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#18181b",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Markets",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="chart-line"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
