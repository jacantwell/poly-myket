"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, ApiClientError } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { Group } from "@/lib/types";

type Phase = "idle" | "submitting" | "created";

export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [group, setGroup] = useState<Group | null>(null);

  const trimmed = name.trim();
  const isSubmitting = phase === "submitting";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed) return;

    setPhase("submitting");
    try {
      const created = await api.createGroup({ name: trimmed });
      setGroup(created);
      setPhase("created");
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message || "Failed to create group.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
      setPhase("idle");
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  }

  if (phase === "created" && group) {
    const inviteLink = `${window.location.origin}/invite/${group.invite_code}`;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Group created!</h1>
          <p className="text-muted-foreground mt-1">
            Share the invite code or link so friends can join{" "}
            <span className="font-medium text-foreground">{group.name}</span>.
          </p>
        </div>

        <Card>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Invite code</p>
              <div className="flex gap-2">
                <code className="bg-muted rounded-md px-3 py-2 text-sm font-mono flex-1">
                  {group.invite_code}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(group.invite_code)}
                >
                  Copy
                </Button>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Invite link</p>
              <div className="flex gap-2">
                <code className="bg-muted rounded-md px-3 py-2 text-sm font-mono flex-1 truncate">
                  {inviteLink}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(inviteLink)}
                >
                  Copy
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={() => router.push(ROUTES.group(group.id))}>
          Go to group
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Create Group</h1>
      <p className="text-muted-foreground">
        Create a new group and invite your friends to start betting.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          placeholder="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
        />
        <Button type="submit" disabled={isSubmitting || !trimmed}>
          {isSubmitting ? "Creating..." : "Create Group"}
        </Button>
      </form>
    </div>
  );
}
