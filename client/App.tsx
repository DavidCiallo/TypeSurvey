import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useEffect } from "react";
import AuthPage from "./pages/auth/AuthPage";
import VerifyPage from "./pages/auth/VerifyPage";
import FormPage from "./pages/form/FormPage";
import FormFieldPage from "./pages/field/FormFieldPage";
import FillPage from "./pages/fill/FillPage";
import HomePage from "./pages/home/HomePage";
import RecordPage from "./pages/record/RecordPage";
import SettingsPage from "./pages/settings/SettingsPage";

import { AdminLayout } from "@/client/components/admin/layout";
import { AuthStatus, clearAuthData, getAuthStatus, setUserInfo } from "./methods/auth";
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
            }
        });
    }, []);

    if (!isAuthenticated) return <Navigate to={redirectPath} replace />;
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
                    <Route element={<PrivateRoute />}>
                        <Route element={<AdminLayout />}>
                            <Route path="/form" element={<FormPage />} />
                            <Route path="/field" element={<FormFieldPage />} />
                            <Route path="/record" element={<RecordPage />} />
                            <Route path="/settings" element={<SettingsPage />} />
                        </Route>
                    </Route>
                    <Route path="*" element={<Navigate to="/home" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
};

export default App;
