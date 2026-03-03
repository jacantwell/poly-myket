import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { api, formatCredits } from "poly-myket-shared";
import type { WagerSide } from "poly-myket-shared";
import Toast from "react-native-toast-message";
import { betColors } from "../lib/theme";

interface WagerFormProps {
  betId: string;
  isOpen: boolean;
  creditBalance: number;
  yesPrice: number;
  noPrice: number;
  onWagerPlaced: () => void;
  lockedSide?: WagerSide;
}

export function WagerForm({
  betId,
  isOpen,
  creditBalance,
  yesPrice,
  noPrice,
  onWagerPlaced,
  lockedSide,
}: WagerFormProps) {
  const [selectedSide, setSelectedSide] = useState<WagerSide | null>(
    lockedSide ?? null,
  );
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  function toggleSide(side: WagerSide) {
    if (lockedSide) return;
    if (selectedSide === side) {
      setSelectedSide(null);
      setAmount("");
    } else {
      setSelectedSide(side);
    }
  }

  async function handleSubmit() {
    if (!selectedSide || !amount) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setSubmitting(true);
    try {
      await api.placeWager(betId, { side: selectedSide, amount: numAmount });
      Toast.show({ type: "success", text1: "Wager placed!" });
      setSelectedSide(lockedSide ?? null);
      setAmount("");
      onWagerPlaced();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to place wager";
      Toast.show({ type: "error", text1: "Error", text2: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.sideButtons}>
        <Button
          mode={selectedSide === "yes" ? "contained" : "outlined"}
          onPress={() => toggleSide("yes")}
          disabled={!!lockedSide && lockedSide !== "yes"}
          buttonColor={selectedSide === "yes" ? betColors.yes : undefined}
          textColor={selectedSide === "yes" ? "#fff" : betColors.yes}
          style={styles.sideButton}
        >
          Yes {yesPrice.toFixed(2)}
        </Button>
        <Button
          mode={selectedSide === "no" ? "contained" : "outlined"}
          onPress={() => toggleSide("no")}
          disabled={!!lockedSide && lockedSide !== "no"}
          buttonColor={selectedSide === "no" ? betColors.no : undefined}
          textColor={selectedSide === "no" ? "#fff" : betColors.no}
          style={styles.sideButton}
        >
          No {noPrice.toFixed(2)}
        </Button>
      </View>

      {selectedSide && (
        <View style={styles.amountSection}>
          <TextInput
            mode="outlined"
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            right={<TextInput.Affix text="credits" />}
          />
          <Text variant="bodySmall" style={styles.muted}>
            Available: {formatCredits(creditBalance)}
          </Text>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting || !amount || parseFloat(amount) <= 0}
            buttonColor={
              selectedSide === "yes" ? betColors.yes : betColors.no
            }
          >
            Place {selectedSide.toUpperCase()} Wager
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  sideButtons: {
    flexDirection: "row",
    gap: 12,
  },
  sideButton: {
    flex: 1,
  },
  amountSection: {
    gap: 12,
  },
  muted: {
    color: "#71717a",
  },
});
