import './App.css';

import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import AuthPage from './pages/auth/AuthPage';
import { toast } from './methods/notify';
import FormPage from './pages/form/FormPage';

const PrivateRoute = ({ redirectPath = '/auth' }) => {
  // 检查 localStorage 中的 token
  const isAuthenticated = !!localStorage.getItem('token');

  return isAuthenticated ? <Outlet /> : <Navigate to={redirectPath} replace />;
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />

        <Route element={<PrivateRoute />}>
          <Route path="/form" element={<FormPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/form" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
