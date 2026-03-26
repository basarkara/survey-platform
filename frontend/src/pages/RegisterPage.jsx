import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ad: '', eposta: '', sifre: '' });
  const [hata, setHata] = useState('');
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✍️</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Kayıt Ol</h1>
        </div>

        {hata && <div className="alert alert-error">{hata}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Adınız</label>
            <input type="text" className="form-input" placeholder="Ad Soyad"
              value={form.ad} onChange={e => setForm({ ...form, ad: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">E-posta</label>
            <input type="email" className="form-input" placeholder="ornek@mail.com"
              value={form.eposta} onChange={e => setForm({ ...form, eposta: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Şifre (en az 8 karakter)</label>
            <input type="password" className="form-input" placeholder="••••••••"
              value={form.sifre} onChange={e => setForm({ ...form, sifre: e.target.value })} required />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={yukleniyor}>
            {yukleniyor ? 'Kaydediliyor...' : 'Kayıt Ol'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Zaten hesabınız var mı?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Giriş Yap</Link>
        </p>
      </div>
    </div>
  );
}
