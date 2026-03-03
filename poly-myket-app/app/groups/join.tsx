import React, { useState } from "react";
import { StyleSheet, ScrollView } from "react-native";
import { TextInput, Button } from "react-native-paper";
import { useRouter } from "expo-router";
import { api } from "poly-myket-shared";
import Toast from "react-native-toast-message";
import { ROUTES } from "../../lib/routes";

export default function JoinGroupScreen() {
  const [inviteCode, setInviteCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit() {
    if (!inviteCode.trim()) return;
    setSubmitting(true);
    try {
      const group = await api.joinGroup({
        invite_code: inviteCode.trim(),
      });
      Toast.show({ type: "success", text1: `Joined ${group.name}!` });
      router.replace(ROUTES.group(group.id) as never);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid invite code";
      Toast.show({ type: "error", text1: "Error", text2: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInput
        mode="outlined"
        label="Invite Code"
        value={inviteCode}
        onChangeText={setInviteCode}
        autoFocus
        autoCapitalize="characters"
      />
      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={submitting}
        disabled={!inviteCode.trim() || submitting}
      >
        Join Group
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
});
