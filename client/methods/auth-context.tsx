import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { isAdmin as checkIsAdmin, getRoles } from "./auth";

interface AuthContextValue {
    is_admin: boolean;
    roles: { name: string; type: string }[];
    isAdmin: () => boolean;
    hasPermission: (name: string, type: string) => boolean;
    setAuthInfo: (info: { is_admin?: number; roles?: { name: string; type: string }[] }) => void;
    resetAuth: () => void;
}

const AuthContext = createContext<AuthContextValue>({
    is_admin: false,
    roles: [],
    isAdmin: () => false,
    hasPermission: () => false,
    setAuthInfo: () => {},
    resetAuth: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAdminVal, setIsAdmin] = useState(checkIsAdmin);
    const [roles, setRoles] = useState(getRoles);

    const setAuthInfo = useCallback((info: { is_admin?: number; roles?: { name: string; type: string }[] }) => {
        if (info.is_admin !== undefined) setIsAdmin(info.is_admin === 1);
        if (info.roles) setRoles(info.roles);
    }, []);

    const resetAuth = useCallback(() => {
        setIsAdmin(false);
        setRoles([]);
    }, []);

    const value: AuthContextValue = {
        is_admin: isAdminVal,
        roles,
        isAdmin: () => isAdminVal,
        hasPermission: (name: string, type: string) => {
            if (isAdminVal) return true;
            return roles.some(r => r.name === name && r.type === type);
        },
        setAuthInfo,
        resetAuth,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}
