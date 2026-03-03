import type { BetStatus, GroupRole } from "./types";

export const BET_STATUS_LABELS: Record<BetStatus, string> = {
  open: "Open",
  resolved_success: "Completed",
  resolved_fail: "Failed",
  cancelled: "Cancelled",
};

export const GROUP_ROLE_LABELS: Record<GroupRole, string> = {
  admin: "Admin",
  member: "Member",
};

export type BetStatusColor = "green" | "gray" | "red" | "muted";

export const BET_STATUS_COLOR: Record<BetStatus, BetStatusColor> = {
  open: "green",
  resolved_success: "gray",
  resolved_fail: "red",
  cancelled: "muted",
};
