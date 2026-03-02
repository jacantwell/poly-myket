"use client";

import { useCallback, useEffect, useState, use } from "react";
import Link from "next/link";
import { Copy, Check, Plus } from "lucide-react";
import { toast } from "sonner";

import { BetCard, BetCardSkeleton } from "@/components/bet-card";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, ApiClientError } from "@/lib/api";
import { ROUTES, GROUP_ROLE_LABELS } from "@/lib/constants";
import type { Bet, GroupDetailResponse, GroupMember, User } from "@/lib/types";

type PageState =
  | { status: "loading" }
  | {
      status: "loaded";
      group: GroupDetailResponse;
      bets: Bet[];
      currentUser: User;
    }
  | { status: "error"; message: string };

export default function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = use(params);
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const [group, bets, currentUser] = await Promise.all([
        api.getGroup(groupId),
        api.getBets(groupId),
        api.getMe(),
      ]);
      setState({ status: "loaded", group, bets, currentUser });
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? `Failed to load group (${err.status})`
          : "Something went wrong. Please try again.";
      setState({ status: "error", message });
    }
  }, [groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function copyInviteLink(code: string) {
    const link = `${window.location.origin}${ROUTES.invite(code)}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  if (state.status === "loading") {
    return <LoadingSkeleton />;
  }

  if (state.status === "error") {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-muted-foreground">{state.message}</p>
          <Button variant="outline" onClick={fetchData}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const { group, bets, currentUser } = state;
  const currentMember = group.members.find(
    (m) => m.user_id === currentUser.id,
  );
  const isAdmin = currentMember?.role === "admin";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          {group.starting_credits > 0 && (
            <p className="text-sm text-muted-foreground">
              Starting credits: {Number(group.starting_credits).toFixed(0)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyInviteLink(group.invite_code)}
          >
            {copied ? (
              <Check className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <Copy className="mr-1.5 h-3.5 w-3.5" />
            )}
            {copied ? "Copied!" : "Invite Link"}
          </Button>
          <Button size="sm" asChild>
            <Link href={ROUTES.newBet(groupId)}>New Bet</Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="bets">
        <TabsList>
          <TabsTrigger value="bets">Bets</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>

        <TabsContent value="bets">
          <BetsTab bets={bets} groupId={groupId} />
        </TabsContent>

        <TabsContent value="members">
          <MembersTab members={group.members} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="admin">
            <AdminTab
              groupId={groupId}
              members={group.members}
              currentUserId={currentUser.id}
              onRefresh={fetchData}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function BetsTab({ bets, groupId }: { bets: Bet[]; groupId: string }) {
  if (bets.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <h2 className="text-lg font-semibold">No bets yet</h2>
        <p className="max-w-sm text-muted-foreground">
          Create the first bet in this group to get things started.
        </p>
        <Button asChild>
          <Link href={ROUTES.newBet(groupId)}>New Bet</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {bets.map((bet) => (
        <BetCard key={bet.id} bet={bet} />
      ))}
      <Link
        href={ROUTES.newBet(groupId)}
        className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        <Plus className="h-6 w-6" />
        <span className="text-sm font-medium">New bet</span>
      </Link>
    </div>
  );
}

function MembersTab({ members }: { members: GroupMember[] }) {
  const sorted = [...members].sort((a, b) => {
    if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
    const nameA = a.user?.display_name ?? "";
    const nameB = b.user?.display_name ?? "";
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="space-y-2">
      {sorted.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <div className="flex items-center gap-3">
            <UserAvatar user={member.user} />
            <div>
              <p className="text-sm font-medium">
                {member.user?.display_name ?? "Unknown"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm tabular-nums text-muted-foreground">
              {Number(member.credit_balance).toFixed(0)} credits
            </span>
            <Badge
              variant={member.role === "admin" ? "default" : "secondary"}
            >
              {GROUP_ROLE_LABELS[member.role]}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminTab({
  groupId,
  members,
  currentUserId,
  onRefresh,
}: {
  groupId: string;
  members: GroupMember[];
  currentUserId: string;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-6">
      <AdjustCreditsForm groupId={groupId} members={members} onSuccess={onRefresh} />
      <PromoteMemberSection
        groupId={groupId}
        members={members}
        currentUserId={currentUserId}
        onSuccess={onRefresh}
      />
    </div>
  );
}

function AdjustCreditsForm({
  groupId,
  members,
  onSuccess,
}: {
  groupId: string;
  members: GroupMember[];
  onSuccess: () => void;
}) {
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = memberId && amount && Number(amount) !== 0 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      await api.adjustCredits(groupId, {
        member_id: memberId,
        amount: Number(amount),
        reason: reason.trim() || undefined,
      });
      toast.success("Credits adjusted!");
      setMemberId("");
      setAmount("");
      setReason("");
      onSuccess();
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message || "Failed to adjust credits.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent>
        <h3 className="mb-4 text-base font-semibold">Adjust Credits</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adjust-member">Member</Label>
            <select
              id="adjust-member"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              disabled={submitting}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select a member...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.user?.display_name ?? m.user_id}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjust-amount">Amount</Label>
            <input
              id="adjust-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={submitting}
              placeholder="e.g. 50 or -25"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjust-reason">
              Reason{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <input
              id="adjust-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              placeholder="Weekly allowance, penalty, etc."
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <Button type="submit" disabled={!canSubmit}>
            {submitting ? "Adjusting..." : "Adjust Credits"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PromoteMemberSection({
  groupId,
  members,
  currentUserId,
  onSuccess,
}: {
  groupId: string;
  members: GroupMember[];
  currentUserId: string;
  onSuccess: () => void;
}) {
  const [promotingId, setPromotingId] = useState<string | null>(null);

  const nonAdmins = members.filter(
    (m) => m.role !== "admin" && m.user_id !== currentUserId,
  );

  async function handlePromote(member: GroupMember) {
    setPromotingId(member.id);
    try {
      await api.promoteMember(groupId, { member_id: member.id });
      toast.success(
        `${member.user?.display_name ?? "Member"} promoted to admin!`,
      );
      onSuccess();
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message || "Failed to promote member.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setPromotingId(null);
    }
  }

  return (
    <Card>
      <CardContent>
        <h3 className="mb-4 text-base font-semibold">Promote Member</h3>
        {nonAdmins.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            All members are already admins.
          </p>
        ) : (
          <div className="space-y-2">
            {nonAdmins.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <p className="text-sm font-medium">
                  {member.user?.display_name ?? "Unknown"}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={promotingId === member.id}
                  onClick={() => handlePromote(member)}
                >
                  {promotingId === member.id
                    ? "Promoting..."
                    : "Promote to Admin"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <BetCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
