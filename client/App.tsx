import "./App.css";

import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import AuthPage from "./pages/auth/AuthPage";
import { toast } from "./methods/notify";
import FormPage from "./pages/form/FormPage";
import FormFieldPage from "./pages/field/FormFieldPage";
import FillPage from "./pages/fill/FillPage";
import HomePage from "./pages/home/HomePage";
import RecordPage from "./pages/record/RecordPage";
import { AuthStatus, getAuthStatus } from "./methods/auth";

const PrivateRoute = ({ redirectPath = "/auth" }) => {
    const isAuthenticated = getAuthStatus() == AuthStatus.AUTH;
    if (!isAuthenticated) {
        localStorage.clear();
    }
    return isAuthenticated ? <Outlet /> : <Navigate to={redirectPath} replace />;
};

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/home" element={<HomePage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/fill" element={<FillPage />} />
                <Route element={<PrivateRoute />}>
                    <Route path="/form" element={<FormPage />} />
                    <Route path="/field" element={<FormFieldPage />} />
                    <Route path="/record" element={<RecordPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
        </Router>
    );
};

export default App;
