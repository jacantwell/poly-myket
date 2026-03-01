"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES, BET_STATUS_LABELS, BET_STATUS_VARIANT } from "@/lib/constants";
import { calculateOdds, formatCredits } from "@/lib/bet-utils";
import type { Bet } from "@/lib/types";

interface BetCardProps {
  bet: Bet;
}

export function BetCard({ bet }: BetCardProps) {
  const odds = calculateOdds(bet.wagers);
  const subjectInitial = bet.subject?.display_name?.charAt(0).toUpperCase() ?? "?";
  const isOpen = bet.status === "open";
  const majorityYes = odds.yesProbability >= 50;

  return (
    <Link
      href={ROUTES.bet(bet.group_id, bet.id)}
      className="group flex flex-col justify-between rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
    >
      {/* Top: avatar + description + status badge */}
      <div className="mb-3">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
            {subjectInitial}
          </div>
          <p className="line-clamp-3 text-sm font-medium leading-snug">
            {bet.description}
          </p>
          {!isOpen && (
            <Badge variant={BET_STATUS_VARIANT[bet.status]} className="ml-auto shrink-0 text-[10px]">
              {BET_STATUS_LABELS[bet.status]}
            </Badge>
          )}
        </div>
      </div>

      {/* Center: probability */}
      <div className="mb-3">
        <span
          className={`text-3xl font-bold ${majorityYes ? "text-yes" : "text-no"}`}
        >
          {odds.yesProbability}%
        </span>
        <span className="ml-1.5 text-xs text-muted-foreground">chance</span>
      </div>

      {/* Probability bar */}
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-yes transition-all"
          style={{ width: `${odds.yesProbability}%` }}
        />
      </div>

      {/* Bottom: volume + price pills */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
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
    </Link>
  );
}

export function BetCardSkeleton() {
  return (
    <div className="flex flex-col justify-between rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-start gap-3">
        <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-3/4" />
        </div>
      </div>
      <Skeleton className="mb-3 h-9 w-20" />
      <Skeleton className="mb-3 h-1.5 w-full rounded-full" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-16" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-14 rounded-md" />
          <Skeleton className="h-5 w-14 rounded-md" />
        </div>
      </div>
    </div>
  );
}
