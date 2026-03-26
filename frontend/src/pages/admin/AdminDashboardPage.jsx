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

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, Title, Filler);

const RENKLER = ['#6C63FF', '#FF6584', '#43C59E', '#FFB347', '#4ECDC4', '#A8E6CF', '#FF8B94', '#B4A7D6'];

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
      <Pie
        data={{
          labels: ['Evet', 'Hayır'],
          datasets: [{ data: [istatistik.evet, istatistik.hayir], backgroundColor: ['#43C59E', '#FF6584'], borderWidth: 2 }],
        }}
        options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }}
      />
    );
  }

  if (soru_tipi === 'multiple_choice') {
    const items = istatistik.dagilim || [];
    return (
      <Pie
        data={{
          labels: items.map(i => `${i.secenek} (${i.yuzde}%)`),
          datasets: [{ data: items.map(i => i.sayi), backgroundColor: RENKLER, borderWidth: 2 }],
        }}
        options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }}
      />
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

  // Çizgi grafik verisi (son 30 gün)
  const lineData = {
    labels: zaman_serisi.map(z => new Date(z.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })),
    datasets: [{
      label: 'Günlük Katılım',
      data: zaman_serisi.map(z => Number(z.katilim_sayisi)),
      borderColor: '#6C63FF',
      backgroundColor: 'rgba(108,99,255,0.1)',
      tension: 0.4, fill: true, pointRadius: 4,
    }],
  };

  const paylasimLinki = `${window.location.origin}/s/${anket.paylasim_token}`;

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
          <div className="stat-number">{zaman_serisi.length}</div>
          <div className="stat-label">Aktif Gün</div>
        </div>
      </div>

      {/* Zaman Serisi - Çizgi Grafik */}
      {zaman_serisi.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontWeight: 700, marginBottom: 20 }}>📈 Günlük Katılım Trendi (Son 30 Gün)</h2>
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
