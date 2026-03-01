// Domain types matching the backend data model

export interface User {
  id: string;
  email: string;
  display_name: string;
  image_url: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

export type GroupRole = "admin" | "member";

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  credit_balance: number;
  role: GroupRole;
  created_at: string;
  user?: User;
}

export interface CreditAdjustment {
  id: string;
  member_id: string;
  adjusted_by: string;
  amount: number;
  reason: string | null;
  created_at: string;
}

export type BetStatus =
  | "open"
  | "resolved_success"
  | "resolved_fail"
  | "cancelled";

export interface Bet {
  id: string;
  group_id: string;
  created_by: string;
  subject_id: string;
  description: string;
  deadline: string;
  status: BetStatus;
  proof_image_url: string | null;
  resolved_at: string | null;
  created_at: string;
  creator?: User;
  subject?: User;
  wagers?: Wager[];
}

export type WagerSide = "yes" | "no";

export interface Wager {
  id: string;
  bet_id: string;
  user_id: string;
  amount: number;
  side: WagerSide;
  created_at: string;
  user?: User;
}

// API request/response types

export interface CreateGroupRequest {
  name: string;
}

export interface JoinGroupRequest {
  invite_code: string;
}

export interface GroupDetailResponse extends Group {
  members: GroupMember[];
}

export interface CreateBetRequest {
  subject_id: string;
  description: string;
  deadline?: string;
}

export interface ResolveBetRequest {
  outcome: "success" | "fail";
  proof_image_url?: string;
}

export interface PlaceWagerRequest {
  side: WagerSide;
  amount: number;
}

export interface AdjustCreditsRequest {
  member_id: string;
  amount: number;
  reason?: string;
}

export interface PromoteMemberRequest {
  member_id: string;
}
