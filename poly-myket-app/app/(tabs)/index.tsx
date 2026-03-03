import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
} from "react-native";
import {
  Text,
  Card,
  Button,
  ActivityIndicator,
  Divider,
} from "react-native-paper";
import { useRouter } from "expo-router";
import { api } from "poly-myket-shared";
import type { Group, Bet } from "poly-myket-shared";
import { BetCard } from "../../components/BetCard";
import { EmptyState } from "../../components/EmptyState";
import { ROUTES } from "../../lib/routes";

type PageState =
  | { status: "loading" }
  | { status: "loaded"; groups: Group[]; betsByGroup: Record<string, Bet[]> }
  | { status: "error"; message: string };

export default function GroupsScreen() {
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      const groups = await api.getGroups();
      const betResults = await Promise.allSettled(
        groups.map((g) => api.getBets(g.id)),
      );
      const betsByGroup: Record<string, Bet[]> = {};
      groups.forEach((g, i) => {
        const result = betResults[i];
        betsByGroup[g.id] =
          result.status === "fulfilled" ? result.value : [];
      });
      setState({ status: "loaded", groups, betsByGroup });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load groups";
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
        <Text style={styles.error}>{state.message}</Text>
        <Button mode="contained" onPress={fetchData}>
          Retry
        </Button>
      </View>
    );
  }

  if (state.groups.length === 0) {
    return (
      <EmptyState
        icon="account-group"
        title="No groups yet"
        description="Create a group or join one with an invite code"
        actionLabel="New Group"
        onAction={() => router.push(ROUTES.newGroup as never)}
      />
    );
  }

  const sections = state.groups.map((group) => ({
    group,
    bets: state.betsByGroup[group.id] ?? [],
  }));

  return (
    <FlatList
      data={sections}
      keyExtractor={(item) => item.group.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListHeaderComponent={
        <View style={styles.headerButtons}>
          <Button
            mode="outlined"
            icon="login"
            onPress={() => router.push(ROUTES.joinGroup as never)}
            compact
          >
            Join Group
          </Button>
          <Button
            mode="contained"
            icon="plus"
            onPress={() => router.push(ROUTES.newGroup as never)}
            compact
          >
            New Group
          </Button>
        </View>
      }
      renderItem={({ item }) => (
        <Card
          style={styles.groupCard}
          mode="outlined"
          onPress={() =>
            router.push(ROUTES.group(item.group.id) as never)
          }
        >
          <Card.Title
            title={item.group.name}
            subtitle={`${item.bets.length} bet${item.bets.length !== 1 ? "s" : ""}`}
          />
          <Card.Content>
            {item.bets
              .filter((b) => b.status === "open")
              .slice(0, 3)
              .map((bet) => (
                <BetCard key={bet.id} bet={bet} />
              ))}
            {item.bets.filter((b) => b.status === "open").length === 0 && (
              <Text variant="bodySmall" style={styles.muted}>
                No active bets
              </Text>
            )}
          </Card.Content>
          <Divider style={styles.divider} />
        </Card>
      )}
    />
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
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  headerButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginBottom: 16,
  },
  groupCard: {
    marginBottom: 16,
  },
  muted: {
    color: "#71717a",
    paddingVertical: 8,
  },
  error: {
    color: "#d93b3b",
    textAlign: "center",
  },
  divider: {
    display: "none",
  },
});
