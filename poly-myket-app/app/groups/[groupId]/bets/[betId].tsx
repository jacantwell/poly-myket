import React, { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import {
  Text,
  Card,
  Button,
  Chip,
  ActivityIndicator,
  Divider,
} from "react-native-paper";
import { useLocalSearchParams, Stack } from "expo-router";
import {
  api,
  calculateOdds,
  formatCredits,
  BET_STATUS_LABELS,
  BET_STATUS_COLOR,
} from "poly-myket-shared";
import type {
  Bet,
  GroupDetailResponse,
  User,
  WagerSide,
} from "poly-myket-shared";
import { ProbabilityBar } from "../../../../components/ProbabilityBar";
import { WagerForm } from "../../../../components/WagerForm";
import { UserAvatar } from "../../../../components/UserAvatar";
import { betColors, statusColorMap } from "../../../../lib/theme";
import Toast from "react-native-toast-message";

type PageState =
  | { status: "loading" }
  | {
      status: "loaded";
      bet: Bet;
      group: GroupDetailResponse;
      currentUser: User;
    }
  | { status: "error"; message: string };

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export default function BetDetailScreen() {
  const { groupId, betId } = useLocalSearchParams<{
    groupId: string;
    betId: string;
  }>();
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [bet, group, currentUser] = await Promise.all([
        api.getBet(betId),
        api.getGroup(groupId),
        api.getMe(),
      ]);
      setState({ status: "loaded", bet, group, currentUser });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load bet";
      setState({ status: "error", message: msg });
    }
  }, [betId, groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  async function handleResolve(outcome: "success" | "fail") {
    try {
      await api.resolveBet(betId, { outcome });
      Toast.show({ type: "success", text1: "Bet resolved!" });
      fetchData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to resolve bet";
      Toast.show({ type: "error", text1: "Error", text2: msg });
    }
  }

  async function handleCancel() {
    try {
      await api.cancelBet(betId);
      Toast.show({ type: "success", text1: "Bet cancelled" });
      fetchData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to cancel bet";
      Toast.show({ type: "error", text1: "Error", text2: msg });
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

  const { bet, group, currentUser } = state;
  const odds = calculateOdds(bet.wagers);
  const isOpen = bet.status === "open";
  const majorityYes = odds.yesProbability >= 50;

  const currentMember = group.members.find(
    (m) => m.user_id === currentUser.id,
  );
  const canManage =
    currentUser.id === bet.created_by || currentMember?.role === "admin";

  // Creator bet window logic
  const isCreator = currentUser.id === bet.created_by;
  const isSelfBet = bet.subject_id === bet.created_by;
  const betAgeMs = Date.now() - new Date(bet.created_at).getTime();
  const creatorWindowOpen = isCreator && isSelfBet && betAgeMs < TWO_HOURS_MS;

  let lockedSide: WagerSide | undefined;
  let wagerDisabled = false;
  let wagerMessage = "";

  if (isCreator && isSelfBet) {
    if (creatorWindowOpen) {
      lockedSide = "yes";
      wagerMessage = "As the creator, you can only bet YES during the first 2 hours";
    } else {
      wagerDisabled = true;
      wagerMessage = "Betting window closed for the creator";
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: bet.description }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Bet Info */}
        <Card mode="outlined">
          <Card.Content style={styles.betInfo}>
            <View style={styles.betHeader}>
              <UserAvatar user={bet.subject} size={48} />
              <View style={styles.betHeaderText}>
                <Text variant="titleMedium" style={styles.bold}>
                  {bet.description}
                </Text>
                <Text variant="bodySmall" style={styles.muted}>
                  {bet.subject_id === bet.created_by
                    ? `${bet.subject?.display_name ?? "Unknown"}'s self-bet`
                    : `About ${bet.subject?.display_name ?? "Unknown"} · Created by ${bet.creator?.display_name ?? "Unknown"}`}
                </Text>
              </View>
            </View>
            {!isOpen && (
              <Chip
                style={[
                  styles.statusChip,
                  {
                    backgroundColor:
                      statusColorMap[BET_STATUS_COLOR[bet.status]] + "20",
                  },
                ]}
              >
                {BET_STATUS_LABELS[bet.status]}
              </Chip>
            )}
            {bet.deadline && (
              <Text variant="bodySmall" style={styles.muted}>
                Deadline: {new Date(bet.deadline).toLocaleDateString()}
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Probability & Wager */}
        <Card mode="outlined">
          <Card.Content style={styles.probabilitySection}>
            <Text
              variant="displaySmall"
              style={[
                styles.bigProbability,
                { color: majorityYes ? betColors.yes : betColors.no },
              ]}
            >
              {odds.yesProbability}%
            </Text>
            <ProbabilityBar yesProbability={odds.yesProbability} />
            <View style={styles.statsRow}>
              <Text variant="bodySmall" style={styles.muted}>
                {formatCredits(odds.totalVolume)} vol
              </Text>
              <View style={styles.prices}>
                <Text style={[styles.priceText, { color: betColors.yes }]}>
                  Yes {odds.yesPrice.toFixed(2)}
                </Text>
                <Text style={[styles.priceText, { color: betColors.no }]}>
                  No {odds.noPrice.toFixed(2)}
                </Text>
              </View>
            </View>

            {isOpen && !wagerDisabled && (
              <>
                <Divider style={styles.divider} />
                {wagerMessage ? (
                  <Text variant="bodySmall" style={styles.muted}>
                    {wagerMessage}
                  </Text>
                ) : null}
                <WagerForm
                  betId={betId}
                  isOpen={isOpen}
                  creditBalance={currentMember?.credit_balance ?? 0}
                  yesPrice={odds.yesPrice}
                  noPrice={odds.noPrice}
                  onWagerPlaced={fetchData}
                  lockedSide={lockedSide}
                />
              </>
            )}

            {wagerDisabled && isOpen && (
              <>
                <Divider style={styles.divider} />
                <Text variant="bodySmall" style={styles.muted}>
                  {wagerMessage}
                </Text>
              </>
            )}
          </Card.Content>
        </Card>

        {/* Wagers */}
        <Card mode="outlined">
          <Card.Title title="Wagers" />
          <Card.Content>
            {(!bet.wagers || bet.wagers.length === 0) ? (
              <Text style={styles.muted}>No wagers yet</Text>
            ) : (
              bet.wagers.map((w) => (
                <View key={w.id} style={styles.wagerRow}>
                  <UserAvatar user={w.user} size={32} />
                  <Text variant="bodyMedium" style={styles.flex1}>
                    {w.user?.display_name ?? "Unknown"}
                  </Text>
                  <Chip
                    compact
                    textStyle={styles.chipText}
                    style={{
                      backgroundColor:
                        w.side === "yes"
                          ? betColors.yesLight
                          : betColors.noLight,
                    }}
                  >
                    {w.side.toUpperCase()}
                  </Chip>
                  <Text variant="bodyMedium" style={styles.wagerAmount}>
                    {formatCredits(w.amount)}
                  </Text>
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        {/* Manage Bet */}
        {canManage && isOpen && (
          <Card mode="outlined">
            <Card.Title title="Manage Bet" />
            <Card.Content style={styles.manageButtons}>
              <Button
                mode="contained"
                buttonColor={betColors.yes}
                onPress={() => handleResolve("success")}
              >
                Resolve: Success
              </Button>
              <Button
                mode="contained"
                buttonColor={betColors.no}
                onPress={() => handleResolve("fail")}
              >
                Resolve: Failed
              </Button>
              <Button mode="outlined" onPress={handleCancel}>
                Cancel Bet
              </Button>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </>
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
  scroll: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 48,
    gap: 16,
  },
  betInfo: {
    gap: 10,
  },
  betHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  betHeaderText: {
    flex: 1,
    gap: 4,
  },
  bold: {
    fontWeight: "600",
  },
  statusChip: {
    alignSelf: "flex-start",
  },
  probabilitySection: {
    gap: 12,
  },
  bigProbability: {
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  prices: {
    flexDirection: "row",
    gap: 12,
  },
  priceText: {
    fontWeight: "600",
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
  divider: {
    marginVertical: 4,
  },
  wagerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  flex1: {
    flex: 1,
  },
  chipText: {
    fontSize: 11,
  },
  wagerAmount: {
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  manageButtons: {
    gap: 10,
  },
  muted: {
    color: "#71717a",
  },
  errorText: {
    color: "#d93b3b",
    textAlign: "center",
  },
});
