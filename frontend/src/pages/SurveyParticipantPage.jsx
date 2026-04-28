import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicAPI } from '../services/api';

// ── Soru tipi render bileşenleri ─────────────────────────────

function StarQuestion({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div>
      <div className="star-group">
        {[1, 2, 3, 4, 5].map(n => (
          <span
            key={n}
            className={`star-item ${n <= (hover || value) ? 'active' : ''}`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)}
          >★</span>
        ))}
      </div>
      {value > 0 && (
        <p style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {['', 'Çok kötü', 'Kötü', 'Orta', 'İyi', 'Mükemmel'][value]}
        </p>
      )}
    </div>
  );
}

function BooleanQuestion({ value, onChange }) {
  return (
    <div className="bool-group">
      <button
        type="button"
        className={`bool-btn ${value === true ? 'selected-yes' : ''}`}
        onClick={() => onChange(true)}
      >✓ EVET</button>
      <button
        type="button"
        className={`bool-btn ${value === false ? 'selected-no' : ''}`}
        onClick={() => onChange(false)}
      >✗ HAYIR</button>
    </div>
  );
}

function ScaleQuestion({ value, onChange }) {
  const current = value ?? 5;
  return (
    <div className="scale-wrap">
      <div className="scale-value">{current}</div>
      <input
        type="range" min={1} max={10} value={current}
        className="scale-slider"
        onChange={e => onChange(Number(e.target.value))}
      />
      <div className="scale-labels"><span>1 - Hiç</span><span>10 - Kesinlikle</span></div>
    </div>
  );
}

function MultipleChoiceQuestion({ secenekler, value, onChange }) {
  const list = Array.isArray(secenekler) ? secenekler : [];
  const selected = Array.isArray(value) ? value : [];
  const toggle = (opt) => {
    const next = selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt];
    onChange(next);
  };
  return (
    <div className="choice-list">
      {list.map((opt, i) => (
        <button
          type="button" key={i}
          className={`choice-item ${selected.includes(opt) ? 'selected' : ''}`}
          onClick={() => toggle(opt)}
        >{opt}</button>
      ))}
    </div>
  );
}

function MultiSelectQuestion({ secenekler, value, onChange }) {
  const list = Array.isArray(secenekler) ? secenekler : [];
  const selected = Array.isArray(value) ? value : [];
  const toggle = (opt) => {
    const next = selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt];
    onChange(next);
  };

  return (
    <div className="choice-list">
      {list.map((opt, i) => {
        const checked = selected.includes(opt);
        return (
          <label key={i} className={`checkbox-choice ${checked ? 'selected' : ''}`}>
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(opt)}
            />
            <span>{opt}</span>
          </label>
        );
      })}
    </div>
  );
}

function TextQuestion({ value, onChange }) {
  return (
    <textarea
      className="form-input"
      placeholder="Cevabınızı buraya yazın..."
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      rows={4}
    />
  );
}

// ── Ana Sayfa ─────────────────────────────────────────────────

export default function SurveyParticipantPage({ kioskMode = false }) {
  const { token } = useParams();
  const navigate = useNavigate();

  const [resetKey, setResetKey] = useState(0);
  const [anket, setAnket] = useState(null);
  const [soruIndex, setSoruIndex] = useState(0);
  const [cevaplar, setCevaplar] = useState({});     // { soru_id: value }
  const [yanitId, setYanitId] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState('');
  const [bitti, setBitti] = useState(false);
  const [zorunluHata, setZorunluHata] = useState(false);

  // Anketi yükle + oturum başlat
  useEffect(() => {
    const yukle = async () => {
      try {
        setYukleniyor(true);
        setAnket(null);
        setSoruIndex(0);
        setCevaplar({});
        setYanitId(null);
        setHata('');
        setBitti(false);
        setZorunluHata(false);

        const res = await publicAPI.getSurveyByToken(token, { kiosk: kioskMode });
        if (res.data.katilimci_durumu?.daha_once_katildi) {
          setHata('Bu ankete daha önce katıldınız. Teşekkürler!');
          setYukleniyor(false);
          return;
        }
        setAnket(res.data.anket);

        // Oturum başlat
        const startRes = await publicAPI.startSurvey(token, { kiosk: kioskMode });
        setYanitId(startRes.data.yanit_id);
      } catch (err) {
        const kod = err.response?.data?.kod;
        if (kod === 'MUKERRER_KATILIM') setHata('Bu ankete daha önce katıldınız. Teşekkürler!');
        else if (kod === 'SURE_DOLDU') setHata('Bu anketin süresi dolmuş.');
        else if (kod === 'KOTA_DOLDU') setHata('Bu anket maksimum katılım sayısına ulaşmış.');
        else setHata(err.response?.data?.error || 'Anket yüklenemedi.');
      } finally {
        setYukleniyor(false);
      }
    };
    yukle();
  }, [token, kioskMode, resetKey]);

  useEffect(() => {
    if (!kioskMode || !bitti) return undefined;

    const timer = setTimeout(() => {
      setResetKey((key) => key + 1);
    }, 5000);

    return () => clearTimeout(timer);
  }, [bitti, kioskMode]);

  if (yukleniyor) return <div className="participant-screen"><div className="spinner" /></div>;
  if (hata) return (
    <div className="participant-screen" style={{ justifyContent: 'center', textAlign: 'center' }}>
      <div className="card">
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>ℹ️</div>
        <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{hata}</p>
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: 20 }}
          onClick={() => navigate('/')}
        >
          Anasayfa'ya Dön
        </button>
      </div>
    </div>
  );
  if (bitti) return (
    <div className="participant-screen" style={{ justifyContent: 'center', textAlign: 'center' }}>
      <div className="card">
        <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>Teşekkürler!</h2>
        <p style={{ color: 'var(--text-muted)' }}>Cevaplarınız başarıyla kaydedildi.</p>
        {kioskMode && (
          <p style={{ color: 'var(--text-muted)', marginTop: 10 }}>
            Kiosk modu 5 saniye içinde yeni katılımcı için başa dönecek.
          </p>
        )}
        {kioskMode && (
          <button
            type="button"
            className="btn btn-outline"
            style={{ marginTop: 20, marginRight: 10 }}
            onClick={() => setResetKey((key) => key + 1)}
          >
            Yeni Katılımcı Başlat
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: 20 }}
          onClick={() => navigate('/')}
        >
          Anasayfa'ya Dön
        </button>
      </div>
    </div>
  );
  if (!anket) return null;

  const sorular = anket.sorular || [];
  const mevcutSoru = sorular[soruIndex];
  const mevcutCevap = cevaplar[mevcutSoru?.id];
  const ilerleme = Math.round(((soruIndex) / sorular.length) * 100);

  const cevapGuncelle = (val) => {
    setZorunluHata(false);
    setCevaplar(prev => ({ ...prev, [mevcutSoru.id]: val }));
  };

  const cevapVerildiMi = () => {
    if (mevcutCevap === undefined || mevcutCevap === null) return false;
    if (['multiple_choice', 'multi_select'].includes(mevcutSoru.soru_tipi)) {
      return Array.isArray(mevcutCevap) && mevcutCevap.length > 0;
    }
    if (mevcutSoru.soru_tipi === 'text') return mevcutCevap.trim().length > 0;
    return true;
  };

  const ileri = () => {
    // Zorunlu alan kontrolü
    if (mevcutSoru.zorunlu && !cevapVerildiMi()) {
      setZorunluHata(true);
      return;
    }
    if (soruIndex < sorular.length - 1) {
      setSoruIndex(soruIndex + 1);
      setZorunluHata(false);
    }
  };

  const geri = () => {
    if (soruIndex > 0) { setSoruIndex(soruIndex - 1); setZorunluHata(false); }
  };

  const gonder = async () => {
    if (mevcutSoru.zorunlu && !cevapVerildiMi()) {
      setZorunluHata(true);
      return;
    }
    setGonderiliyor(true);
    try {
      // Cevapları backend formatına çevir
      const cevapListesi = Object.entries(cevaplar).map(([soru_id, val]) => {
        const soru = sorular.find(s => s.id === parseInt(soru_id));
        let cevap_verisi;
        if (['multiple_choice', 'multi_select'].includes(soru?.soru_tipi)) cevap_verisi = { selected: val };
        else if (soru?.soru_tipi === 'text') cevap_verisi = { text: val };
        else cevap_verisi = { value: val };
        return { soru_id: parseInt(soru_id), cevap_verisi };
      });

      await publicAPI.submitResponse({
        yanit_id: yanitId,
        anket_id: anket.id,
        cevaplar: cevapListesi,
      });
      setBitti(true);
    } catch (err) {
      setHata(err.response?.data?.error || 'Gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setGonderiliyor(false);
    }
  };

  const renderSoruInput = () => {
    switch (mevcutSoru.soru_tipi) {
      case 'star': return <StarQuestion value={mevcutCevap} onChange={cevapGuncelle} />;
      case 'boolean': return <BooleanQuestion value={mevcutCevap} onChange={cevapGuncelle} />;
      case 'scale': return <ScaleQuestion value={mevcutCevap} onChange={cevapGuncelle} />;
      case 'multiple_choice': return <MultipleChoiceQuestion secenekler={mevcutSoru.secenekler} value={mevcutCevap} onChange={cevapGuncelle} />;
      case 'multi_select': return <MultiSelectQuestion secenekler={mevcutSoru.secenekler} value={mevcutCevap} onChange={cevapGuncelle} />;
      case 'text': return <TextQuestion value={mevcutCevap} onChange={cevapGuncelle} />;
      default: return <p>Bilinmeyen soru tipi: {mevcutSoru.soru_tipi}</p>;
    }
  };

  return (
    <div className="participant-screen">
      {/* Header */}
      <div style={{ paddingTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)', margin: 0 }}>{anket.baslik}</h2>
            {kioskMode && (
              <span className="badge badge-purple" style={{ marginTop: 8 }}>Kiosk Modu</span>
            )}
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => navigate('/')}
          >
            Anasayfa'ya Dön
          </button>
        </div>
        <div className="progress-bar-wrap">
          <div className="progress-bar-fill" style={{ width: `${ilerleme}%` }} />
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
          {soruIndex + 1} / {sorular.length}
        </p>
      </div>

      {/* Soru Kartı - Tek soru per ekran */}
      <div className="question-card">
        <div className="question-number">Soru {soruIndex + 1}</div>
        <div className="question-text">{mevcutSoru.soru_metni}</div>
        {mevcutSoru.zorunlu && (
          <span className="badge badge-purple" style={{ marginBottom: 16, fontSize: '0.75rem' }}>Zorunlu</span>
        )}
        {renderSoruInput()}
        {zorunluHata && (
          <p style={{ color: 'var(--danger)', fontSize: '0.9rem', marginTop: 12, fontWeight: 600 }}>
            ⚠️ Bu soruyu cevaplamadan devam edemezsiniz.
          </p>
        )}
      </div>

      {/* Navigasyon Butonları */}
      <div className="question-nav">
        {soruIndex > 0 && (
          <button className="btn btn-outline" onClick={geri} style={{ flex: 1 }}>← Geri</button>
        )}
        {soruIndex < sorular.length - 1 ? (
          <button className="btn btn-primary" onClick={ileri} style={{ flex: 2 }}>Sonraki →</button>
        ) : (
          <button className="btn btn-success" onClick={gonder} disabled={gonderiliyor} style={{ flex: 2 }}>
            {gonderiliyor ? 'Gönderiliyor...' : '✓ Anketi Tamamla'}
          </button>
        )}
      </div>
    </div>
  );
}
