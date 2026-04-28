import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminAPI } from '../../services/api';

const SORU_TIPLERI = [
  { value: 'star', label: '⭐ Yıldız (1-5)' },
  { value: 'boolean', label: '✓✗ Evet / Hayır' },
  { value: 'scale', label: '📊 Ölçek (1-10)' },
  { value: 'multiple_choice', label: '☑️ Çoktan Seçmeli' },
  { value: 'multi_select', label: '✅ Birden Fazla Seçim' },
  { value: 'text', label: '📝 Açık Uçlu Metin' },
];

const secenekliSoruMu = (soruTipi) => ['multiple_choice', 'multi_select'].includes(soruTipi);

const boshSoru = () => ({
  tempId: Date.now(),
  soru_metni: '',
  soru_tipi: 'star',
  zorunlu: false,
  secenekler: [],
  yeniSecenek: '',
});

export default function AdminCreateSurveyPage() {
  const navigate = useNavigate();
  const [baslik, setBaslik] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [bitisTarihi, setBitisTarihi] = useState('');
  const [kota, setKota] = useState('');
  const [sorular, setSorular] = useState([boshSoru()]);
  const [hata, setHata] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const soruGuncelle = (idx, alan, deger) => {
    setSorular(prev => prev.map((s, i) => i === idx ? { ...s, [alan]: deger } : s));
  };

  const secenek_ekle = (idx) => {
    const soru = sorular[idx];
    if (!soru.yeniSecenek.trim()) return;
    soruGuncelle(idx, 'secenekler', [...soru.secenekler, soru.yeniSecenek.trim()]);
    soruGuncelle(idx, 'yeniSecenek', '');
  };

  const secenek_sil = (soruIdx, secIdx) => {
    setSorular(prev => prev.map((s, i) =>
      i === soruIdx ? { ...s, secenekler: s.secenekler.filter((_, si) => si !== secIdx) } : s
    ));
  };

  const soru_ekle = () => setSorular(prev => [...prev, boshSoru()]);
  const soru_sil = (idx) => { if (sorular.length > 1) setSorular(prev => prev.filter((_, i) => i !== idx)); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHata('');

    for (const s of sorular) {
      if (!s.soru_metni.trim()) { setHata('Tüm soruların metni dolu olmalıdır.'); return; }
      if (secenekliSoruMu(s.soru_tipi) && s.secenekler.length < 2) {
        setHata('Seçenekli sorular için en az 2 seçenek ekleyin.'); return;
      }
    }

    setKaydediliyor(true);
    try {
      const payload = {
        baslik,
        aciklama,
        bitis_tarihi: bitisTarihi || null,
        kota: kota ? parseInt(kota) : null,
        sorular: sorular.map((s, idx) => ({
          soru_metni: s.soru_metni,
          soru_tipi: s.soru_tipi,
          zorunlu: s.zorunlu,
          sira_no: idx + 1,
          secenekler: secenekliSoruMu(s.soru_tipi) ? s.secenekler : null,
        })),
      };
      const res = await adminAPI.createSurvey(payload);
      navigate(`/admin/surveys/${res.data.anket.id}/dashboard`);
    } catch (err) {
      setHata(err.response?.data?.error || 'Anket oluşturulamadı.');
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">➕ Yeni Anket Oluştur</h1>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => navigate('/')}
        >
          Anasayfa'ya Dön
        </button>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}

      <form onSubmit={handleSubmit}>
        {/* Anket Genel Bilgiler */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontWeight: 700, marginBottom: 20 }}>📋 Anket Bilgileri</h2>
          <div className="form-group">
            <label className="form-label">Başlık *</label>
            <input type="text" className="form-input" placeholder="Anket başlığı"
              value={baslik} onChange={e => setBaslik(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Açıklama</label>
            <textarea className="form-input" placeholder="Anket hakkında kısa bilgi..."
              value={aciklama} onChange={e => setAciklama(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Bitiş Tarihi (opsiyonel)</label>
              <input type="datetime-local" className="form-input"
                value={bitisTarihi} onChange={e => setBitisTarihi(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Kota (opsiyonel)</label>
              <input type="number" className="form-input" placeholder="Örn: 100" min={1}
                value={kota} onChange={e => setKota(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Soru Listesi */}
        {sorular.map((soru, idx) => (
          <div className="card" key={soru.tempId} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700 }}>Soru {idx + 1}</h3>
              {sorular.length > 1 && (
                <button type="button" className="btn btn-danger" style={{ padding: '8px 16px', minHeight: 'auto' }}
                  onClick={() => soru_sil(idx)}>Sil</button>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Soru Metni *</label>
              <input type="text" className="form-input" placeholder="Soruyu buraya yazın..."
                value={soru.soru_metni} onChange={e => soruGuncelle(idx, 'soru_metni', e.target.value)} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Soru Tipi</label>
                <select className="form-input" value={soru.soru_tipi}
                  onChange={e => soruGuncelle(idx, 'soru_tipi', e.target.value)}>
                  {SORU_TIPLERI.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 28 }}>
                <input type="checkbox" id={`zorunlu-${idx}`} checked={soru.zorunlu}
                  onChange={e => soruGuncelle(idx, 'zorunlu', e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} />
                <label htmlFor={`zorunlu-${idx}`} style={{ fontWeight: 600, cursor: 'pointer' }}>Zorunlu soru</label>
              </div>
            </div>

            {/* Seçenekli soru seçenekleri */}
            {secenekliSoruMu(soru.soru_tipi) && (
              <div>
                <label className="form-label">Seçenekler (en az 2)</label>
                <div className="choice-list" style={{ marginBottom: 12 }}>
                  {soru.secenekler.map((opt, si) => (
                    <div key={si} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="choice-item" style={{ flex: 1, cursor: 'default' }}>{opt}</span>
                      <button type="button" onClick={() => secenek_sil(idx, si)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '1.2rem' }}>✕</button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" className="form-input" placeholder="Seçenek ekle..."
                    value={soru.yeniSecenek}
                    onChange={e => soruGuncelle(idx, 'yeniSecenek', e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); secenek_ekle(idx); } }} />
                  <button type="button" className="btn btn-outline" style={{ whiteSpace: 'nowrap' }}
                    onClick={() => secenek_ekle(idx)}>+ Ekle</button>
                </div>
              </div>
            )}
          </div>
        ))}

        <button type="button" className="btn btn-outline btn-full" style={{ marginBottom: 24 }}
          onClick={soru_ekle}>+ Soru Ekle</button>

        <div style={{ display: 'flex', gap: 16 }}>
          <button type="button" className="btn btn-outline" style={{ flex: 1 }}
            onClick={() => navigate('/admin')}>İptal</button>
          <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={kaydediliyor}>
            {kaydediliyor ? 'Kaydediliyor...' : '✓ Anketi Oluştur'}
          </button>
        </div>
      </form>
    </AdminLayout>
  );
}
