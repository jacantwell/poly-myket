import type { Wager } from "./types";
export interface Odds {
    yesProbability: number;
    noProbability: number;
    yesPrice: number;
    noPrice: number;
    totalVolume: number;
    yesAmount: number;
    noAmount: number;
}
export declare function calculateOdds(wagers: Wager[] | undefined): Odds;
export declare function formatCredits(amount: number): string;
//# sourceMappingURL=bet-utils.d.ts.map