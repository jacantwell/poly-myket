"use client";

import { useCallback, useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiClientError } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { GroupDetailResponse, User } from "@/lib/types";

type PageState =
  | { status: "loading" }
  | { status: "loaded"; group: GroupDetailResponse; currentUser: User }
  | { status: "error"; message: string };

type Phase = "idle" | "submitting";

export default function NewBetPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = use(params);
  const router = useRouter();

  const [state, setState] = useState<PageState>({ status: "loading" });
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [wagerAmount, setWagerAmount] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");

  const fetchData = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const [group, currentUser] = await Promise.all([
        api.getGroup(groupId),
        api.getMe(),
      ]);
      setState({ status: "loaded", group, currentUser });
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

  const isSubmitting = phase === "submitting";
  const canSubmit =
    description.trim() && wagerAmount && Number(wagerAmount) > 0 && !isSubmitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || state.status !== "loaded") return;

    setPhase("submitting");
    try {
      await api.createBet(groupId, {
        subject_id: state.currentUser.id,
        description: description.trim(),
        deadline: deadline || undefined,
        initial_wager_amount: Number(wagerAmount),
      });
      toast.success("Bet created!");
      router.push(ROUTES.group(groupId));
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message || "Failed to create bet.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
      setPhase("idle");
    }
  }

  if (state.status === "loading") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create Bet</h1>
          <p className="text-muted-foreground mt-1">Loading group...</p>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create Bet</h1>
        </div>
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-muted-foreground">{state.message}</p>
          <Button variant="outline" onClick={fetchData}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const { group, currentUser } = state;
  const currentMember = group.members.find(
    (m) => m.user_id === currentUser.id,
  );
  const creditBalance = currentMember?.credit_balance ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Bet</h1>
        <p className="text-muted-foreground mt-1">
          Make a commitment in{" "}
          <span className="font-medium text-foreground">{group.name}</span>
        </p>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">What will you commit to?</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                placeholder="I will..."
                rows={3}
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wagerAmount">Your Stake (YES)</Label>
              <Input
                id="wagerAmount"
                type="number"
                min="0.01"
                step="0.01"
                value={wagerAmount}
                onChange={(e) => setWagerAmount(e.target.value)}
                disabled={isSubmitting}
                placeholder="Amount to stake"
              />
              <p className="text-xs text-muted-foreground">
                Available: {creditBalance.toFixed(0)} credits
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">
                Deadline{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <input
                id="deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                disabled={isSubmitting}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "Creating..." : "Create Bet"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
