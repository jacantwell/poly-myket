import React, { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { Text, Button } from "react-native-paper";
import { useOAuth } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { ROUTES } from "../../lib/routes";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const router = useRouter();

  const handleSignIn = useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace(ROUTES.groups as never);
      }
    } catch (err) {
      console.error("OAuth error:", err);
    }
  }, [startOAuthFlow, router]);

  return (
    <View style={styles.container}>
      <Text variant="displaySmall" style={styles.title}>
        Poly-Myket
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        Bet on your friends' commitments
      </Text>
      <Button
        mode="contained"
        onPress={handleSignIn}
        icon="google"
        style={styles.button}
      >
        Sign in with Google
      </Button>
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
  title: {
    fontWeight: "700",
  },
  subtitle: {
    color: "#71717a",
    marginBottom: 24,
  },
  button: {
    minWidth: 240,
  },
});
