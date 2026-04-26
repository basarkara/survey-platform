import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function AdminLayout({ children }) {
  const { kullanici, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  // Aktif link kontrolü
  const isActive = (path) => {
    if (path === '/admin' && location.pathname === '/admin') return true;
    if (path !== '/admin' && location.pathname.startsWith(path)) return true;
    return false;
  };

  // Kullanıcı baş harfleri avatar için
  const initials = kullanici?.ad
    ? kullanici.ad.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'A';

  return (
    <div className="admin-layout">

      {/* ── Sidebar ── */}
      <aside className="sidebar">

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">📊</div>
          <span className="sidebar-logo-text">Anket Panel</span>
        </div>

        {/* Navigasyon */}
        <span className="sidebar-section-label">Menü</span>

        <Link
          to="/admin"
          className={`sidebar-link ${isActive('/admin') ? 'active' : ''}`}
        >
          <span className="sidebar-link-icon">📋</span>
          Anketlerim
        </Link>

        <Link
          to="/admin/surveys/new"
          className={`sidebar-link ${isActive('/admin/surveys/new') ? 'active' : ''}`}
        >
          <span className="sidebar-link-icon">✚</span>
          Yeni Anket
        </Link>

        {/* Alt kısım: kullanıcı + çıkış */}
        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{kullanici?.ad || 'Admin'}</div>
              <div className="sidebar-user-role">Yönetici</div>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-link" style={{ color: 'var(--danger-600)' }}>
            <span className="sidebar-link-icon">↩</span>
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* ── Ana İçerik ── */}
      <main className="admin-content">
        {children}
      </main>
    </div>
  );
}
