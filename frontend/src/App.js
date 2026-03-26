import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import './index.css';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SurveyParticipantPage from './pages/SurveyParticipantPage';
import AdminSurveysPage from './pages/admin/AdminSurveysPage';
import AdminCreateSurveyPage from './pages/admin/AdminCreateSurveyPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';

// ── Route Guards ───────────────────────────────────────────────
function AdminRoute({ children }) {
  const { kullanici, yukleniyor } = useAuth();
  if (yukleniyor) return <div className="spinner" style={{ marginTop: 80 }} />;
  if (!kullanici) return <Navigate to="/login" replace />;
  if (kullanici.rol !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function GuestRoute({ children }) {
  const { kullanici, yukleniyor } = useAuth();
  if (yukleniyor) return <div className="spinner" style={{ marginTop: 80 }} />;
  if (kullanici) return <Navigate to={kullanici.rol === 'admin' ? '/admin' : '/'} replace />;
  return children;
}

function HomeRoute() {
  const { kullanici, yukleniyor } = useAuth();
  if (yukleniyor) return <div className="spinner" style={{ marginTop: 80 }} />;
  if (!kullanici) return <Navigate to="/login" replace />;
  if (kullanici.rol === 'admin') return <Navigate to="/admin" replace />;
  
  return (
    <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2>Hoş Geldiniz, {kullanici.isim || 'Kullanıcı'}! 🎉</h2>
      <p>Kayıt işleminiz başarıyla tamamlandı.</p>
      <p>Anketlere katılmak için size gönderilen özel linkleri kullanabilirsiniz.</p>
      
      <button 
        onClick={() => { 
          localStorage.clear(); 
          sessionStorage.clear(); 
          window.location.href = '/login'; 
        }}
        style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer', backgroundColor: '#ff4d4f', color: 'white', border: 'none', borderRadius: '5px' }}
      >
        Çıkış Yap
      </button>
    </div>
  );
}

// ── App Routing ────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Katılımcı - Anket Linki */}
      <Route path="/s/:token" element={<SurveyParticipantPage />} />

      {/* Auth */}
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

      {/* Admin Panel */}
      <Route path="/admin" element={<AdminRoute><AdminSurveysPage /></AdminRoute>} />
      <Route path="/admin/surveys/new" element={<AdminRoute><AdminCreateSurveyPage /></AdminRoute>} />
      <Route path="/admin/surveys/:id/dashboard" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />

      {/* Default */}
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