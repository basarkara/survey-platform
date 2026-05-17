import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pie, Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Filler,
} from 'chart.js';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminAPI } from '../../services/api';
import CrossTabSelector from '../../components/analytics/CrossTabSelector';
import CrossTabTable from '../../components/analytics/CrossTabTable';
import RelationshipInsightCard from '../../components/analytics/RelationshipInsightCard';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, Title, Filler);

const RENKLER = ['#6C63FF', '#FF6584', '#43C59E', '#FFB347', '#4ECDC4', '#A8E6CF', '#FF8B94', '#B4A7D6'];

function formatGunEtiketi(tarih) {
  return new Date(tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function SecenekTrendGrafik({ trend }) {
  if (!trend?.seriler?.length || !trend?.gunler?.length) return null;

  const data = {
    labels: trend.gunler.map(gun => formatGunEtiketi(gun.tarih)),
    datasets: trend.seriler.map((seri, index) => ({
      label: `${seri.secenek} (%)`,
      data: seri.oranlar,
      borderColor: RENKLER[index % RENKLER.length],
      backgroundColor: `${RENKLER[index % RENKLER.length]}22`,
      tension: 0.35,
      pointRadius: 3,
      borderWidth: 2,
    })),
  };

  return (
    <div style={{ marginTop: 22 }}>
      <h4 style={{ fontSize: '0.92rem', fontWeight: 800, marginBottom: 6 }}>
        Zaman İçinde Seçilme Oranı
      </h4>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 12 }}>
        Her gün için seçeneklerin o gün cevap verenler içindeki yüzdesi.
      </p>
      <Line
        data={data}
        options={{
          responsive: true,
          plugins: { legend: { position: 'bottom' } },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: { callback: value => `${value}%` },
            },
          },
        }}
      />
    </div>
  );
}

// ── Soru istatistik bileşeni ───────────────────────────────────
function SoruGrafik({ istat }) {
  if (!istat.istatistik || Object.keys(istat.istatistik).length === 0)
    return <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Henüz cevap yok.</p>;

  const { soru_tipi, istatistik, toplam_cevap } = istat;

  if (soru_tipi === 'star' || soru_tipi === 'scale') {
    const dagilim = istatistik.dagilim || {};
    const labels = Object.keys(dagilim).sort((a, b) => Number(a) - Number(b));
    return (
      <div>
        <p style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 8 }}>
          ⭐ {istatistik.ortalama} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>ortalama</span>
        </p>
        <Bar
          data={{
            labels,
            datasets: [{ label: 'Kişi Sayısı', data: labels.map(l => dagilim[l]), backgroundColor: 'rgba(108,99,255,0.7)', borderRadius: 6 }],
          }}
          options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }}
        />
      </div>
    );
  }

  if (soru_tipi === 'boolean') {
    return (
      <>
        <Pie
          data={{
            labels: ['Evet', 'Hayır'],
            datasets: [{ data: [istatistik.evet, istatistik.hayir], backgroundColor: ['#43C59E', '#FF6584'], borderWidth: 2 }],
          }}
          options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }}
        />
        <SecenekTrendGrafik trend={istat.zaman_trendi} />
      </>
    );
  }

  if (soru_tipi === 'multiple_choice' || soru_tipi === 'multi_select') {
    const items = istatistik.dagilim || [];
    return (
      <>
        <Pie
          data={{
            labels: items.map(i => `${i.secenek} (${i.yuzde}%)`),
            datasets: [{ data: items.map(i => i.sayi), backgroundColor: RENKLER, borderWidth: 2 }],
          }}
          options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }}
        />
        <SecenekTrendGrafik trend={istat.zaman_trendi} />
      </>
    );
  }

  if (soru_tipi === 'text') {
    return (
      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {(istatistik.cevaplar || []).map((c, i) => (
          <div key={i} style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, marginBottom: 6, fontSize: '0.9rem' }}>
            "{c}"
          </div>
        ))}
      </div>
    );
  }

  return null;
}

// ── Ana Sayfa ──────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [sonGuncelleme, setSonGuncelleme] = useState(null);
  const [rowQuestionId, setRowQuestionId] = useState('');
  const [columnQuestionId, setColumnQuestionId] = useState('');
  const [crossTabResult, setCrossTabResult] = useState(null);
  const [crossTabError, setCrossTabError] = useState('');
  const [crossTabLoading, setCrossTabLoading] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const res = await adminAPI.getDashboard(id);
      setData(res.data);
      setSonGuncelleme(new Date().toLocaleTimeString('tr-TR'));
    } catch (err) {
      if (err.response?.status === 404) navigate('/admin');
    } finally {
      setYukleniyor(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    yukle();
    // 30 saniyede bir polling
    const interval = setInterval(yukle, 30000);
    return () => clearInterval(interval);
  }, [yukle]);

  if (yukleniyor) return <AdminLayout><div className="spinner" /></AdminLayout>;
  if (!data) return null;

  const { anket, ozet, soru_istatistikleri, zaman_serisi } = data;

  const toplamYayinGunu = zaman_serisi.length;
  const aktifKatilimGunu = zaman_serisi.filter(z => Number(z.katilim_sayisi) > 0).length;

  // Çizgi grafik verisi (anketin yayında kaldığı süre)
  const lineData = {
    labels: zaman_serisi.map(z => formatGunEtiketi(z.tarih)),
    datasets: [{
      label: 'Günlük Katılım',
      data: zaman_serisi.map(z => Number(z.katilim_sayisi)),
      borderColor: '#6C63FF',
      backgroundColor: 'rgba(108,99,255,0.1)',
      tension: 0.4, fill: true, pointRadius: 4,
    }],
  };

  const paylasimLinki = `${window.location.origin}/s/${anket.paylasim_token}`;
  const anketKodu = anket.paylasim_token;

  const exportResponses = async () => {
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

  const analyzeCrossTab = async () => {
    setCrossTabError('');
    setCrossTabResult(null);

    if (!rowQuestionId || !columnQuestionId) {
      setCrossTabError('Lütfen satır ve sütun sorularını seçin.');
      return;
    }

    if (rowQuestionId === columnQuestionId) {
      setCrossTabError('Aynı soru iki kez seçilemez. Lütfen iki farklı soru seçin.');
      return;
    }

    setCrossTabLoading(true);
    try {
      const res = await adminAPI.getCrossTabAnalysis(anket.id, rowQuestionId, columnQuestionId);
      setCrossTabResult(res.data);
    } catch (err) {
      setCrossTabError(err.response?.data?.error || 'İlişki analizi oluşturulamadı.');
    } finally {
      setCrossTabLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">{anket.baslik}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
            Son güncelleme: {sonGuncelleme} (30sn'de bir otomatik yenilenir)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={yukle}>🔄 Yenile</button>
          <button className="btn btn-outline" onClick={() => { navigator.clipboard.writeText(paylasimLinki); alert('Link kopyalandı!'); }}>
            🔗 Link Kopyala
          </button>
          <button className="btn btn-outline" onClick={() => { navigator.clipboard.writeText(anketKodu); alert('Anket kodu kopyalandı!'); }}>
            # Kod Kopyala
          </button>
          <button className="btn btn-outline" onClick={() => navigate(`/kiosk/${anket.paylasim_token}`)}>
            🖥 Kiosk Modu
          </button>
          <button className="btn btn-outline" onClick={() => navigate(`/admin/surveys/${anket.id}/qr`)}>
            QR Kod Oluştur
          </button>
          <button className="btn btn-primary" onClick={exportResponses}>
            ⬇ Cevapları Dışa Aktar
          </button>
        </div>
      </div>

      {/* Durum Bilgileri */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className={`badge ${anket.aktif ? 'badge-green' : 'badge-red'}`}>
          {anket.aktif ? '● Aktif' : '● Pasif'}
        </span>
        {anket.bitis_tarihi && (
          <span className="badge badge-purple">
            ⏰ Bitiş: {new Date(anket.bitis_tarihi).toLocaleString('tr-TR')}
          </span>
        )}
        {anket.kota && (
          <span className="badge badge-purple">🎯 Kota: {ozet.toplam_katilim}/{anket.kota}</span>
        )}
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, marginBottom: 10 }}>Anket Kodu</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 12 }}>
          Katılımcılar bu kodu anasayfadaki "Ankete Katıl" alanına girerek ankete ulaşabilir.
        </p>
        <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 20px', fontFamily: 'monospace', fontSize: '0.9rem', wordBreak: 'break-all' }}>
          {anketKodu}
        </div>
      </div>

      {/* Özet İstatistik Kutuları */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-number">{ozet.toplam_katilim}</div>
          <div className="stat-label">Tamamlanan Katılım</div>
        </div>
        {anket.kota && (
          <div className="stat-box">
            <div className="stat-number">{ozet.kota_doluluk}%</div>
            <div className="stat-label">Kota Doluluk</div>
          </div>
        )}
        <div className="stat-box">
          <div className="stat-number">{soru_istatistikleri.length}</div>
          <div className="stat-label">Toplam Soru</div>
        </div>
        <div className="stat-box">
          <div className="stat-number">{aktifKatilimGunu}</div>
          <div className="stat-label">Katılım Olan Gün</div>
        </div>
      </div>

      {/* Zaman Serisi - Çizgi Grafik */}
      {zaman_serisi.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontWeight: 700, marginBottom: 6 }}>📈 Günlük Katılım Trendi</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Anketin yayında kaldığı {toplamYayinGunu} günlük süre boyunca tamamlanan katılımlar.
              </p>
            </div>
            {ozet.zirve_gun && (
              <div style={{ minWidth: 180, background: 'var(--bg)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800 }}>Zirve Gün</div>
                <div style={{ fontWeight: 850, color: 'var(--primary)', marginTop: 4 }}>
                  {formatGunEtiketi(ozet.zirve_gun.tarih)} · {ozet.zirve_gun.katilim_sayisi} katılım
                </div>
              </div>
            )}
          </div>
          <Line data={lineData} options={{
            responsive: true,
            plugins: { legend: { display: false }, title: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
          }} />
        </div>
      )}

      {/* Soru Bazlı Grafikler */}
      <h2 style={{ fontWeight: 700, marginBottom: 16 }}>📊 Soru Bazlı Analiz</h2>
      <div className="charts-grid">
        {soru_istatistikleri.map(istat => (
          <div className="card" key={istat.soru_id}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>{istat.soru_metni}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
              {istat.toplam_cevap} cevap · {istat.soru_tipi}
            </p>
            <SoruGrafik istat={istat} />
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontWeight: 800, marginBottom: 6 }}>Çapraz Tablo ve İlişki Analizi</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            İki farklı soru arasındaki ilişkiyi inceleyin. Text soruları bu analizde desteklenmez.
            Sonuçlar karar desteği sağlar; neden-sonuç ilişkisi kanıtlamaz.
          </p>
        </div>

        <CrossTabSelector
          questions={soru_istatistikleri}
          rowQuestionId={rowQuestionId}
          columnQuestionId={columnQuestionId}
          onRowChange={setRowQuestionId}
          onColumnChange={setColumnQuestionId}
          onAnalyze={analyzeCrossTab}
          loading={crossTabLoading}
        />

        {crossTabError && <div className="alert alert-error">{crossTabError}</div>}

        {crossTabResult && (
          <div className="analytics-results">
            <RelationshipInsightCard analysis={crossTabResult} />
            <CrossTabTable analysis={crossTabResult} />
          </div>
        )}
      </div>

      {soru_istatistikleri.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>⏳</div>
          <h3>Henüz katılım yok</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            Anketi paylaşmak için linki kopyalayın.
          </p>
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 20px', marginTop: 20, fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>
            {paylasimLinki}
          </div>
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
