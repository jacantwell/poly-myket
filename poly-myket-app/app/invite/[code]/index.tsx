import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { Text, Button, ActivityIndicator } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { api, ApiClientError } from "poly-myket-shared";
import { ROUTES } from "../../../lib/routes";

type State =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "joining" }
  | { status: "success"; groupId: string; groupName: string }
  | { status: "error"; message: string };

export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setState({ status: "unauthenticated" });
      router.replace(ROUTES.signIn as never);
      return;
    }

    if (joinedRef.current) return;
    joinedRef.current = true;

    setState({ status: "joining" });
    api
      .joinGroup({ invite_code: code })
      .then((group) => {
        setState({
          status: "success",
          groupId: group.id,
          groupName: group.name,
        });
        setTimeout(() => {
          router.replace(ROUTES.group(group.id) as never);
        }, 1500);
      })
      .catch((e) => {
        if (e instanceof ApiClientError && e.status === 404) {
          setState({
            status: "error",
            message: "Invalid invite code. This link may have expired.",
          });
        } else {
          setState({
            status: "error",
            message: e instanceof Error ? e.message : "Failed to join group",
          });
        }
      });
  }, [isLoaded, isSignedIn, code, router]);

  return (
    <View style={styles.container}>
      {state.status === "loading" && <ActivityIndicator size="large" />}
      {state.status === "unauthenticated" && (
        <Text style={styles.muted}>Redirecting to sign in...</Text>
      )}
      {state.status === "joining" && (
        <>
          <ActivityIndicator size="large" />
          <Text style={styles.muted}>Joining group...</Text>
        </>
      )}
      {state.status === "success" && (
        <>
          <Text variant="headlineSmall" style={styles.bold}>
            You're in!
          </Text>
          <Text variant="bodyLarge">{state.groupName}</Text>
          <Text style={styles.muted}>Redirecting...</Text>
        </>
      )}
      {state.status === "error" && (
        <>
          <Text style={styles.errorText}>{state.message}</Text>
          <Button
            mode="contained"
            onPress={() => router.replace(ROUTES.groups as never)}
          >
            Go to Groups
          </Button>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  bold: {
    fontWeight: "700",
  },
  muted: {
    color: "#71717a",
  },
  errorText: {
    color: "#d93b3b",
    textAlign: "center",
  },
});
