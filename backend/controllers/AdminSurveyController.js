const { Op } = require('sequelize');
const { Anket, Soru, AnketYaniti, Cevap, sequelize } = require('../models');

// POST /api/admin/surveys
// Yeni anket, sorular ve şıkları oluşturur
const createSurvey = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { baslik, aciklama, bitis_tarihi, kota, sorular } = req.body;

    if (!baslik) {
      await t.rollback();
      return res.status(400).json({ error: 'Anket başlığı zorunludur.' });
    }

    if (!sorular || !Array.isArray(sorular) || sorular.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'En az bir soru eklemelisiniz.' });
    }

    // Anket oluştur (paylasim_token otomatik UUID)
    const anket = await Anket.create({
      admin_id: req.kullanici.id,
      baslik,
      aciklama,
      bitis_tarihi: bitis_tarihi || null,
      kota: kota || null,
      aktif: true,
    }, { transaction: t });

    // Soruları oluştur
    const sorukayitlari = await Promise.all(
      sorular.map((s, index) =>
        Soru.create({
          anket_id: anket.id,
          soru_metni: s.soru_metni,
          soru_tipi: s.soru_tipi,
          zorunlu: s.zorunlu || false,
          sira_no: s.sira_no || index + 1,
          secenekler: s.secenekler || null, // JSONB - çoktan seçmeli şıklar
        }, { transaction: t })
      )
    );

    await t.commit();

    res.status(201).json({
      message: 'Anket başarıyla oluşturuldu.',
      anket: {
        ...anket.toJSON(),
        sorular: sorukayitlari,
      },
    });
  } catch (err) {
    await t.rollback();
    console.error('Anket oluşturma hatası:', err);
    res.status(500).json({ error: 'Anket oluşturulamadı.' });
  }
};

// GET /api/admin/surveys
// Adminin anketlerini listeler
const getSurveys = async (req, res) => {
  try {
    const anketler = await Anket.findAll({
      where: { admin_id: req.kullanici.id },
      include: [{ model: Soru, as: 'sorular', attributes: ['id', 'soru_metni', 'soru_tipi', 'zorunlu', 'sira_no'] }],
      order: [['olusturulma_tarihi', 'DESC']],
    });

    // Her anket için tamamlanmış katılım sayısını ekle
    const anketlerWithStats = await Promise.all(
      anketler.map(async (anket) => {
        const tamamlananKatilim = await AnketYaniti.count({
          where: { anket_id: anket.id, bitis_tarihi: { [Op.ne]: null } },
        });
        return { ...anket.toJSON(), tamamlanan_katilim: tamamlananKatilim };
      })
    );

    res.json({ anketler: anketlerWithStats });
  } catch (err) {
    console.error('Anket listeleme hatası:', err);
    res.status(500).json({ error: 'Anketler alınamadı.' });
  }
};

// GET /api/admin/surveys/:id
// Tek anket detayı
const getSurveyById = async (req, res) => {
  try {
    const anket = await Anket.findOne({
      where: { id: req.params.id, admin_id: req.kullanici.id },
      include: [{ model: Soru, as: 'sorular', order: [['sira_no', 'ASC']] }],
    });

    if (!anket) {
      return res.status(404).json({ error: 'Anket bulunamadı.' });
    }

    res.json({ anket });
  } catch (err) {
    console.error('Anket getirme hatası:', err);
    res.status(500).json({ error: 'Anket alınamadı.' });
  }
};

// GET /api/admin/surveys/:id/dashboard
// Gerçek zamanlı dashboard verileri (pasta grafik + çizgi grafik)
const getDashboard = async (req, res) => {
  try {
    const anket = await Anket.findOne({
      where: { id: req.params.id, admin_id: req.kullanici.id },
      include: [{ model: Soru, as: 'sorular', order: [['sira_no', 'ASC']] }],
    });

    if (!anket) {
      return res.status(404).json({ error: 'Anket bulunamadı.' });
    }

    // Tamamlanmış katılım sayısı
    const toplamKatilim = await AnketYaniti.count({
      where: { anket_id: anket.id, bitis_tarihi: { [Op.ne]: null } },
    });

    const tamamlananYanitlar = await AnketYaniti.findAll({
      where: { anket_id: anket.id, bitis_tarihi: { [Op.ne]: null } },
      include: [{
        model: Cevap,
        as: 'cevaplar',
        attributes: ['soru_id', 'cevap_verisi'],
      }],
      order: [['bitis_tarihi', 'ASC']],
    });

    // Her soru için cevap istatistikleri
    const soruIstatistikleri = await Promise.all(
      anket.sorular.map(async (soru) => {
        const cevaplar = await Cevap.findAll({
          where: { soru_id: soru.id },
          include: [{
            model: AnketYaniti,
            as: 'yanit',
            where: { bitis_tarihi: { [Op.ne]: null } }, // Sadece tamamlananlar
            attributes: [],
          }],
          attributes: ['cevap_verisi'],
        });

        // Soru tipine göre istatistik hesapla
        const istatistik = hesaplaIstatistik(soru.soru_tipi, cevaplar, soru.secenekler);

        return {
          soru_id: soru.id,
          soru_metni: soru.soru_metni,
          soru_tipi: soru.soru_tipi,
          toplam_cevap: cevaplar.length,
          istatistik,
          zaman_trendi: hesaplaSoruZamanTrendi(soru, tamamlananYanitlar),
        };
      })
    );

    const zamanSerisi = hesaplaGunlukKatilimSerisi(
      tamamlananYanitlar,
      anket.olusturulma_tarihi,
      anket.bitis_tarihi
    );
    const zirveGun = zamanSerisi.reduce((max, gun) =>
      Number(gun.katilim_sayisi) > Number(max?.katilim_sayisi || 0) ? gun : max
    , null);

    res.json({
      anket: {
        id: anket.id,
        baslik: anket.baslik,
        aktif: anket.aktif,
        bitis_tarihi: anket.bitis_tarihi,
        kota: anket.kota,
        paylasim_token: anket.paylasim_token,
        olusturulma_tarihi: anket.olusturulma_tarihi,
      },
      ozet: {
        toplam_katilim: toplamKatilim,
        kota_doluluk: anket.kota ? Math.round((toplamKatilim / anket.kota) * 100) : null,
        zirve_gun: zirveGun,
      },
      soru_istatistikleri: soruIstatistikleri,
      zaman_serisi: zamanSerisi,
    });
  } catch (err) {
    console.error('Dashboard hatası:', err);
    res.status(500).json({ error: 'Dashboard verisi alınamadı.' });
  }
};

// Soru tipine göre istatistik hesaplama yardımcı fonksiyonu
function hesaplaIstatistik(soruTipi, cevaplar, secenekler) {
  if (cevaplar.length === 0) return {};

  switch (soruTipi) {
    case 'star':
    case 'scale': {
      const degerler = cevaplar.map(c => c.cevap_verisi.value).filter(v => typeof v === 'number');
      const toplam = degerler.reduce((a, b) => a + b, 0);
      const ortalama = degerler.length > 0 ? (toplam / degerler.length).toFixed(2) : 0;

      // Dağılım: her değer için kaç kişi seçti
      const dagilim = {};
      degerler.forEach(v => { dagilim[v] = (dagilim[v] || 0) + 1; });

      return { ortalama: parseFloat(ortalama), dagilim };
    }

    case 'boolean': {
      const evetSayisi = cevaplar.filter(c => c.cevap_verisi.value === true).length;
      const hayirSayisi = cevaplar.filter(c => c.cevap_verisi.value === false).length;
      return {
        evet: evetSayisi,
        hayir: hayirSayisi,
        evet_yuzde: cevaplar.length > 0 ? Math.round((evetSayisi / cevaplar.length) * 100) : 0,
      };
    }

    case 'multiple_choice':
    case 'multi_select': {
      const sayimlar = {};
      cevaplar.forEach(c => {
        const secilen = c.cevap_verisi.selected || [];
        secilen.forEach(s => { sayimlar[s] = (sayimlar[s] || 0) + 1; });
      });
      // Yüzde hesapla
      const sonuclar = Object.entries(sayimlar).map(([secenek, sayi]) => ({
        secenek,
        sayi,
        yuzde: Math.round((sayi / cevaplar.length) * 100),
      }));
      return { dagilim: sonuclar.sort((a, b) => b.sayi - a.sayi) };
    }

    case 'text': {
      return { cevaplar: cevaplar.slice(0, 20).map(c => c.cevap_verisi.text) }; // İlk 20 metin cevabı
    }

    default:
      return {};
  }
}

function hesaplaGunlukKatilimSerisi(yanitlar, baslangicTarihi, bitisTarihi) {
  if (!yanitlar.length) return [];

  const sonKatilim = yanitlar[yanitlar.length - 1]?.bitis_tarihi;
  const start = startOfDay(baslangicTarihi);
  const end = startOfDay(bitisTarihi && new Date(bitisTarihi) < new Date()
    ? bitisTarihi
    : (sonKatilim || new Date()));

  const sayimlar = {};
  yanitlar.forEach((yanit) => {
    const key = dateKey(yanit.bitis_tarihi);
    sayimlar[key] = (sayimlar[key] || 0) + 1;
  });

  return dateRangeKeys(start, end).map((tarih) => ({
    tarih,
    katilim_sayisi: sayimlar[tarih] || 0,
  }));
}

function hesaplaSoruZamanTrendi(soru, yanitlar) {
  if (!['boolean', 'multiple_choice', 'multi_select'].includes(soru.soru_tipi) || !yanitlar.length) {
    return null;
  }

  const start = startOfDay(yanitlar[0].bitis_tarihi);
  const end = startOfDay(yanitlar[yanitlar.length - 1].bitis_tarihi);
  const gunler = dateRangeKeys(start, end);
  const secenekler = soru.soru_tipi === 'boolean'
    ? ['Evet', 'Hayır']
    : Array.isArray(soru.secenekler) ? soru.secenekler : [];

  const gunluk = {};
  gunler.forEach((gun) => {
    gunluk[gun] = {
      toplam_yanit: 0,
      secenek_sayimlari: Object.fromEntries(secenekler.map((secenek) => [secenek, 0])),
    };
  });

  yanitlar.forEach((yanit) => {
    const cevap = (yanit.cevaplar || []).find((c) => c.soru_id === soru.id);
    if (!cevap) return;

    const gun = dateKey(yanit.bitis_tarihi);
    if (!gunluk[gun]) return;

    gunluk[gun].toplam_yanit += 1;

    if (soru.soru_tipi === 'boolean') {
      if (cevap.cevap_verisi.value === true) gunluk[gun].secenek_sayimlari.Evet += 1;
      if (cevap.cevap_verisi.value === false) gunluk[gun].secenek_sayimlari.Hayır += 1;
      return;
    }

    const secilenler = Array.isArray(cevap.cevap_verisi.selected) ? cevap.cevap_verisi.selected : [];
    secilenler.forEach((secenek) => {
      if (gunluk[gun].secenek_sayimlari[secenek] === undefined) {
        gunluk[gun].secenek_sayimlari[secenek] = 0;
      }
      gunluk[gun].secenek_sayimlari[secenek] += 1;
    });
  });

  return {
    gunler: gunler.map((gun) => ({
      tarih: gun,
      toplam_yanit: gunluk[gun].toplam_yanit,
    })),
    seriler: secenekler.map((secenek) => ({
      secenek,
      oranlar: gunler.map((gun) => {
        const toplam = gunluk[gun].toplam_yanit;
        if (!toplam) return 0;
        return Math.round((gunluk[gun].secenek_sayimlari[secenek] / toplam) * 100);
      }),
      sayilar: gunler.map((gun) => gunluk[gun].secenek_sayimlari[secenek] || 0),
    })),
  };
}

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function dateKey(value) {
  const date = startOfDay(value);
  return date.toISOString().slice(0, 10);
}

function dateRangeKeys(start, end) {
  const keys = [];
  const current = startOfDay(start);
  const final = startOfDay(end);

  while (current <= final) {
    keys.push(dateKey(current));
    current.setDate(current.getDate() + 1);
  }

  return keys;
}

// PUT /api/admin/surveys/:id - Anket güncelleme
const updateSurvey = async (req, res) => {
  try {
    const anket = await Anket.findOne({
      where: { id: req.params.id, admin_id: req.kullanici.id },
    });
    if (!anket) return res.status(404).json({ error: 'Anket bulunamadı.' });

    const { baslik, aciklama, bitis_tarihi, kota, aktif } = req.body;
    await anket.update({ baslik, aciklama, bitis_tarihi, kota, aktif });

    res.json({ message: 'Anket güncellendi.', anket });
  } catch (err) {
    console.error('Anket güncelleme hatası:', err);
    res.status(500).json({ error: 'Anket güncellenemedi.' });
  }
};

// POST /api/admin/surveys/:id/duplicate - Anketi sorularıyla birlikte çoğalt
const duplicateSurvey = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { baslik } = req.body;
    const yeniBaslik = typeof baslik === 'string' ? baslik.trim() : '';

    if (!yeniBaslik) {
      await t.rollback();
      return res.status(400).json({ error: 'Yeni anket adı zorunludur.' });
    }

    const kaynakAnket = await Anket.findOne({
      where: { id: req.params.id, admin_id: req.kullanici.id },
      include: [{ model: Soru, as: 'sorular' }],
      transaction: t,
    });

    if (!kaynakAnket) {
      await t.rollback();
      return res.status(404).json({ error: 'Anket bulunamadı.' });
    }

    const yeniAnket = await Anket.create({
      admin_id: req.kullanici.id,
      baslik: yeniBaslik,
      aciklama: kaynakAnket.aciklama,
      bitis_tarihi: kaynakAnket.bitis_tarihi,
      kota: kaynakAnket.kota,
      aktif: kaynakAnket.aktif,
    }, { transaction: t });

    const kaynakSorular = [...(kaynakAnket.sorular || [])].sort((a, b) => a.sira_no - b.sira_no);
    const yeniSorular = await Promise.all(
      kaynakSorular.map((soru) =>
        Soru.create({
          anket_id: yeniAnket.id,
          soru_metni: soru.soru_metni,
          soru_tipi: soru.soru_tipi,
          zorunlu: soru.zorunlu,
          sira_no: soru.sira_no,
          secenekler: soru.secenekler ? JSON.parse(JSON.stringify(soru.secenekler)) : null,
        }, { transaction: t })
      )
    );

    await t.commit();

    res.status(201).json({
      message: 'Anket başarıyla çoğaltıldı.',
      anket: {
        ...yeniAnket.toJSON(),
        sorular: yeniSorular,
        tamamlanan_katilim: 0,
      },
    });
  } catch (err) {
    await t.rollback();
    console.error('Anket çoğaltma hatası:', err);
    res.status(500).json({ error: 'Anket çoğaltılamadı.' });
  }
};

// GET /api/admin/surveys/:id/export - Cevapları CSV olarak dışa aktar
const exportSurveyResponses = async (req, res) => {
  try {
    const anket = await Anket.findOne({
      where: { id: req.params.id, admin_id: req.kullanici.id },
      include: [{ model: Soru, as: 'sorular' }],
    });
    if (!anket) return res.status(404).json({ error: 'Anket bulunamadı.' });

    const sorular = [...(anket.sorular || [])].sort((a, b) => a.sira_no - b.sira_no);
    const yanitlar = await AnketYaniti.findAll({
      where: {
        anket_id: anket.id,
        bitis_tarihi: { [Op.ne]: null },
      },
      include: [{
        model: Cevap,
        as: 'cevaplar',
        attributes: ['soru_id', 'cevap_verisi'],
      }],
      order: [['bitis_tarihi', 'DESC']],
    });

    const headers = [
      'Yanit ID',
      'Baslangic Tarihi',
      'Bitis Tarihi',
      'IP Adresi',
      ...sorular.map((soru, index) => `Soru ${index + 1}: ${soru.soru_metni}`),
    ];

    const rows = yanitlar.map((yanit) => {
      const cevapMap = new Map(
        (yanit.cevaplar || []).map((cevap) => [cevap.soru_id, cevap.cevap_verisi])
      );

      return [
        yanit.id,
        formatDateForExport(yanit.baslangic_tarihi),
        formatDateForExport(yanit.bitis_tarihi),
        yanit.ip_adresi,
        ...sorular.map((soru) => formatAnswerForExport(soru.soru_tipi, cevapMap.get(soru.id))),
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsvValue).join(','))
      .join('\n');

    const safeTitle = String(anket.baslik || `anket-${anket.id}`)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle || `anket-${anket.id}`}-cevaplar.csv"`);
    res.send(`\uFEFF${csv}`);
  } catch (err) {
    console.error('Cevap dışa aktarma hatası:', err);
    res.status(500).json({ error: 'Cevaplar dışa aktarılamadı.' });
  }
};

function formatAnswerForExport(soruTipi, cevapVerisi) {
  if (!cevapVerisi) return '';

  if (soruTipi === 'text') return cevapVerisi.text || '';
  if (soruTipi === 'multiple_choice' || soruTipi === 'multi_select') {
    return Array.isArray(cevapVerisi.selected) ? cevapVerisi.selected.join('; ') : '';
  }
  if (soruTipi === 'boolean') {
    if (cevapVerisi.value === true) return 'Evet';
    if (cevapVerisi.value === false) return 'Hayır';
    return '';
  }
  if (cevapVerisi.value !== undefined && cevapVerisi.value !== null) return String(cevapVerisi.value);
  return JSON.stringify(cevapVerisi);
}

function formatDateForExport(value) {
  if (!value) return '';
  return new Date(value).toISOString();
}

function escapeCsvValue(value) {
  const text = value === undefined || value === null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

// DELETE /api/admin/surveys/:id
const deleteSurvey = async (req, res) => {
  try {
    const anket = await Anket.findOne({
      where: { id: req.params.id, admin_id: req.kullanici.id },
    });
    if (!anket) return res.status(404).json({ error: 'Anket bulunamadı.' });

    await anket.destroy(); // Cascade ile sorular ve yanıtlar da silinir
    res.json({ message: 'Anket silindi.' });
  } catch (err) {
    console.error('Anket silme hatası:', err);
    res.status(500).json({ error: 'Anket silinemedi.' });
  }
};

module.exports = { createSurvey, getSurveys, getSurveyById, getDashboard, updateSurvey, duplicateSurvey, exportSurveyResponses, deleteSurvey };
