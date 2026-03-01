import type { BetStatus, GroupRole } from "./types";

export const ROUTES = {
  signIn: "/sign-in",
  signUp: "/sign-up",
  groups: "/groups",
  newGroup: "/groups/new",
  joinGroup: "/groups/join",
  group: (id: string) => `/groups/${id}`,
  invite: (code: string) => `/invite/${code}`,
  newBet: (groupId: string) => `/groups/${groupId}/bets/new`,
  bet: (groupId: string, betId: string) =>
    `/groups/${groupId}/bets/${betId}`,
  profile: "/profile",
} as const;

export const BET_STATUS_LABELS: Record<BetStatus, string> = {
  open: "Open",
  resolved_success: "Completed",
  resolved_fail: "Failed",
  cancelled: "Cancelled",
};

export const BET_STATUS_VARIANT: Record<
  BetStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  open: "default",
  resolved_success: "secondary",
  resolved_fail: "destructive",
  cancelled: "outline",
};

export const GROUP_ROLE_LABELS: Record<GroupRole, string> = {
  admin: "Admin",
  member: "Member",
};

export const DEFAULT_CREDITS = 100;
