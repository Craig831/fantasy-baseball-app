import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Header } from './components/common/Header';
import HomePage from './pages/HomePage';
import LoginPage from './pages/Account/LoginPage';
import RegisterPage from './pages/Account/RegisterPage';
import ForgotPasswordPage from './pages/Account/ForgotPasswordPage';
import ResetPasswordPage from './pages/Account/ResetPasswordPage';
import VerifyEmailPage from './pages/Account/VerifyEmailPage';
import AccountSettingsPage from './pages/Account/AccountSettingsPage';
import ScoringConfigsListPage from './pages/ScoringConfigs/ScoringConfigsListPage';
import ScoringConfigFormPage from './pages/ScoringConfigs/ScoringConfigFormPage';
import PlayerResearch from './pages/PlayerResearch/PlayerResearchPage';
import { LineupsPage } from './pages/Lineups/LineupsPage';
import { LineupEditorPage } from './pages/Lineups/LineupEditorPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

// Routes that should NOT show the header (auth pages)
const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

function AppContent() {
  const location = useLocation();
  const showHeader = !authRoutes.includes(location.pathname);

  return (
    <>
      {showHeader && <Header />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/account" element={<AccountSettingsPage />} />
        <Route path="/scoring-configs" element={<ScoringConfigsListPage />} />
        <Route path="/scoring-configs/new" element={<ScoringConfigFormPage />} />
        <Route path="/scoring-configs/:id/edit" element={<ScoringConfigFormPage />} />
        <Route path="/player-research" element={<PlayerResearch />} />
        <Route path="/lineups" element={<LineupsPage />} />
        <Route path="/lineups/new" element={<LineupEditorPage />} />
        <Route path="/lineups/:id" element={<LineupsPage />} />
        <Route path="/lineups/:id/edit" element={<LineupEditorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;
