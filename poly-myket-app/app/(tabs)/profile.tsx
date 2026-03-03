import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from "react-native";
import {
  Text,
  Card,
  Button,
  Switch,
  ActivityIndicator,
  Chip,
  Divider,
} from "react-native-paper";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { api, formatCredits } from "poly-myket-shared";
import type {
  UserProfile,
  BetStatus,
  WagerSide,
} from "poly-myket-shared";
import { UserAvatar } from "../../components/UserAvatar";
import { betColors } from "../../lib/theme";
import { ROUTES } from "../../lib/routes";
import Toast from "react-native-toast-message";

type PageState =
  | { status: "loading" }
  | { status: "loaded"; profile: UserProfile }
  | { status: "error"; message: string };

function getWagerResult(
  betStatus: BetStatus,
  side: WagerSide,
): "Won" | "Lost" | "Open" | "Refunded" {
  if (betStatus === "open") return "Open";
  if (betStatus === "cancelled") return "Refunded";
  if (betStatus === "resolved_success") return side === "yes" ? "Won" : "Lost";
  return side === "no" ? "Won" : "Lost";
}

export default function ProfileScreen() {
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const { signOut } = useAuth();
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      const profile = await api.getMyProfile();
      setState({ status: "loaded", profile });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load profile";
      setState({ status: "error", message: msg });
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  async function toggleEmailPref(
    key: "email_bet_created" | "email_wager_placed" | "email_bet_resolved",
    value: boolean,
  ) {
    if (state.status !== "loaded") return;
    const prev = state.profile;
    // Optimistic update
    setState({
      status: "loaded",
      profile: {
        ...prev,
        user: { ...prev.user, [key]: value },
      },
    });
    try {
      await api.updateEmailPreferences({ [key]: value });
    } catch {
      // Revert
      setState({ status: "loaded", profile: prev });
      Toast.show({ type: "error", text1: "Failed to update preference" });
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

  const { user, memberships, wagers } = state.profile;
  const wonCount = wagers.filter(
    (w) => getWagerResult(w.bet.status, w.side) === "Won",
  ).length;
  const lostCount = wagers.filter(
    (w) => getWagerResult(w.bet.status, w.side) === "Lost",
  ).length;
  const openCount = wagers.filter(
    (w) => getWagerResult(w.bet.status, w.side) === "Open",
  ).length;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* User Header */}
      <View style={styles.userHeader}>
        <UserAvatar user={user} size={64} />
        <View>
          <Text variant="titleLarge" style={styles.userName}>
            {user.display_name}
          </Text>
          <Text variant="bodyMedium" style={styles.muted}>
            {user.email}
          </Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard} mode="outlined">
          <Card.Content style={styles.statContent}>
            <Text variant="headlineSmall" style={{ color: betColors.yes }}>
              {wonCount}
            </Text>
            <Text variant="bodySmall" style={styles.muted}>
              Won
            </Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard} mode="outlined">
          <Card.Content style={styles.statContent}>
            <Text variant="headlineSmall" style={{ color: betColors.no }}>
              {lostCount}
            </Text>
            <Text variant="bodySmall" style={styles.muted}>
              Lost
            </Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard} mode="outlined">
          <Card.Content style={styles.statContent}>
            <Text variant="headlineSmall">{openCount}</Text>
            <Text variant="bodySmall" style={styles.muted}>
              Open
            </Text>
          </Card.Content>
        </Card>
      </View>

      {/* Credit Balances */}
      <Card style={styles.section} mode="outlined">
        <Card.Title title="Credit Balances" />
        <Card.Content>
          {memberships.length === 0 ? (
            <Text style={styles.muted}>No group memberships</Text>
          ) : (
            memberships.map((m) => (
              <Pressable
                key={m.id}
                onPress={() =>
                  router.push(ROUTES.group(m.group_id) as never)
                }
              >
                <View style={styles.membershipRow}>
                  <Text variant="bodyMedium">{m.group_name}</Text>
                  <Text
                    variant="bodyMedium"
                    style={styles.creditBalance}
                  >
                    {formatCredits(m.credit_balance)}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </Card.Content>
      </Card>

      {/* Email Preferences */}
      <Card style={styles.section} mode="outlined">
        <Card.Title title="Email Preferences" />
        <Card.Content style={styles.prefsList}>
          <View style={styles.prefRow}>
            <Text variant="bodyMedium">New bets</Text>
            <Switch
              value={user.email_bet_created}
              onValueChange={(v) => toggleEmailPref("email_bet_created", v)}
            />
          </View>
          <Divider />
          <View style={styles.prefRow}>
            <Text variant="bodyMedium">Wagers on your bets</Text>
            <Switch
              value={user.email_wager_placed}
              onValueChange={(v) =>
                toggleEmailPref("email_wager_placed", v)
              }
            />
          </View>
          <Divider />
          <View style={styles.prefRow}>
            <Text variant="bodyMedium">Bet results</Text>
            <Switch
              value={user.email_bet_resolved}
              onValueChange={(v) =>
                toggleEmailPref("email_bet_resolved", v)
              }
            />
          </View>
        </Card.Content>
      </Card>

      {/* Wager History */}
      <Card style={styles.section} mode="outlined">
        <Card.Title title="Wager History" />
        <Card.Content>
          {wagers.length === 0 ? (
            <Text style={styles.muted}>No wagers yet</Text>
          ) : (
            wagers.map((w) => {
              const result = getWagerResult(w.bet.status, w.side);
              return (
                <Pressable
                  key={w.id}
                  onPress={() =>
                    router.push(
                      ROUTES.bet(w.bet.group_id, w.bet_id) as never,
                    )
                  }
                >
                  <View style={styles.wagerRow}>
                    <View style={styles.wagerInfo}>
                      <Text variant="bodyMedium" numberOfLines={1}>
                        {w.bet.description}
                      </Text>
                      <View style={styles.wagerMeta}>
                        <Chip
                          compact
                          textStyle={styles.chipText}
                          style={[
                            styles.sideChip,
                            {
                              backgroundColor:
                                w.side === "yes"
                                  ? betColors.yesLight
                                  : betColors.noLight,
                            },
                          ]}
                        >
                          {w.side.toUpperCase()}
                        </Chip>
                        <Text variant="bodySmall" style={styles.muted}>
                          {formatCredits(w.amount)}
                        </Text>
                      </View>
                    </View>
                    <Chip
                      compact
                      textStyle={[
                        styles.chipText,
                        {
                          color:
                            result === "Won"
                              ? betColors.yes
                              : result === "Lost"
                                ? betColors.no
                                : "#71717a",
                        },
                      ]}
                    >
                      {result}
                    </Chip>
                  </View>
                </Pressable>
              );
            })
          )}
        </Card.Content>
      </Card>

      {/* Sign Out */}
      <Button
        mode="outlined"
        onPress={() => signOut()}
        icon="logout"
        style={styles.signOut}
      >
        Sign Out
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
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 16,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  userName: {
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statCard: {
    flex: 1,
  },
  statContent: {
    alignItems: "center",
    gap: 2,
  },
  section: {
    /* no extra styling needed */
  },
  membershipRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  creditBalance: {
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  prefsList: {
    gap: 0,
  },
  prefRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  wagerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  wagerInfo: {
    flex: 1,
    gap: 4,
  },
  wagerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sideChip: {
    height: 24,
  },
  chipText: {
    fontSize: 11,
  },
  muted: {
    color: "#71717a",
  },
  errorText: {
    color: "#d93b3b",
    textAlign: "center",
  },
  signOut: {
    marginTop: 8,
  },
});
