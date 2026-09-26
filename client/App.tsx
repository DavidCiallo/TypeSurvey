import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useEffect } from "react";
import AuthPage from "./pages/auth/AuthPage";
import VerifyPage from "./pages/auth/VerifyPage";
import FormPage from "./pages/form/FormPage";
import FormFieldPage from "./pages/field/FormFieldPage";
import FillPage from "./pages/fill/FillPage";
import HomePage from "./pages/home/HomePage";
import JoinPage from "./pages/join/JoinPage";
import OnboardingPage from "./pages/onboarding/OnboardingPage";
import RecordPage from "./pages/record/RecordPage";
import SettingsPage from "./pages/settings/SettingsPage";
import TeamPage from "./pages/team/TeamPage";

import { AdminLayout } from "@/client/components/admin/layout";
import { AuthStatus, clearAuthData, getAuthStatus, setUserInfo } from "./methods/auth";
import { getTeams, setTeams } from "./methods/team";
import { AuthProvider, useAuth } from "./methods/auth-context";
import { AuthRouter } from "./api/instance";

const PrivateRoute = ({ redirectPath = "/auth" }) => {
    const isAuthenticated = getAuthStatus() == AuthStatus.AUTH;
    const { setAuthInfo, resetAuth } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) {
            clearAuthData();
            resetAuth();
            return;
        }
        AuthRouter.alive({}).then(({ success, data }: any) => {
            if (!success) {
                clearAuthData();
                resetAuth();
            } else if (data) {
                setUserInfo({ email: localStorage.getItem("user_email") || "", is_admin: data.is_admin, roles: data.roles });
                setAuthInfo({ is_admin: data.is_admin, roles: data.roles });
                // Re-read on every load so a membership change made on the server
                // (removed from a team, team deleted) is picked up here instead of
                // waiting for the next login.
                if (data.teams) setTeams(data.teams);
            }
        });
    }, []);

    if (!isAuthenticated) return <Navigate to={redirectPath} replace />;
    return <Outlet />;
};

/**
 * A team owns every form, so an account that has none has nothing to show and no
 * route it is allowed to call. This is what makes "create or join a team" the
 * first thing a new account meets, rather than a wall of failed requests.
 */
const TeamGate = () => {
    if (getTeams().length === 0) return <Navigate to="/onboarding" replace />;
    return <Outlet />;
};

const App = () => {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/verify" element={<VerifyPage />} />
                    <Route path="/fill" element={<FillPage />} />
                    {/* Outside PrivateRoute on purpose: an invite link usually
                        arrives while logged out, and JoinPage keeps the code
                        across the login round-trip. */}
                    <Route path="/join" element={<JoinPage />} />
                    <Route element={<PrivateRoute />}>
                        <Route path="/onboarding" element={<OnboardingPage />} />
                        <Route element={<TeamGate />}>
                            <Route element={<AdminLayout />}>
                                <Route path="/form" element={<FormPage />} />
                                <Route path="/field" element={<FormFieldPage />} />
                                <Route path="/record" element={<RecordPage />} />
                                <Route path="/team" element={<TeamPage />} />
                                <Route path="/settings" element={<SettingsPage />} />
                            </Route>
                        </Route>
                    </Route>
                    <Route path="*" element={<Navigate to="/home" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
};

export default App;
