export const ROUTES = {
  signIn: "/(auth)/sign-in" as const,
  groups: "/(tabs)" as const,
  newGroup: "/groups/new" as const,
  joinGroup: "/groups/join" as const,
  group: (id: string) => `/groups/${id}` as const,
  newBet: (groupId: string) => `/groups/${groupId}/bets/new` as const,
  bet: (groupId: string, betId: string) =>
    `/groups/${groupId}/bets/${betId}` as const,
  profile: "/(tabs)/profile" as const,
  invite: (code: string) => `/invite/${code}` as const,
};
