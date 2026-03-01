"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiClientError } from "@/lib/api";
import { ROUTES } from "@/lib/constants";

export default function JoinGroupPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = inviteCode.trim();
    if (!code) return;

    setIsJoining(true);
    try {
      const group = await api.joinGroup({ invite_code: code });
      toast.success(`Joined ${group.name}!`);
      router.push(ROUTES.group(group.id));
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) {
        toast.error("Invalid invite code");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Join Group</h1>
      <p className="text-muted-foreground">
        Enter an invite code to join an existing group.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          placeholder="Invite code"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          disabled={isJoining}
        />
        <Button type="submit" disabled={isJoining || !inviteCode.trim()}>
          {isJoining ? "Joining..." : "Join"}
        </Button>
      </form>
    </div>
  );
}
