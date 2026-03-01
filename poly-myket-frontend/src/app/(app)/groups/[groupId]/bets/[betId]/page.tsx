"use client";

import { useCallback, useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { WagerForm } from "@/components/wager-form";
import { api, ApiClientError } from "@/lib/api";
import { calculateOdds, formatCredits } from "@/lib/bet-utils";
import {
  ROUTES,
  BET_STATUS_LABELS,
  BET_STATUS_VARIANT,
} from "@/lib/constants";
import type { Bet, GroupDetailResponse, User } from "@/lib/types";

type PageState =
  | { status: "loading" }
  | {
      status: "loaded";
      bet: Bet;
      group: GroupDetailResponse;
      currentUser: User;
    }
  | { status: "error"; message: string };

export default function BetDetailPage({
  params,
}: {
  params: Promise<{ groupId: string; betId: string }>;
}) {
  const { groupId, betId } = use(params);
  const [state, setState] = useState<PageState>({ status: "loading" });

  const fetchData = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const [bet, group, currentUser] = await Promise.all([
        api.getBet(betId),
        api.getGroup(groupId),
        api.getMe(),
      ]);
      setState({ status: "loaded", bet, group, currentUser });
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? `Failed to load bet (${err.status})`
          : "Something went wrong. Please try again.";
      setState({ status: "error", message });
    }
  }, [betId, groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (state.status === "loading") {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Loading bet...</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-muted-foreground">{state.message}</p>
          <Button variant="outline" onClick={fetchData}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const { bet, group, currentUser } = state;
  const currentMember = group.members.find(
    (m) => m.user_id === currentUser.id,
  );
  const canManage =
    currentUser.id === bet.created_by || currentMember?.role === "admin";
  const odds = calculateOdds(bet.wagers);
  const majorityYes = odds.yesProbability >= 50;
  const isOpen = bet.status === "open";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back link */}
      <Link
        href={ROUTES.group(groupId)}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to group
      </Link>

      {/* Bet info card */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <UserAvatar user={bet.subject} size="lg" />
            <div className="min-w-0 flex-1">
              <CardTitle>{bet.description}</CardTitle>
              <CardDescription>
                About {bet.subject?.display_name ?? "Unknown"} · Created by{" "}
                {bet.creator?.display_name ?? "Unknown"}
              </CardDescription>
            </div>
            <Badge
              variant={BET_STATUS_VARIANT[bet.status]}
              className="shrink-0"
            >
              {BET_STATUS_LABELS[bet.status]}
            </Badge>
          </div>
        </CardHeader>
        {bet.deadline && (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Deadline: {new Date(bet.deadline).toLocaleDateString()}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Probability + wager card */}
      <Card>
        <CardContent className="space-y-4">
          {/* Probability display */}
          <div>
            <span
              className={`text-4xl font-bold ${majorityYes ? "text-yes" : "text-no"}`}
            >
              {odds.yesProbability}%
            </span>
            <span className="ml-2 text-sm text-muted-foreground">chance</span>
          </div>

          {/* Probability bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-yes transition-all"
              style={{ width: `${odds.yesProbability}%` }}
            />
          </div>

          {/* Volume + price pills */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {formatCredits(odds.totalVolume)} Vol.
            </span>
            <div className="flex gap-1.5">
              <span className="rounded-md bg-yes-light px-2 py-0.5 text-xs font-medium text-yes">
                Yes {odds.yesPrice.toFixed(2)}
              </span>
              <span className="rounded-md bg-no-light px-2 py-0.5 text-xs font-medium text-no">
                No {odds.noPrice.toFixed(2)}
              </span>
            </div>
          </div>

          <Separator />

          {/* Wager form */}
          <WagerForm
            betId={bet.id}
            isOpen={isOpen}
            creditBalance={Number(currentMember?.credit_balance ?? 0)}
            yesPrice={odds.yesPrice}
            noPrice={odds.noPrice}
            onWagerPlaced={fetchData}
          />
        </CardContent>
      </Card>

      {/* Wager history card */}
      <Card>
        <CardHeader>
          <CardTitle>Wagers</CardTitle>
        </CardHeader>
        <CardContent>
          {!bet.wagers || bet.wagers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No wagers yet.</p>
          ) : (
            <div className="space-y-2">
              {bet.wagers.map((wager) => (
                <div
                  key={wager.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar user={wager.user} />
                    <span className="text-sm font-medium">
                      {wager.user?.display_name ?? "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        wager.side === "yes"
                          ? "border-yes bg-yes-light text-yes"
                          : "border-no bg-no-light text-no"
                      }
                    >
                      {wager.side === "yes" ? "Yes" : "No"}
                    </Badge>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {formatCredits(wager.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manage bet card */}
      {canManage && isOpen && (
        <ManageBetCard betId={bet.id} onAction={fetchData} />
      )}
    </div>
  );
}

function ManageBetCard({
  betId,
  onAction,
}: {
  betId: string;
  onAction: () => void;
}) {
  const [resolvingSuccess, setResolvingSuccess] = useState(false);
  const [resolvingFail, setResolvingFail] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function handleResolve(outcome: "success" | "fail") {
    const setter = outcome === "success" ? setResolvingSuccess : setResolvingFail;
    setter(true);
    try {
      await api.resolveBet(betId, { outcome });
      toast.success(
        outcome === "success" ? "Bet resolved as success!" : "Bet resolved as failed!",
      );
      onAction();
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message || "Failed to resolve bet.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setter(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await api.cancelBet(betId);
      toast.success("Bet cancelled. All wagers have been refunded.");
      onAction();
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message || "Failed to cancel bet.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setCancelling(false);
    }
  }

  const anyLoading = resolvingSuccess || resolvingFail || cancelling;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Bet</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button
          className="bg-yes text-white hover:bg-yes/90"
          disabled={anyLoading}
          onClick={() => handleResolve("success")}
        >
          {resolvingSuccess ? "Resolving..." : "Resolve: Success"}
        </Button>
        <Button
          variant="destructive"
          disabled={anyLoading}
          onClick={() => handleResolve("fail")}
        >
          {resolvingFail ? "Resolving..." : "Resolve: Failed"}
        </Button>
        <Button
          variant="outline"
          disabled={anyLoading}
          onClick={handleCancel}
        >
          {cancelling ? "Cancelling..." : "Cancel Bet"}
        </Button>
      </CardContent>
    </Card>
  );
}
