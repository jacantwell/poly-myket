"use client";

import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { BetCard, BetCardSkeleton } from "@/components/bet-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/constants";
import type { Bet, Group } from "@/lib/types";

interface GroupBetsSectionProps {
  group: Group;
  bets: Bet[];
}

export function GroupBetsSection({ group, bets }: GroupBetsSectionProps) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-lg font-semibold">{group.name}</h2>
        <Link
          href={ROUTES.group(group.id)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          View group
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {bets.map((bet) => (
          <BetCard key={bet.id} bet={bet} />
        ))}
        <Link
          href={ROUTES.newBet(group.id)}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          <Plus className="h-6 w-6" />
          <span className="text-sm font-medium">New bet</span>
        </Link>
      </div>
    </section>
  );
}

export function GroupBetsSectionSkeleton() {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <BetCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
