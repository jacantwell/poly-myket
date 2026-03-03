import type { AdjustCreditsRequest, Bet, CreateBetRequest, CreateGroupRequest, CreditAdjustment, Group, GroupDetailResponse, GroupMember, JoinGroupRequest, PlaceWagerRequest, PromoteMemberRequest, ResolveBetRequest, User, UserProfile, Wager } from "./types";
export declare function setApiUrl(url: string): void;
export declare class ApiClientError extends Error {
    status: number;
    constructor(status: number, message: string);
}
export declare function setTokenGetter(getter: () => Promise<string | null>): void;
export declare const api: {
    getMe: () => Promise<User>;
    getMyProfile: () => Promise<UserProfile>;
    updateMe: (data: {
        image_url?: string;
    }) => Promise<User>;
    updateEmailPreferences: (data: {
        email_bet_created?: boolean;
        email_wager_placed?: boolean;
        email_bet_resolved?: boolean;
    }) => Promise<User>;
    getGroups: () => Promise<Group[]>;
    createGroup: (data: CreateGroupRequest) => Promise<Group>;
    joinGroup: (data: JoinGroupRequest) => Promise<Group>;
    getGroup: (id: string) => Promise<GroupDetailResponse>;
    getBets: (groupId: string) => Promise<Bet[]>;
    getBet: (betId: string) => Promise<Bet>;
    createBet: (groupId: string, data: CreateBetRequest) => Promise<Bet>;
    resolveBet: (betId: string, data: ResolveBetRequest) => Promise<Bet>;
    placeWager: (betId: string, data: PlaceWagerRequest) => Promise<Wager>;
    adjustCredits: (groupId: string, data: AdjustCreditsRequest) => Promise<CreditAdjustment>;
    getCreditAdjustments: (groupId: string) => Promise<CreditAdjustment[]>;
    promoteMember: (groupId: string, data: PromoteMemberRequest) => Promise<GroupMember>;
    cancelBet: (betId: string) => Promise<Bet>;
};
//# sourceMappingURL=api.d.ts.map