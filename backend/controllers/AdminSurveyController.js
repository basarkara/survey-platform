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
        };
      })
    );

    // Zaman serisi: Son 30 günlük günlük katılım (çizgi grafik için)
    const otuzGunOnce = new Date();
    otuzGunOnce.setDate(otuzGunOnce.getDate() - 30);

    const zamanSerisi = await AnketYaniti.findAll({
      where: {
        anket_id: anket.id,
        bitis_tarihi: { [Op.gte]: otuzGunOnce, [Op.ne]: null },
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('bitis_tarihi')), 'tarih'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'katilim_sayisi'],
      ],
      group: [sequelize.fn('DATE', sequelize.col('bitis_tarihi'))],
      order: [[sequelize.fn('DATE', sequelize.col('bitis_tarihi')), 'ASC']],
    });

    res.json({
      anket: {
        id: anket.id,
        baslik: anket.baslik,
        aktif: anket.aktif,
        bitis_tarihi: anket.bitis_tarihi,
        kota: anket.kota,
        paylasim_token: anket.paylasim_token,
      },
      ozet: {
        toplam_katilim: toplamKatilim,
        kota_doluluk: anket.kota ? Math.round((toplamKatilim / anket.kota) * 100) : null,
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

    case 'multiple_choice': {
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

module.exports = { createSurvey, getSurveys, getSurveyById, getDashboard, updateSurvey, deleteSurvey };
