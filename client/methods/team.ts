import { TeamBrief } from "../../shared/modules/team/team.entity";

const CURRENT_KEY = "team_id";
const LIST_KEY = "user_teams";
const FORM_KEY = "formname";

/**
 * Where an invite code is parked when /join is opened while logged out, so it
 * can be redeemed once the login round-trip finishes. Deliberately not cleared
 * by clearAuthData: logging in is exactly when it is needed.
 */
export const PENDING_INVITE_KEY = "pending_invite";

export function getTeams(): TeamBrief[] {
    const raw = localStorage.getItem(LIST_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/**
 * Remembers which teams the account can act in, and keeps the current selection
 * pointing at one of them. That matters: a stale team_id is sent with every
 * request, and the server would reject each one as a team the caller is not in.
 */
export function setTeams(teams: TeamBrief[]) {
    localStorage.setItem(LIST_KEY, JSON.stringify(teams));
    const usable = teams.filter((t) => !t.deleted);
    const current = getCurrentTeamId();
    if (!usable.some((t) => t.id === current)) {
        setCurrentTeamId(usable.length ? usable[0].id : "");
    }
}

export function getCurrentTeamId(): string {
    return localStorage.getItem(CURRENT_KEY) || "";
}

export function getCurrentTeam(): TeamBrief | null {
    const id = getCurrentTeamId();
    return getTeams().find((t) => t.id === id) || null;
}

/**
 * Switching team changes what every form name means, so the remembered form
 * selection goes with it — otherwise the next page would try to open a form
 * name that only existed in the team we just left.
 */
export function setCurrentTeamId(id: string) {
    if (id) {
        localStorage.setItem(CURRENT_KEY, id);
    } else {
        localStorage.removeItem(CURRENT_KEY);
    }
    localStorage.removeItem(FORM_KEY);
}

export function clearTeam() {
    localStorage.removeItem(CURRENT_KEY);
    localStorage.removeItem(LIST_KEY);
    localStorage.removeItem(FORM_KEY);
}
