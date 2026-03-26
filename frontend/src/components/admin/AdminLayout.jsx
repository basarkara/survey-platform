import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function AdminLayout({ children }) {
  const { kullanici, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  const isActive = (path) => location.pathname.startsWith(path) ? 'sidebar-link active' : 'sidebar-link';

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">📊 Anket Panel</div>
        <Link to="/admin" className={isActive('/admin/surveys') || location.pathname === '/admin' ? 'sidebar-link active' : 'sidebar-link'}>
          📋 Anketlerim
        </Link>
        <Link to="/admin/surveys/new" className={isActive('/admin/surveys/new') ? 'sidebar-link active' : 'sidebar-link'}>
          ➕ Yeni Anket
        </Link>
        <div style={{ flex: 1 }} />
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16, marginTop: 16 }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', padding: '0 12px', marginBottom: 8 }}>
            {kullanici?.ad}
          </p>
          <button onClick={handleLogout} className="sidebar-link" style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
            🚪 Çıkış Yap
          </button>
        </div>
      </aside>
      <main className="admin-content">{children}</main>
    </div>
  );
}
