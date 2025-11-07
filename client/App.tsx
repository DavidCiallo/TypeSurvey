import './App.css';

import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import StrategyPage from './pages/strategy/StrategyPage';
import InboxPage from './pages/inbox/InboxPage';
import AuthPage from './pages/auth/AuthPage';
import SenderPage from './pages/send/SendPage';
import { autoRecordLive } from './methods/status';
import { toast } from './methods/notify';

const PrivateRoute = ({ redirectPath = '/auth' }) => {
  // 检查 localStorage 中的 token
  const isAuthenticated = !!localStorage.getItem('token');

  return isAuthenticated ? <Outlet /> : <Navigate to={redirectPath} replace />;
};

const App = () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("code") == "444") {
    // if (["WindowsWechat", "wxwork"].some(i => navigator.userAgent.includes(i))) {
    localStorage.setItem("isWeCom", "1");
    toast({
      title: "您处于企业微信环境",
      color: "success"
    });
    if (!localStorage.getItem("wecom_name")) {
      localStorage.removeItem("token");
    }
    // }
  }
  autoRecordLive();
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />

        <Route element={<PrivateRoute />}>
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/strategy" element={<StrategyPage />} />
          <Route path="/send" element={<SenderPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/inbox" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
