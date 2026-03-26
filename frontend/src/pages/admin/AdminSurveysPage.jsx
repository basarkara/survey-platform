import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminAPI } from '../../services/api';

export default function AdminSurveysPage() {
  const [anketler, setAnketler] = useState([]);
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
    } catch { alert('Silinemedi.'); }
  };

  const statusBadge = (anket) => {
    if (!anket.aktif) return <span className="badge badge-red">Pasif</span>;
    if (anket.bitis_tarihi && new Date() > new Date(anket.bitis_tarihi))
      return <span className="badge badge-red">Süresi Doldu</span>;
    if (anket.kota && anket.tamamlanan_katilim >= anket.kota)
      return <span className="badge badge-red">Kota Doldu</span>;
    return <span className="badge badge-green">Aktif</span>;
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">📋 Anketlerim</h1>
        <button className="btn btn-primary" onClick={() => navigate('/admin/surveys/new')}>
          + Yeni Anket
        </button>
      </div>

      {yukleniyor ? (
        <div className="spinner" />
      ) : anketler.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>📝</div>
          <h3 style={{ marginBottom: 8 }}>Henüz anket oluşturmadınız</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>İlk anketinizi oluşturmak için tıklayın</p>
          <button className="btn btn-primary" onClick={() => navigate('/admin/surveys/new')}>
            Anket Oluştur
          </button>
        </div>
      ) : (
        <div className="surveys-grid">
          {anketler.map(anket => (
            <div key={anket.id} className="card survey-card-item" onClick={() => navigate(`/admin/surveys/${anket.id}/dashboard`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                {statusBadge(anket)}
                <button
                  onClick={(e) => handleDelete(anket.id, e)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '1.1rem' }}
                  title="Sil"
                >🗑️</button>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>{anket.baslik}</h3>
              {anket.aciklama && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 12, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {anket.aciklama}
                </p>
              )}
              <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                <span>❓ {anket.sorular?.length || 0} soru</span>
                <span>👥 {anket.tamamlanan_katilim} katılım</span>
                {anket.kota && <span>🎯 Kota: {anket.kota}</span>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '10px' }}
                  onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/s/${anket.paylasim_token}`); alert('Link kopyalandı!'); }}
                >
                  🔗 Link
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px' }}
                  onClick={(e) => { e.stopPropagation(); navigate(`/admin/surveys/${anket.id}/dashboard`); }}
                >
                  📊 Dashboard
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
