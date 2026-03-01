"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { GroupMember } from "@/lib/types";

interface MemberSelectProps {
  members: GroupMember[];
  value: string;
  onValueChange: (userId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MemberSelect({
  members,
  value,
  onValueChange,
  placeholder = "Select a member...",
  disabled = false,
}: MemberSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = members.find((m) => m.user_id === value);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground",
        )}
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <UserAvatar user={selected.user} size="sm" />
            <span>{selected.user?.display_name ?? selected.user_id}</span>
          </span>
        ) : (
          <span>{placeholder}</span>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
        {members.map((member) => (
          <DropdownMenuItem
            key={member.user_id}
            onSelect={() => {
              onValueChange(member.user_id);
              setOpen(false);
            }}
          >
            <UserAvatar user={member.user} size="sm" />
            <span>{member.user?.display_name ?? member.user_id}</span>
            {member.user_id === value && (
              <Check className="ml-auto h-4 w-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
