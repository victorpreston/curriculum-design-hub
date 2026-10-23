import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { Role } from '@hub/shared';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './lib/auth';
import { LessonBankPage } from './pages/LessonBankPage';
import { LoginPage } from './pages/LoginPage';
import { MyPlansPage } from './pages/MyPlansPage';
import { PlanPage } from './pages/PlanPage';
import { ReviewQueuePage } from './pages/ReviewQueuePage';
import { DashboardPage } from './pages/DashboardPage';
import { HowItWorksPage } from './pages/HowItWorksPage';

function RequireSignIn({ children }: { children: ReactNode }) {
  const { user, checking } = useAuth();
  if (checking) return <p className="muted page">Checking your session…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== role) return <Navigate to="/" replace />;
  return children;
}

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to="/dashboard" replace />;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireSignIn>
                <Layout />
              </RequireSignIn>
            }
          >
            <Route index element={<HomeRedirect />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/plans"
              element={
                <RequireRole role="teacher">
                  <MyPlansPage />
                </RequireRole>
              }
            />
            <Route path="/plans/:planId" element={<PlanPage />} />
            <Route
              path="/review"
              element={
                <RequireRole role="curriculum_lead">
                  <ReviewQueuePage />
                </RequireRole>
              }
            />
            <Route path="/bank" element={<LessonBankPage />} />
            <Route path="/guide" element={<HowItWorksPage />} />
            <Route path="*" element={<HomeRedirect />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
