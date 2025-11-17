import "./App.css";

import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import AuthPage from "./pages/auth/AuthPage";
import { toast } from "./methods/notify";
import FormPage from "./pages/form/FormPage";
import FormFieldPage from "./pages/form/FormFieldPage";
import FillPage from "./pages/fill/FillPage";
import HomePage from "./pages/home/HomePage";

const PrivateRoute = ({ redirectPath = "/auth" }) => {
    // 检查 localStorage 中的 token
    const isAuthenticated = !!localStorage.getItem("token");

    return isAuthenticated ? <Outlet /> : <Navigate to={redirectPath} replace />;
};

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/fill" element={<FillPage />} />
                <Route element={<PrivateRoute />}>
                    <Route path="/form" element={<FormPage />} />
                    <Route path="/field" element={<FormFieldPage />} />
                    <Route path="/home" element={<HomePage />} />
                </Route>
                <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
        </Router>
    );
};

export default App;
