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

export function getUserInfo(): { email: string | null } {
    const email = localStorage.getItem("user_email");
    return { email };
}

export function setUserInfo(info: { email: string }) {
    const { email } = info;
    localStorage.setItem("user_email", email);
}

export function clearAuthData() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("expires_at");
    localStorage.removeItem("user_email");
}
