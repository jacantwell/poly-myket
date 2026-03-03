export function calculateOdds(wagers) {
    if (!wagers || wagers.length === 0) {
        return {
            yesProbability: 50,
            noProbability: 50,
            yesPrice: 0.5,
            noPrice: 0.5,
            totalVolume: 0,
            yesAmount: 0,
            noAmount: 0,
        };
    }
    const yesAmount = wagers
        .filter((w) => w.side === "yes")
        .reduce((sum, w) => sum + w.amount, 0);
    const noAmount = wagers
        .filter((w) => w.side === "no")
        .reduce((sum, w) => sum + w.amount, 0);
    const totalVolume = yesAmount + noAmount;
    const yesProbability = totalVolume > 0 ? Math.round((yesAmount / totalVolume) * 100) : 50;
    const noProbability = 100 - yesProbability;
    return {
        yesProbability,
        noProbability,
        yesPrice: totalVolume > 0 ? yesAmount / totalVolume : 0.5,
        noPrice: totalVolume > 0 ? noAmount / totalVolume : 0.5,
        totalVolume,
        yesAmount,
        noAmount,
    };
}
export function formatCredits(amount) {
    if (amount >= 1000) {
        return `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`;
    }
    return amount.toFixed(amount % 1 === 0 ? 0 : 2);
}
//# sourceMappingURL=bet-utils.js.map