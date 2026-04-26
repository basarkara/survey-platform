import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm]           = useState({ ad: '', eposta: '', sifre: '' });
  const [hata, setHata]           = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHata('');
    if (form.sifre.length < 8) {
      setHata('Şifre en az 8 karakter olmalıdır.');
      return;
    }
    setYukleniyor(true);
    try {
      await authAPI.register(form);
      navigate('/login', { state: { mesaj: 'Kayıt başarılı! Giriş yapabilirsiniz.' } });
    } catch (err) {
      setHata(err.response?.data?.error || 'Kayıt başarısız.');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">

        <div className="auth-logo">
          <div className="auth-logo-icon">📊</div>
          <span className="auth-logo-text">Anket Platform</span>
        </div>

        <h1 className="auth-heading">Hesap oluşturun</h1>
        <p className="auth-subheading">Birkaç adımda ankete katılmaya hazır olun.</p>

        {hata && <div className="alert alert-error">{hata}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Adınız Soyadınız</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ad Soyad"
              value={form.ad}
              onChange={e => setForm({ ...form, ad: e.target.value })}
              required
              autoComplete="name"
            />
          </div>

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
              placeholder="En az 8 karakter"
              value={form.sifre}
              onChange={e => setForm({ ...form, sifre: e.target.value })}
              required
              autoComplete="new-password"
            />
            <span className="form-hint">En az 8 karakter kullanınız.</span>
          </div>

          <button
            type="submit"
            className={`btn btn-primary btn-pill btn-full ${yukleniyor ? 'btn-loading' : ''}`}
            disabled={yukleniyor}
          >
            <span>{yukleniyor ? 'Kaydediliyor...' : 'Hesap Oluştur'}</span>
          </button>
        </form>

        <div className="auth-footer">
          Zaten hesabınız var mı?{' '}
          <Link to="/login">Giriş yapın</Link>
        </div>
      </div>
    </div>
  );
}
