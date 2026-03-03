import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, TextInput, Button, Card } from "react-native-paper";
import { useRouter } from "expo-router";
import { api } from "poly-myket-shared";
import type { Group } from "poly-myket-shared";
import * as Clipboard from "expo-clipboard";
import Toast from "react-native-toast-message";
import { ROUTES } from "../../lib/routes";

type Phase = "form" | "submitting" | "success";

export default function NewGroupScreen() {
  const [name, setName] = useState("");
  const [startingCredits, setStartingCredits] = useState("1000");
  const [phase, setPhase] = useState<Phase>("form");
  const [group, setGroup] = useState<Group | null>(null);
  const router = useRouter();

  async function handleSubmit() {
    if (!name.trim()) return;
    setPhase("submitting");
    try {
      const created = await api.createGroup({
        name: name.trim(),
        starting_credits: parseFloat(startingCredits) || 1000,
      });
      setGroup(created);
      setPhase("success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create group";
      Toast.show({ type: "error", text1: "Error", text2: msg });
      setPhase("form");
    }
  }

  async function copyInviteCode() {
    if (!group) return;
    await Clipboard.setStringAsync(group.invite_code);
    Toast.show({ type: "success", text1: "Invite code copied!" });
  }

  async function copyInviteLink() {
    if (!group) return;
    await Clipboard.setStringAsync(
      `https://polymyket.vercel.app/invite/${group.invite_code}`,
    );
    Toast.show({ type: "success", text1: "Invite link copied!" });
  }

  if (phase === "success" && group) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Card mode="outlined" style={styles.successCard}>
          <Card.Content style={styles.successContent}>
            <Text variant="headlineSmall" style={styles.bold}>
              Group Created!
            </Text>
            <Text variant="bodyMedium" style={styles.muted}>
              Share this invite code with friends:
            </Text>
            <Text variant="headlineMedium" style={styles.code}>
              {group.invite_code}
            </Text>
            <View style={styles.copyButtons}>
              <Button mode="outlined" onPress={copyInviteCode} icon="content-copy">
                Copy Code
              </Button>
              <Button mode="outlined" onPress={copyInviteLink} icon="link">
                Copy Link
              </Button>
            </View>
          </Card.Content>
        </Card>
        <Button
          mode="contained"
          onPress={() => router.replace(ROUTES.group(group.id) as never)}
        >
          Go to Group
        </Button>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInput
        mode="outlined"
        label="Group Name"
        value={name}
        onChangeText={setName}
        autoFocus
      />
      <TextInput
        mode="outlined"
        label="Starting Credits"
        value={startingCredits}
        onChangeText={setStartingCredits}
        keyboardType="number-pad"
      />
      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={phase === "submitting"}
        disabled={!name.trim() || phase === "submitting"}
      >
        Create Group
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  successCard: {
    /* no extra styling needed */
  },
  successContent: {
    alignItems: "center",
    gap: 12,
  },
  bold: {
    fontWeight: "700",
  },
  muted: {
    color: "#71717a",
  },
  code: {
    fontWeight: "700",
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
  copyButtons: {
    flexDirection: "row",
    gap: 8,
  },
});
