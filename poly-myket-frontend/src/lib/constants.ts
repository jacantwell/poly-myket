export { BET_STATUS_LABELS, GROUP_ROLE_LABELS } from "poly-myket-shared";
import type { BetStatus } from "poly-myket-shared";

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

export const BET_STATUS_VARIANT: Record<
  BetStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  open: "default",
  resolved_success: "secondary",
  resolved_fail: "destructive",
  cancelled: "outline",
};
