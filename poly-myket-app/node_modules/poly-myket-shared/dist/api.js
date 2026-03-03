let apiUrl = "http://localhost:6767";
export function setApiUrl(url) {
    apiUrl = url;
}
export class ApiClientError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
        this.name = "ApiClientError";
    }
}
let tokenGetter = null;
export function setTokenGetter(getter) {
    tokenGetter = getter;
}
async function request(path, options = {}) {
    var _a;
    const token = tokenGetter ? await tokenGetter() : null;
    const headers = Object.assign({ "Content-Type": "application/json" }, ((_a = options.headers) !== null && _a !== void 0 ? _a : {}));
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${apiUrl}${path}`, Object.assign(Object.assign({}, options), { headers }));
    if (!res.ok) {
        const body = await res.text();
        throw new ApiClientError(res.status, body);
    }
    if (res.status === 204)
        return undefined;
    return res.json();
}
export const api = {
    // Users
    getMe: () => request("/users/me"),
    getMyProfile: () => request("/users/me/profile"),
    updateMe: (data) => request("/users/me", {
        method: "PATCH",
        body: JSON.stringify(data),
    }),
    updateEmailPreferences: (data) => request("/users/me", {
        method: "PATCH",
        body: JSON.stringify(data),
    }),
    // Groups
    getGroups: () => request("/groups"),
    createGroup: (data) => request("/groups", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    joinGroup: (data) => request("/groups/join", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    getGroup: (id) => request(`/groups/${id}`),
    // Bets
    getBets: (groupId) => request(`/groups/${groupId}/bets`),
    getBet: (betId) => request(`/bets/${betId}`),
    createBet: (groupId, data) => request(`/groups/${groupId}/bets`, {
        method: "POST",
        body: JSON.stringify(data),
    }),
    resolveBet: (betId, data) => request(`/bets/${betId}/resolve`, {
        method: "POST",
        body: JSON.stringify(data),
    }),
    // Wagers
    placeWager: (betId, data) => request(`/bets/${betId}/wagers`, {
        method: "POST",
        body: JSON.stringify(data),
    }),
    // Admin
    adjustCredits: (groupId, data) => request(`/groups/${groupId}/adjust-credits`, {
        method: "POST",
        body: JSON.stringify(data),
    }),
    getCreditAdjustments: (groupId) => request(`/groups/${groupId}/credit-adjustments`),
    promoteMember: (groupId, data) => request(`/groups/${groupId}/promote`, {
        method: "POST",
        body: JSON.stringify(data),
    }),
    cancelBet: (betId) => request(`/bets/${betId}/cancel`, {
        method: "POST",
    }),
};
//# sourceMappingURL=api.js.map