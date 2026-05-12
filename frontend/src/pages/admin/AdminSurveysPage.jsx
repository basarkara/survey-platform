import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminAPI } from '../../services/api';

export default function AdminSurveysPage() {
  const [anketler, setAnketler]   = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    adminAPI.getSurveys()
      .then(res => setAnketler(res.data.anketler))
      .catch(console.error)
      .finally(() => setYukleniyor(false));
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Bu anketi silmek istediğinize emin misiniz?')) return;
    try {
      await adminAPI.deleteSurvey(id);
      setAnketler(anketler.filter(a => a.id !== id));
    } catch { alert('Anket silinemedi.'); }
  };

  const statusBadge = (anket) => {
    if (!anket.aktif) return <span className="badge badge-muted">Pasif</span>;
    if (anket.bitis_tarihi && new Date() > new Date(anket.bitis_tarihi))
      return <span className="badge badge-danger badge-dot">Süresi Doldu</span>;
    if (anket.kota && anket.tamamlanan_katilim >= anket.kota)
      return <span className="badge badge-warning badge-dot">Kota Doldu</span>;
    return <span className="badge badge-success badge-dot">Aktif</span>;
  };

  const copyLink = (token, e) => {
    e.stopPropagation();
    const link = `${window.location.origin}/s/${token}`;
    navigator.clipboard.writeText(link);
    /* Basit feedback: buton metni değişir */
  };

  const copyCode = (token, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(token);
  };

  const openKioskMode = (token, e) => {
    e.stopPropagation();
    navigate(`/kiosk/${token}`);
  };

  const exportResponses = async (anket, e) => {
    e.stopPropagation();
    try {
      const res = await adminAPI.exportResponses(anket.id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${slugify(anket.baslik || `anket-${anket.id}`)}-cevaplar.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(await getExportErrorMessage(err));
    }
  };

  const duplicateSurvey = async (anket, e) => {
    e.stopPropagation();
    const yeniAd = window.prompt('Yeni anket adını giriniz:', `${anket.baslik} - Kopya`);
    if (yeniAd === null) return;

    const baslik = yeniAd.trim();
    if (!baslik) {
      alert('Yeni anket adı boş olamaz.');
      return;
    }

    try {
      const res = await adminAPI.duplicateSurvey(anket.id, { baslik });
      setAnketler(prev => [res.data.anket, ...prev]);
      navigate(`/admin/surveys/${res.data.anket.id}/dashboard`);
    } catch (err) {
      alert(err.response?.data?.error || 'Anket çoğaltılamadı.');
    }
  };

  return (
    <AdminLayout>

      {/* Sayfa başlığı */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Anketlerim</h1>
          <p className="page-subtitle">Oluşturduğunuz tüm anketleri buradan yönetin.</p>
        </div>
        <button className="btn btn-primary btn-pill" onClick={() => navigate('/admin/surveys/new')}>
          ✚ Yeni Anket Oluştur
        </button>
      </div>

      {/* İçerik */}
      {yukleniyor ? (
        <div className="spinner" />
      ) : anketler.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <h3 className="empty-state-title">Henüz anket yok</h3>
            <p className="empty-state-desc">İlk anketinizi oluşturarak veri toplamaya başlayın.</p>
            <button className="btn btn-primary btn-pill" onClick={() => navigate('/admin/surveys/new')}>
              ✚ İlk Anketi Oluştur
            </button>
          </div>
        </div>
      ) : (
        <div className="surveys-grid">
          {anketler.map(anket => (
            <div
              key={anket.id}
              className="survey-card"
              onClick={() => navigate(`/admin/surveys/${anket.id}/dashboard`)}
            >
              {/* Kart üst kısım */}
              <div className="survey-card-header">
                {statusBadge(anket)}
                <button
                  className="btn btn-icon btn-ghost btn-sm"
                  onClick={e => handleDelete(anket.id, e)}
                  title="Sil"
                  style={{ color: 'var(--danger-400)' }}
                >🗑</button>
              </div>

              {/* Başlık & açıklama */}
              <div>
                <div className="survey-card-title">{anket.baslik}</div>
              {anket.aciklama && (
                <p className="survey-card-desc" style={{ marginTop: 6 }}>{anket.aciklama}</p>
              )}
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg)', borderRadius: 8 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>
                  Anket Kodu
                </div>
                <code style={{ fontSize: '0.78rem', wordBreak: 'break-all' }}>{anket.paylasim_token}</code>
              </div>
            </div>

              {/* İstatistikler */}
              <div className="survey-card-stats">
                <div className="survey-stat">
                  <span className="survey-stat-value">{anket.tamamlanan_katilim ?? 0}</span>
                  <span className="survey-stat-label">Katılım</span>
                </div>
                <div className="survey-stat">
                  <span className="survey-stat-value">{anket.sorular?.length ?? 0}</span>
                  <span className="survey-stat-label">Soru</span>
                </div>
                {anket.kota && (
                  <div className="survey-stat">
                    <span className="survey-stat-value">{anket.kota}</span>
                    <span className="survey-stat-label">Kota</span>
                  </div>
                )}
              </div>

              {/* Eylem butonları */}
              <div className="survey-card-actions">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={e => copyLink(anket.paylasim_token, e)}
                >
                  🔗 Linki Kopyala
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={e => copyCode(anket.paylasim_token, e)}
                >
                  # Kodu Kopyala
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={e => { e.stopPropagation(); navigate(`/admin/surveys/${anket.id}/dashboard`); }}
                >
                  📊 Dashboard
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={e => { e.stopPropagation(); navigate(`/admin/surveys/${anket.id}/qr`); }}
                >
                  QR Kod Oluştur
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={e => openKioskMode(anket.paylasim_token, e)}
                >
                  🖥 Kiosk Modu
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={e => duplicateSurvey(anket, e)}
                >
                  ⧉ Bu Anketi Çoğalt
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={e => exportResponses(anket, e)}
                >
                  ⬇ Cevapları Dışa Aktar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'anket';
}

async function getExportErrorMessage(err) {
  const fallback = 'Cevaplar dışa aktarılamadı.';
  const data = err.response?.data;

  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text);
      return parsed.error || fallback;
    } catch {
      return fallback;
    }
  }

  return data?.error || fallback;
}
