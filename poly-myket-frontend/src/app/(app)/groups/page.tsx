"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  GroupBetsSection,
  GroupBetsSectionSkeleton,
} from "@/components/group-bets-section";
import { ROUTES } from "@/lib/constants";
import { api, ApiClientError } from "@/lib/api";
import type { Bet, Group } from "@/lib/types";

type State =
  | { status: "loading" }
  | { status: "loaded"; groups: Group[]; betsByGroup: Record<string, Bet[]> }
  | { status: "error"; message: string };

export default function GroupsPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  const fetchData = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const groups = await api.getGroups();

      const betsResults = await Promise.allSettled(
        groups.map((g) => api.getBets(g.id)),
      );

      const betsByGroup: Record<string, Bet[]> = {};
      groups.forEach((group, i) => {
        const result = betsResults[i];
        betsByGroup[group.id] =
          result.status === "fulfilled" ? result.value : [];
      });

      setState({ status: "loaded", groups, betsByGroup });
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? `Failed to load groups (${err.status})`
          : "Something went wrong. Please try again.";
      setState({ status: "error", message });
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-8">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Markets</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={ROUTES.joinGroup}>Join Group</Link>
          </Button>
          <Button asChild>
            <Link href={ROUTES.newGroup}>New Group</Link>
          </Button>
        </div>
      </div>

      {/* Loading */}
      {state.status === "loading" && (
        <div className="space-y-8">
          <GroupBetsSectionSkeleton />
          <GroupBetsSectionSkeleton />
        </div>
      )}

      {/* Error */}
      {state.status === "error" && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-muted-foreground">{state.message}</p>
          <Button variant="outline" onClick={fetchData}>
            Retry
          </Button>
        </div>
      )}

      {/* Loaded */}
      {state.status === "loaded" && (
        <>
          {state.groups.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <h2 className="text-lg font-semibold">No groups yet</h2>
              <p className="max-w-sm text-muted-foreground">
                Create a group to start betting with friends, or join an
                existing one with an invite code.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href={ROUTES.joinGroup}>Join Group</Link>
                </Button>
                <Button asChild>
                  <Link href={ROUTES.newGroup}>New Group</Link>
                </Button>
              </div>
            </div>
          ) : (
            state.groups.map((group) => (
              <GroupBetsSection
                key={group.id}
                group={group}
                bets={state.betsByGroup[group.id] ?? []}
              />
            ))
          )}
        </>
      )}
    </div>
  );
}
