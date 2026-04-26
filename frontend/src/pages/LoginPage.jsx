import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]           = useState({ eposta: '', sifre: '' });
  const [hata, setHata]           = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHata('');
    setYukleniyor(true);
    try {
      const kullanici = await login(form.eposta, form.sifre);
      navigate(kullanici.rol === 'admin' ? '/admin' : '/');
    } catch (err) {
      setHata(err.response?.data?.error || 'E-posta veya şifre hatalı.');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">📊</div>
          <span className="auth-logo-text">Anket Platform</span>
        </div>

        {/* Başlık */}
        <h1 className="auth-heading">Tekrar hoş geldiniz</h1>
        <p className="auth-subheading">Hesabınıza giriş yaparak devam edin.</p>

        {/* Hata */}
        {hata && <div className="alert alert-error">{hata}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">E-posta adresi</label>
            <input
              type="email"
              className="form-input"
              placeholder="ornek@mail.com"
              value={form.eposta}
              onChange={e => setForm({ ...form, eposta: e.target.value })}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Şifre</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={form.sifre}
              onChange={e => setForm({ ...form, sifre: e.target.value })}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className={`btn btn-primary btn-pill btn-full ${yukleniyor ? 'btn-loading' : ''}`}
            disabled={yukleniyor}
          >
            <span>{yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}</span>
          </button>
        </form>

        {/* Alt bağlantı */}
        <div className="auth-footer">
          Hesabınız yok mu?{' '}
          <Link to="/register">Kayıt olun</Link>
        </div>
      </div>
    </div>
  );
}
