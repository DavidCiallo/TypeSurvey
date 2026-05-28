export enum AuthStatus {
    AUTH,
    NO_AUTH,
    AUTH_EXPIRED,
}

export function getAuthStatus(): AuthStatus {
    const token = localStorage.getItem("access_token");
    const expiresAt = localStorage.getItem("expires_at");
    if (!token || !expiresAt) {
        return AuthStatus.NO_AUTH;
    }
    if (expiresAt && parseInt(expiresAt) <= Date.now()) {
        return AuthStatus.AUTH_EXPIRED;
    }
    if (token && expiresAt && parseInt(expiresAt) > Date.now()) {
        return AuthStatus.AUTH;
    }
    return AuthStatus.NO_AUTH;
}

export function setAuthStatus(status: { access_token: string; expires_in: number }) {
    const { access_token, expires_in } = status;
    localStorage.setItem("access_token", access_token);
    const expires_at = Date.now() + expires_in * 1000;
    localStorage.setItem("expires_at", expires_at.toString());
}

export function getUserInfo(): { email: string | null; is_admin?: number; roles?: { name: string; type: string }[] } {
    const email = localStorage.getItem("user_email");
    const isAdmin = localStorage.getItem("user_is_admin");
    const rolesRaw = localStorage.getItem("user_roles");
    let roles: { name: string; type: string }[] | undefined;
    if (rolesRaw) {
        try { roles = JSON.parse(rolesRaw); } catch { roles = undefined; }
    }
    return { email, is_admin: isAdmin ? Number(isAdmin) : undefined, roles };
}

export function setUserInfo(info: { email: string; is_admin?: number; roles?: { name: string; type: string }[] }) {
    const { email, is_admin, roles } = info;
    localStorage.setItem("user_email", email);
    if (is_admin !== undefined) localStorage.setItem("user_is_admin", String(is_admin));
    if (roles && roles.length > 0) localStorage.setItem("user_roles", JSON.stringify(roles));
}

export function isAdmin(): boolean {
    return localStorage.getItem("user_is_admin") === "1";
}

export function getRoles(): { name: string; type: string }[] {
    const raw = localStorage.getItem("user_roles");
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function hasPermission(name: string, type: string): boolean {
    if (isAdmin()) return true;
    const roles = getRoles();
    return roles.some(r => r.name === name && r.type === type);
}

export function clearAuthData() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("expires_at");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_is_admin");
    localStorage.removeItem("user_roles");
}
