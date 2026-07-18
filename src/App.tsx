import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppShell from "./components/AppShell";
import Login from "./pages/Login";
import PortfolioOverview from "./pages/PortfolioOverview";
import SourceDocuments from "./pages/SourceDocuments";
import AIReasoning from "./pages/AIReasoning";
import LeakDetail from "./pages/LeakDetail";
import RecoveryAction from "./pages/RecoveryAction";
import { isAuthenticated } from "./lib/auth";

export default function App() {
  const location = useLocation();
  const authed = isAuthenticated();

  if (location.pathname === "/login") {
    return authed ? <Navigate to="/" replace /> : <Login />;
  }

  if (!authed) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <div key={location.pathname} className="fade-in">
        <Routes>
          <Route path="/" element={<PortfolioOverview />} />
          <Route path="/documents" element={<SourceDocuments />} />
          <Route path="/reasoning" element={<AIReasoning />} />
          <Route path="/detail" element={<LeakDetail />} />
          <Route path="/recovery" element={<RecoveryAction />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AppShell>
  );
}
