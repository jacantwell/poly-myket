"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiClientError } from "@/lib/api";
import { formatCredits } from "@/lib/bet-utils";
import { ROUTES } from "@/lib/constants";
import type { BetStatus, ProfileWager, UserProfile, WagerSide } from "@/lib/types";

type WagerResult = "Won" | "Lost" | "Open" | "Refunded";

function getWagerResult(betStatus: BetStatus, side: WagerSide): WagerResult {
  if (betStatus === "open") return "Open";
  if (betStatus === "cancelled") return "Refunded";
  if (betStatus === "resolved_success") return side === "yes" ? "Won" : "Lost";
  return side === "no" ? "Won" : "Lost"; // resolved_fail
}

const RESULT_VARIANT: Record<WagerResult, "default" | "destructive" | "secondary" | "outline"> = {
  Won: "default",
  Lost: "destructive",
  Open: "secondary",
  Refunded: "outline",
};

type PageState =
  | { status: "loading" }
  | { status: "loaded"; profile: UserProfile }
  | { status: "error"; message: string };

export default function ProfilePage() {
  const [state, setState] = useState<PageState>({ status: "loading" });

  const fetchData = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const profile = await api.getMyProfile();
      setState({ status: "loaded", profile });
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? `Failed to load profile (${err.status})`
          : "Something went wrong. Please try again.";
      setState({ status: "error", message });
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const { profile } = state;
  const { user, memberships, wagers } = profile;

  const stats = wagers.reduce(
    (acc, w) => {
      const result = getWagerResult(w.bet.status, w.side);
      if (result === "Won") acc.won++;
      else if (result === "Lost") acc.lost++;
      else if (result === "Open") acc.open++;
      return acc;
    },
    { won: 0, lost: 0, open: 0 },
  );

  return (
    <div className="space-y-6">
      {/* User info header */}
      <div className="flex items-center gap-4">
        <UserAvatar user={user} size="lg" />
        <div>
          <h1 className="text-2xl font-bold">{user.display_name}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{stats.won}</p>
            <p className="text-xs text-muted-foreground">Won</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{stats.lost}</p>
            <p className="text-xs text-muted-foreground">Lost</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{stats.open}</p>
            <p className="text-xs text-muted-foreground">Open</p>
          </CardContent>
        </Card>
      </div>

      {/* Credit balances */}
      <Card>
        <CardHeader>
          <CardTitle>Credit Balances</CardTitle>
        </CardHeader>
        <CardContent>
          {memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Not a member of any groups yet.
            </p>
          ) : (
            <div className="space-y-2">
              {memberships.map((m) => (
                <Link
                  key={m.id}
                  href={ROUTES.group(m.group_id)}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <p className="text-sm font-medium">{m.group_name}</p>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatCredits(m.credit_balance)} credits
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wager history */}
      <Card>
        <CardHeader>
          <CardTitle>Wager History</CardTitle>
        </CardHeader>
        <CardContent>
          {wagers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No wagers placed yet.
            </p>
          ) : (
            <div className="space-y-2">
              {wagers.map((w) => (
                <WagerRow key={w.id} wager={w} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function WagerRow({ wager }: { wager: ProfileWager }) {
  const result = getWagerResult(wager.bet.status, wager.side);

  return (
    <Link
      href={ROUTES.bet(wager.bet.group_id, wager.bet_id)}
      className="flex items-center justify-between gap-4 rounded-lg border p-3 transition-colors hover:bg-accent"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{wager.bet.description}</p>
        <p className="text-xs text-muted-foreground">{wager.bet.group_name}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
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
        <span className="text-sm tabular-nums">{formatCredits(wager.amount)}</span>
        <Badge variant={RESULT_VARIANT[result]}>{result}</Badge>
      </div>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* User header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>

      {/* Cards */}
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
