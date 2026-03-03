import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
} from "react-native";
import {
  Text,
  Card,
  Button,
  SegmentedButtons,
  ActivityIndicator,
  Chip,
  TextInput,
  Divider,
} from "react-native-paper";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import * as Clipboard from "expo-clipboard";
import Toast from "react-native-toast-message";
import {
  api,
  formatCredits,
  GROUP_ROLE_LABELS,
  BET_STATUS_LABELS,
} from "poly-myket-shared";
import type {
  Bet,
  GroupDetailResponse,
  User,
  GroupMember,
} from "poly-myket-shared";
import { BetCard } from "../../../components/BetCard";
import { UserAvatar } from "../../../components/UserAvatar";
import { ROUTES } from "../../../lib/routes";

type PageState =
  | { status: "loading" }
  | {
      status: "loaded";
      group: GroupDetailResponse;
      bets: Bet[];
      currentUser: User;
    }
  | { status: "error"; message: string };

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [tab, setTab] = useState("bets");
  const [refreshing, setRefreshing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      const [group, bets, currentUser] = await Promise.all([
        api.getGroup(groupId),
        api.getBets(groupId),
        api.getMe(),
      ]);
      setState({ status: "loaded", group, bets, currentUser });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load group";
      setState({ status: "error", message: msg });
    }
  }, [groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  async function copyInviteLink() {
    if (state.status !== "loaded") return;
    await Clipboard.setStringAsync(
      `https://polymyket.vercel.app/invite/${state.group.invite_code}`,
    );
    Toast.show({ type: "success", text1: "Invite link copied!" });
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

  const { group, bets, currentUser } = state;
  const currentMember = group.members.find(
    (m) => m.user_id === currentUser.id,
  );
  const isAdmin = currentMember?.role === "admin";

  const activeBets = bets.filter((b) => b.status === "open");
  const completedBets = bets
    .filter((b) => b.status !== "open")
    .sort(
      (a, b) =>
        new Date(b.resolved_at ?? b.created_at).getTime() -
        new Date(a.resolved_at ?? a.created_at).getTime(),
    );

  const sortedMembers = [...group.members].sort((a, b) => {
    if (a.role === "admin" && b.role !== "admin") return -1;
    if (b.role === "admin" && a.role !== "admin") return 1;
    return (a.user?.display_name ?? "").localeCompare(
      b.user?.display_name ?? "",
    );
  });

  const tabs = [
    { value: "bets", label: "Bets" },
    { value: "members", label: "Members" },
    ...(isAdmin ? [{ value: "admin", label: "Admin" }] : []),
  ];

  return (
    <>
      <Stack.Screen options={{ title: group.name }} />
      <FlatList
        data={[]}
        renderItem={null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.container}
        ListHeaderComponent={
          <>
            {/* Header info */}
            <View style={styles.headerRow}>
              <View style={styles.headerInfo}>
                <Text variant="bodySmall" style={styles.muted}>
                  Starting credits: {formatCredits(group.starting_credits)}
                </Text>
              </View>
              <View style={styles.headerActions}>
                <Button
                  mode="outlined"
                  icon="link"
                  onPress={copyInviteLink}
                  compact
                >
                  Invite
                </Button>
                <Button
                  mode="contained"
                  icon="plus"
                  onPress={() =>
                    router.push(ROUTES.newBet(groupId) as never)
                  }
                  compact
                >
                  New Bet
                </Button>
              </View>
            </View>

            {/* Tabs */}
            <SegmentedButtons
              value={tab}
              onValueChange={setTab}
              buttons={tabs}
              style={styles.tabs}
            />

            {/* Bets Tab */}
            {tab === "bets" && (
              <View style={styles.tabContent}>
                {activeBets.length === 0 && completedBets.length === 0 ? (
                  <Text style={styles.muted}>No bets yet</Text>
                ) : (
                  <>
                    {activeBets.map((bet) => (
                      <BetCard key={bet.id} bet={bet} />
                    ))}
                    {completedBets.length > 0 && (
                      <>
                        <Button
                          mode="text"
                          onPress={() => setShowCompleted(!showCompleted)}
                          icon={showCompleted ? "chevron-up" : "chevron-down"}
                          compact
                        >
                          {showCompleted ? "Hide" : "Show"} completed (
                          {completedBets.length})
                        </Button>
                        {showCompleted &&
                          completedBets.map((bet) => (
                            <BetCard key={bet.id} bet={bet} />
                          ))}
                      </>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Members Tab */}
            {tab === "members" && (
              <View style={styles.tabContent}>
                {sortedMembers.map((m) => (
                  <View key={m.id} style={styles.memberRow}>
                    <UserAvatar user={m.user} size={36} />
                    <View style={styles.memberInfo}>
                      <Text variant="bodyMedium" style={styles.bold}>
                        {m.user?.display_name ?? "Unknown"}
                      </Text>
                      <Text variant="bodySmall" style={styles.muted}>
                        {formatCredits(m.credit_balance)} credits
                      </Text>
                    </View>
                    <Chip compact>{GROUP_ROLE_LABELS[m.role]}</Chip>
                  </View>
                ))}
              </View>
            )}

            {/* Admin Tab */}
            {tab === "admin" && isAdmin && (
              <AdminPanel
                groupId={groupId}
                members={group.members}
                onUpdate={fetchData}
              />
            )}
          </>
        }
      />
    </>
  );
}

function AdminPanel({
  groupId,
  members,
  onUpdate,
}: {
  groupId: string;
  members: GroupMember[];
  onUpdate: () => void;
}) {
  const [selectedMember, setSelectedMember] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdjust() {
    if (!selectedMember || !adjustAmount) return;
    setSubmitting(true);
    try {
      await api.adjustCredits(groupId, {
        member_id: selectedMember,
        amount: parseFloat(adjustAmount),
        reason: adjustReason || undefined,
      });
      Toast.show({ type: "success", text1: "Credits adjusted!" });
      setAdjustAmount("");
      setAdjustReason("");
      onUpdate();
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to adjust credits";
      Toast.show({ type: "error", text1: "Error", text2: msg });
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePromote(memberId: string) {
    try {
      await api.promoteMember(groupId, { member_id: memberId });
      Toast.show({ type: "success", text1: "Member promoted!" });
      onUpdate();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to promote";
      Toast.show({ type: "error", text1: "Error", text2: msg });
    }
  }

  const nonAdmins = members.filter((m) => m.role !== "admin");

  return (
    <View style={styles.tabContent}>
      {/* Adjust Credits */}
      <Card mode="outlined" style={styles.adminCard}>
        <Card.Title title="Adjust Credits" />
        <Card.Content style={styles.adminForm}>
          <View style={styles.memberPicker}>
            {members.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => setSelectedMember(m.id)}
              >
                <Chip
                  selected={selectedMember === m.id}
                  showSelectedOverlay
                  compact
                >
                  {m.user?.display_name ?? "Unknown"}
                </Chip>
              </Pressable>
            ))}
          </View>
          <TextInput
            mode="outlined"
            label="Amount (+/-)"
            value={adjustAmount}
            onChangeText={setAdjustAmount}
            keyboardType="numeric"
          />
          <TextInput
            mode="outlined"
            label="Reason (optional)"
            value={adjustReason}
            onChangeText={setAdjustReason}
          />
          <Button
            mode="contained"
            onPress={handleAdjust}
            loading={submitting}
            disabled={!selectedMember || !adjustAmount || submitting}
          >
            Adjust Credits
          </Button>
        </Card.Content>
      </Card>

      {/* Promote Members */}
      {nonAdmins.length > 0 && (
        <Card mode="outlined" style={styles.adminCard}>
          <Card.Title title="Promote to Admin" />
          <Card.Content>
            {nonAdmins.map((m) => (
              <View key={m.id} style={styles.promoteRow}>
                <Text variant="bodyMedium">
                  {m.user?.display_name ?? "Unknown"}
                </Text>
                <Button
                  mode="outlined"
                  compact
                  onPress={() => handlePromote(m.id)}
                >
                  Promote
                </Button>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}
    </View>
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
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerInfo: {},
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  tabs: {
    marginBottom: 16,
  },
  tabContent: {
    gap: 12,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  memberInfo: {
    flex: 1,
  },
  bold: {
    fontWeight: "600",
  },
  muted: {
    color: "#71717a",
  },
  errorText: {
    color: "#d93b3b",
    textAlign: "center",
  },
  adminCard: {
    marginBottom: 8,
  },
  adminForm: {
    gap: 12,
  },
  memberPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  promoteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
});
