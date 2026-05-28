import "./App.css";

import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import AuthPage from "./pages/auth/AuthPage";
import FormPage from "./pages/form/FormPage";
import FormFieldPage from "./pages/field/FormFieldPage";
import FillPage from "./pages/fill/FillPage";
import HomePage from "./pages/home/HomePage";
import RecordPage from "./pages/record/RecordPage";
import SettingsPage from "./pages/settings/SettingsPage";
import { AuthStatus, getAuthStatus } from "./methods/auth";
import { AuthProvider } from "./methods/auth-context";

const PrivateRoute = ({ redirectPath = "/auth" }) => {
    if (getAuthStatus() !== AuthStatus.AUTH) {
        return <Navigate to={redirectPath} replace />;
    }
    return <Outlet />;
};

const App = () => {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/fill" element={<FillPage />} />
                    <Route element={<PrivateRoute />}>
                        <Route path="/form" element={<FormPage />} />
                        <Route path="/field" element={<FormFieldPage />} />
                        <Route path="/record" element={<RecordPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/home" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
};

export default App;
