import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminAPI } from '../../services/api';

export default function AdminSurveyQrPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    try {
      const res = await adminAPI.getDashboard(id);
      setData(res.data);
    } catch (err) {
      setHata(err.response?.data?.error || 'QR kod bilgileri alınamadı.');
    } finally {
      setYukleniyor(false);
    }
  }, [id]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  const anket = data?.anket;
  const surveyUrl = anket ? `${window.location.origin}/s/${anket.paylasim_token}` : '';
  const qrFileName = useMemo(
    () => `${slugify(anket?.baslik || `anket-${anket?.id || id}`)}-qr-kod.png`,
    [anket, id]
  );

  useEffect(() => {
    if (!surveyUrl) return;

    let aktif = true;
    QRCode.toDataURL(surveyUrl, {
      errorCorrectionLevel: 'H',
      margin: 4,
      width: 1200,
      color: {
        dark: '#111827',
        light: '#ffffff'
      }
    })
      .then((url) => {
        if (aktif) {
          setQrDataUrl(url);
          setHata('');
        }
      })
      .catch(() => {
        if (aktif) setHata('QR kod oluşturulamadı.');
      });

    return () => {
      aktif = false;
    };
  }, [surveyUrl]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = qrFileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <AdminLayout>
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">QR Kod Oluştur</h1>
          <p className="page-subtitle">Katılımcılar bu QR kodu okutarak ankete doğrudan ulaşabilir.</p>
        </div>
        <button className="btn btn-outline" onClick={() => navigate('/admin')}>
          Anketlerime Dön
        </button>
      </div>

      {yukleniyor ? (
        <div className="spinner" />
      ) : hata ? (
        <div className="card">
          <div className="alert alert-error" style={{ marginBottom: 0 }}>{hata}</div>
        </div>
      ) : (
        <div className="qr-page-wrap">
          <div className="qr-print-card">
            <div className="qr-print-header">
              <div className="qr-logo-mark">✓</div>
              <div>
                <div className="qr-brand">Pollify</div>
                <h2 className="qr-title">{anket.baslik}</h2>
              </div>
            </div>

            <div className="qr-code-box">
              {qrDataUrl ? (
                <img
                  className="qr-code-image"
                  src={qrDataUrl}
                  alt={`${anket.baslik} anketi QR kodu`}
                  draggable="false"
                />
              ) : (
                <div className="spinner" />
              )}
            </div>

            <p className="qr-help-text">Ankete katılmak için kameranızı QR koda tutun.</p>
            <div className="qr-url">{surveyUrl}</div>
          </div>

          <div className="qr-actions no-print">
            <button className="btn btn-primary" onClick={handlePrint}>
              Yazdır
            </button>
            <button className="btn btn-outline" onClick={handleDownload} disabled={!qrDataUrl}>
              Ekran Görüntüsü Olarak İndir
            </button>
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
