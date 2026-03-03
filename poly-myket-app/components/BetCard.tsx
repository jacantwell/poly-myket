import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Card, Text, Chip } from "react-native-paper";
import { useRouter } from "expo-router";
import type { Bet } from "poly-myket-shared";
import {
  calculateOdds,
  formatCredits,
  BET_STATUS_LABELS,
  BET_STATUS_COLOR,
} from "poly-myket-shared";
import { ProbabilityBar } from "./ProbabilityBar";
import { UserAvatar } from "./UserAvatar";
import { betColors, statusColorMap } from "../lib/theme";
import { ROUTES } from "../lib/routes";

interface BetCardProps {
  bet: Bet;
}

export function BetCard({ bet }: BetCardProps) {
  const router = useRouter();
  const odds = calculateOdds(bet.wagers);
  const majorityYes = odds.yesProbability >= 50;
  const isOpen = bet.status === "open";

  return (
    <Pressable
      onPress={() =>
        router.push(ROUTES.bet(bet.group_id, bet.id) as never)
      }
    >
      <Card style={styles.card} mode="outlined">
        <Card.Content style={styles.content}>
          <View style={styles.header}>
            <UserAvatar user={bet.subject} size={32} />
            <View style={styles.headerText}>
              <Text
                variant="titleSmall"
                numberOfLines={2}
                style={styles.description}
              >
                {bet.description}
              </Text>
              {!isOpen && (
                <Chip
                  compact
                  textStyle={styles.chipText}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        statusColorMap[BET_STATUS_COLOR[bet.status]] + "20",
                    },
                  ]}
                >
                  {BET_STATUS_LABELS[bet.status]}
                </Chip>
              )}
            </View>
          </View>

          <Text
            variant="headlineMedium"
            style={[
              styles.probability,
              { color: majorityYes ? betColors.yes : betColors.no },
            ]}
          >
            {odds.yesProbability}%
          </Text>

          <ProbabilityBar yesProbability={odds.yesProbability} />

          <View style={styles.footer}>
            <Text variant="bodySmall" style={styles.muted}>
              {formatCredits(odds.totalVolume)} vol
            </Text>
            <View style={styles.prices}>
              <Text
                variant="bodySmall"
                style={[styles.price, { color: betColors.yes }]}
              >
                Yes {odds.yesPrice.toFixed(2)}
              </Text>
              <Text
                variant="bodySmall"
                style={[styles.price, { color: betColors.no }]}
              >
                No {odds.noPrice.toFixed(2)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  content: {
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  description: {
    fontWeight: "600",
  },
  chip: {
    alignSelf: "flex-start",
    height: 24,
  },
  chipText: {
    fontSize: 11,
  },
  probability: {
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  muted: {
    color: "#71717a",
  },
  prices: {
    flexDirection: "row",
    gap: 12,
  },
  price: {
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});
