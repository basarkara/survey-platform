import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminAPI } from '../../services/api';
import { createQrMatrix } from '../../utils/qrCode';

const MODULE_SIZE = 10;
const QUIET_ZONE = 4;

export default function AdminSurveyQrPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const svgRef = useRef(null);
  const [data, setData] = useState(null);
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
  const qrMatrix = useMemo(() => {
    if (!surveyUrl) return null;
    try {
      return createQrMatrix(surveyUrl);
    } catch (err) {
      setHata(err.message || 'QR kod oluşturulamadı.');
      return null;
    }
  }, [surveyUrl]);

  const viewSize = qrMatrix ? (qrMatrix.length + QUIET_ZONE * 2) * MODULE_SIZE : 0;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!svgRef.current || !anket) return;

    const serializer = new XMLSerializer();
    const svgText = serializer.serializeToString(svgRef.current);
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1200;
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `${slugify(anket.baslik || `anket-${anket.id}`)}-qr-kod.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    };

    image.src = url;
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
              <svg
                ref={svgRef}
                xmlns="http://www.w3.org/2000/svg"
                viewBox={`0 0 ${viewSize} ${viewSize}`}
                width="100%"
                height="100%"
                role="img"
                aria-label={`${anket.baslik} anketi QR kodu`}
                shapeRendering="crispEdges"
              >
                <rect width={viewSize} height={viewSize} fill="#ffffff" />
                {qrMatrix.map((row, rowIndex) =>
                  row.map((dark, colIndex) => dark ? (
                    <rect
                      key={`${rowIndex}-${colIndex}`}
                      x={(colIndex + QUIET_ZONE) * MODULE_SIZE}
                      y={(rowIndex + QUIET_ZONE) * MODULE_SIZE}
                      width={MODULE_SIZE}
                      height={MODULE_SIZE}
                      fill="#111827"
                    />
                  ) : null)
                )}
              </svg>
            </div>

            <p className="qr-help-text">Ankete katılmak için kameranızı QR koda tutun.</p>
            <div className="qr-url">{surveyUrl}</div>
          </div>

          <div className="qr-actions no-print">
            <button className="btn btn-primary" onClick={handlePrint}>
              Yazdır
            </button>
            <button className="btn btn-outline" onClick={handleDownload}>
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
