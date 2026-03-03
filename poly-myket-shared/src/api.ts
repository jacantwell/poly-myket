import type {
  AdjustCreditsRequest,
  Bet,
  CreateBetRequest,
  CreateGroupRequest,
  CreditAdjustment,
  Group,
  GroupDetailResponse,
  GroupMember,
  JoinGroupRequest,
  PlaceWagerRequest,
  PromoteMemberRequest,
  ResolveBetRequest,
  User,
  UserProfile,
  Wager,
} from "./types";

let apiUrl = "http://localhost:6767";

export function setApiUrl(url: string) {
  apiUrl = url;
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

let tokenGetter: (() => Promise<string | null>) | null = null;

export function setTokenGetter(getter: () => Promise<string | null>) {
  tokenGetter = getter;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = tokenGetter ? await tokenGetter() : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ApiClientError(res.status, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // Users
  getMe: () => request<User>("/users/me"),

  getMyProfile: () => request<UserProfile>("/users/me/profile"),

  updateMe: (data: { image_url?: string }) =>
    request<User>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  updateEmailPreferences: (data: {
    email_bet_created?: boolean;
    email_wager_placed?: boolean;
    email_bet_resolved?: boolean;
  }) =>
    request<User>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Groups
  getGroups: () => request<Group[]>("/groups"),

  createGroup: (data: CreateGroupRequest) =>
    request<Group>("/groups", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  joinGroup: (data: JoinGroupRequest) =>
    request<Group>("/groups/join", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getGroup: (id: string) => request<GroupDetailResponse>(`/groups/${id}`),

  // Bets
  getBets: (groupId: string) => request<Bet[]>(`/groups/${groupId}/bets`),

  getBet: (betId: string) => request<Bet>(`/bets/${betId}`),

  createBet: (groupId: string, data: CreateBetRequest) =>
    request<Bet>(`/groups/${groupId}/bets`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  resolveBet: (betId: string, data: ResolveBetRequest) =>
    request<Bet>(`/bets/${betId}/resolve`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Wagers
  placeWager: (betId: string, data: PlaceWagerRequest) =>
    request<Wager>(`/bets/${betId}/wagers`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Admin
  adjustCredits: (groupId: string, data: AdjustCreditsRequest) =>
    request<CreditAdjustment>(`/groups/${groupId}/adjust-credits`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getCreditAdjustments: (groupId: string) =>
    request<CreditAdjustment[]>(`/groups/${groupId}/credit-adjustments`),

  promoteMember: (groupId: string, data: PromoteMemberRequest) =>
    request<GroupMember>(`/groups/${groupId}/promote`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  cancelBet: (betId: string) =>
    request<Bet>(`/bets/${betId}/cancel`, {
      method: "POST",
    }),
};
