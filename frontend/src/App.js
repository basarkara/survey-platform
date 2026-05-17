import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import './index.css';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import SurveyParticipantPage from './pages/SurveyParticipantPage';
import AdminSurveysPage from './pages/admin/AdminSurveysPage';
import AdminCreateSurveyPage from './pages/admin/AdminCreateSurveyPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminSurveyQrPage from './pages/admin/AdminSurveyQrPage';

/* ── Route Guard: Sadece Admin ─────────────────────────────── */
function AdminRoute({ children }) {
  const { kullanici, yukleniyor } = useAuth();
  if (yukleniyor) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-base)' }}><div className="spinner" /></div>;
  if (!kullanici) return <Navigate to="/login" replace />;
  if (kullanici.rol !== 'admin') return <Navigate to="/" replace />;
  return children;
}

/* ── Route Guard: Sadece Misafir ───────────────────────────── */
function GuestRoute({ children }) {
  const { kullanici, yukleniyor } = useAuth();
  if (yukleniyor) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-base)' }}><div className="spinner" /></div>;
  if (kullanici) return <Navigate to="/" replace />;
  return children;
}

/* ── HomeRoute ─────────────────────────────────────────────── */
function HomeRoute() {
  const { kullanici, yukleniyor } = useAuth();
  if (yukleniyor) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-base)' }}><div className="spinner" /></div>;
  if (!kullanici) return <Navigate to="/login" replace />;

  return <HomePage />;
}

/* ── Router ────────────────────────────────────────────────── */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/s/:token" element={<SurveyParticipantPage />} />
      <Route path="/kiosk/:token" element={<SurveyParticipantPage kioskMode />} />
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

      <Route path="/admin" element={<AdminRoute><AdminSurveysPage /></AdminRoute>} />
      <Route path="/admin/surveys/new" element={<AdminRoute><AdminCreateSurveyPage /></AdminRoute>} />
      <Route path="/admin/surveys/:id/dashboard" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
      <Route path="/admin/surveys/:id/qr" element={<AdminRoute><AdminSurveyQrPage /></AdminRoute>} />

      {/* Default yönlendirme artık güvenli! */}
      <Route path="/" element={<HomeRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
