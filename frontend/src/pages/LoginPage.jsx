import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ eposta: '', sifre: '' });
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHata('');
    setYukleniyor(true);
    try {
      const kullanici = await login(form.eposta, form.sifre);
      navigate(kullanici.rol === 'admin' ? '/admin' : '/');
    } catch (err) {
      setHata(err.response?.data?.error || 'Giriş başarısız.');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📊</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Anket Platformu</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Hesabınıza giriş yapın</p>
        </div>

        {hata && <div className="alert alert-error">{hata}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">E-posta</label>
            <input
              type="email"
              className="form-input"
              placeholder="ornek@mail.com"
              value={form.eposta}
              onChange={e => setForm({ ...form, eposta: e.target.value })}
              required
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
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={yukleniyor}>
            {yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Hesabınız yok mu?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Kayıt Ol</Link>
        </p>
      </div>
    </div>
  );
}
