"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

export default function GroupsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Groups</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={ROUTES.joinGroup}>Join Group</Link>
          </Button>
          <Button asChild>
            <Link href={ROUTES.newGroup}>New Group</Link>
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground">
        Your groups will appear here. Create or join a group to get started.
      </p>
    </div>
  );
}
