import React, { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, ScrollView, Platform } from "react-native";
import { Text, TextInput, Button, ActivityIndicator } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { api, formatCredits } from "poly-myket-shared";
import type { GroupDetailResponse, User } from "poly-myket-shared";
import Toast from "react-native-toast-message";
import { ROUTES } from "../../../../lib/routes";

type PageState =
  | { status: "loading" }
  | { status: "loaded"; group: GroupDetailResponse; currentUser: User }
  | { status: "error"; message: string };

export default function CreateBetScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      const [group, currentUser] = await Promise.all([
        api.getGroup(groupId),
        api.getMe(),
      ]);
      setState({ status: "loaded", group, currentUser });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load data";
      setState({ status: "error", message: msg });
    }
  }, [groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSubmit() {
    if (state.status !== "loaded" || !description.trim() || !amount) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setSubmitting(true);
    try {
      await api.createBet(groupId, {
        subject_id: state.currentUser.id,
        description: description.trim(),
        deadline: deadline?.toISOString(),
        initial_wager_amount: numAmount,
      });
      Toast.show({ type: "success", text1: "Bet created!" });
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create bet";
      Toast.show({ type: "error", text1: "Error", text2: msg });
    } finally {
      setSubmitting(false);
    }
  }

  if (state.status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (state.status === "error") {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{state.message}</Text>
        <Button mode="contained" onPress={fetchData}>
          Retry
        </Button>
      </View>
    );
  }

  const currentMember = state.group.members.find(
    (m) => m.user_id === state.currentUser.id,
  );
  const creditBalance = currentMember?.credit_balance ?? 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="bodyMedium" style={styles.muted}>
        Make a commitment in {state.group.name}
      </Text>

      <TextInput
        mode="outlined"
        label="I will..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      <TextInput
        mode="outlined"
        label="Your Stake (YES)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        right={<TextInput.Affix text="credits" />}
      />
      <Text variant="bodySmall" style={styles.muted}>
        Available: {formatCredits(creditBalance)}
      </Text>

      <Button
        mode="outlined"
        onPress={() => setShowDatePicker(true)}
        icon="calendar"
      >
        {deadline
          ? `Deadline: ${deadline.toLocaleDateString()}`
          : "Set Deadline (optional)"}
      </Button>

      {showDatePicker && (
        <DateTimePicker
          value={deadline ?? new Date()}
          mode="date"
          minimumDate={new Date()}
          onChange={(_, date) => {
            setShowDatePicker(Platform.OS === "ios");
            if (date) setDeadline(date);
          }}
        />
      )}

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={submitting}
        disabled={
          !description.trim() ||
          !amount ||
          parseFloat(amount) <= 0 ||
          submitting
        }
      >
        Create Bet
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  container: {
    padding: 16,
    gap: 16,
  },
  muted: {
    color: "#71717a",
  },
  errorText: {
    color: "#d93b3b",
    textAlign: "center",
  },
});
