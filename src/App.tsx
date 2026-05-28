import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { AuthProvider } from './auth/AuthContext';
import LoginPage from './auth/LoginPage';
import RegisterPage from './auth/RegisterPage';
import { ProtectedRoute } from './auth/ProtectedRoute';

import { Header } from './components/common/Header';
import HomePage from './pages/HomePage';
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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/account" element={<ProtectedRoute><AccountSettingsPage /></ProtectedRoute>} />
        <Route path="/scoring-configs" element={<ProtectedRoute><ScoringConfigsListPage /></ProtectedRoute>} />
        <Route path="/scoring-configs/new" element={<ProtectedRoute><ScoringConfigFormPage /></ProtectedRoute>} />
        <Route path="/scoring-configs/:id/edit" element={<ProtectedRoute><ScoringConfigFormPage /></ProtectedRoute>} />
        <Route path="/player-research" element={<ProtectedRoute><PlayerResearch /></ProtectedRoute>} />
        <Route path="/lineups" element={<ProtectedRoute><LineupsPage /></ProtectedRoute>} />
        <Route path="/lineups/new" element={<ProtectedRoute><LineupEditorPage /></ProtectedRoute>} />
        <Route path="/lineups/:id" element={<ProtectedRoute><LineupsPage /></ProtectedRoute>} />
        <Route path="/lineups/:id/edit" element={<ProtectedRoute><LineupEditorPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;
