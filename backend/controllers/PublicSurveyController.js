const { Op } = require('sequelize');
const { Anket, Soru, AnketYaniti, Cevap, sequelize } = require('../models');
const { getClientIP } = require('../middleware/auth');

// GET /api/public/surveys/share/:token
// QR/Link ile gelen katılımcıya anket bilgilerini döndürür
// Backend: bitis_tarihi ve kota kontrolü yapar
const getSurveyByToken = async (req, res) => {
  try {
    const { token } = req.params;

    const anket = await Anket.findOne({
      where: { paylasim_token: token },
      include: [{
        model: Soru,
        as: 'sorular',
        attributes: ['id', 'soru_metni', 'soru_tipi', 'zorunlu', 'sira_no', 'secenekler'],
        order: [['sira_no', 'ASC']],
      }],
    });

    if (!anket) {
      return res.status(404).json({ error: 'Anket bulunamadı.' });
    }

    // Aktiflik kontrolü
    if (!anket.aktif) {
      return res.status(403).json({ error: 'Bu anket aktif değil.', kod: 'ANKET_PASIF' });
    }

    // Bitiş tarihi kontrolü (backend seviyesinde zorunlu)
    if (anket.bitis_tarihi && new Date() > new Date(anket.bitis_tarihi)) {
      return res.status(403).json({
        error: 'Bu anketin süresi dolmuş.',
        kod: 'SURE_DOLDU',
        bitis_tarihi: anket.bitis_tarihi,
      });
    }

    // Kota kontrolü - tamamlanmış katılım sayısını hesapla
    if (anket.kota) {
      const tamamlananKatilim = await AnketYaniti.count({
        where: { anket_id: anket.id, bitis_tarihi: { [Op.ne]: null } },
      });
      if (tamamlananKatilim >= anket.kota) {
        return res.status(403).json({
          error: 'Bu anket kotasına ulaşmış.',
          kod: 'KOTA_DOLDU',
          kota: anket.kota,
          mevcut: tamamlananKatilim,
        });
      }
    }

    // IP ile mükerrer tamamlanmış katılım kontrolü
    const ipAdresi = getClientIP(req);
    const mevcutTamamlanmis = await AnketYaniti.findOne({
      where: {
        anket_id: anket.id,
        ip_adresi: ipAdresi,
        bitis_tarihi: { [Op.ne]: null },
      },
    });

    res.json({
      anket: {
        id: anket.id,
        baslik: anket.baslik,
        aciklama: anket.aciklama,
        sorular: anket.sorular,
        bitis_tarihi: anket.bitis_tarihi,
      },
      katilimci_durumu: {
        daha_once_katildi: !!mevcutTamamlanmis,
      },
    });
  } catch (err) {
    console.error('Anket token hatası:', err);
    res.status(500).json({ error: 'Anket alınamadı.' });
  }
};

// POST /api/public/surveys/start/:token
// Katılım oturumu başlatır (başlangıç kaydı)
const startSurvey = async (req, res) => {
  try {
    const { token } = req.params;
    const ipAdresi = getClientIP(req);

    const anket = await Anket.findOne({ where: { paylasim_token: token } });
    if (!anket) return res.status(404).json({ error: 'Anket bulunamadı.' });

    // Bitiş tarihi ve kota tekrar kontrol (race condition önlemi)
    if (anket.bitis_tarihi && new Date() > new Date(anket.bitis_tarihi)) {
      return res.status(403).json({ error: 'Bu anketin süresi dolmuş.', kod: 'SURE_DOLDU' });
    }

    if (anket.kota) {
      const tamamlananKatilim = await AnketYaniti.count({
        where: { anket_id: anket.id, bitis_tarihi: { [Op.ne]: null } },
      });
      if (tamamlananKatilim >= anket.kota) {
        return res.status(403).json({ error: 'Anket kotası doldu.', kod: 'KOTA_DOLDU' });
      }
    }

    // Tamamlanmış mükerrer katılım kontrolü
    const mevcutTamamlanmis = await AnketYaniti.findOne({
      where: { anket_id: anket.id, ip_adresi: ipAdresi, bitis_tarihi: { [Op.ne]: null } },
    });
    if (mevcutTamamlanmis) {
      return res.status(409).json({ error: 'Bu ankete daha önce katıldınız.', kod: 'MUKERRER_KATILIM' });
    }

    // Yeni oturum başlat (bitis_tarihi null = henüz tamamlanmamış)
    const yanit = await AnketYaniti.create({
      anket_id: anket.id,
      kullanici_id: req.kullanici?.id || null, // Opsiyonel JWT
      ip_adresi: ipAdresi,
      baslangic_tarihi: new Date(),
      bitis_tarihi: null,
    });

    res.status(201).json({ yanit_id: yanit.id });
  } catch (err) {
    console.error('Oturum başlatma hatası:', err);
    res.status(500).json({ error: 'Oturum başlatılamadı.' });
  }
};

// POST /api/public/responses/submit
// Anket cevaplarını alır, tüm kontrolleri yapar ve kaydeder
const submitResponse = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { yanit_id, anket_id, cevaplar } = req.body;
    const ipAdresi = getClientIP(req);

    if (!yanit_id || !anket_id || !cevaplar || !Array.isArray(cevaplar)) {
      await t.rollback();
      return res.status(400).json({ error: 'yanit_id, anket_id ve cevaplar zorunludur.' });
    }

    // Yanıt oturumu doğrula
    const yanit = await AnketYaniti.findOne({
      where: { id: yanit_id, anket_id, ip_adresi: ipAdresi },
      transaction: t,
    });

    if (!yanit) {
      await t.rollback();
      return res.status(404).json({ error: 'Geçersiz yanıt oturumu.' });
    }

    // Zaten tamamlanmış mı?
    if (yanit.bitis_tarihi) {
      await t.rollback();
      return res.status(409).json({ error: 'Bu oturum zaten tamamlanmış.', kod: 'ZATEN_TAMAMLANDI' });
    }

    // Anket kontrolleri (bitiş tarihi + kota) - submit anında tekrar zorunlu
    const anket = await Anket.findByPk(anket_id, { transaction: t });
    if (!anket) {
      await t.rollback();
      return res.status(404).json({ error: 'Anket bulunamadı.' });
    }

    if (anket.bitis_tarihi && new Date() > new Date(anket.bitis_tarihi)) {
      await t.rollback();
      return res.status(403).json({ error: 'Anket süresi doldu.', kod: 'SURE_DOLDU' });
    }

    if (anket.kota) {
      const tamamlananSayisi = await AnketYaniti.count({
        where: { anket_id, bitis_tarihi: { [Op.ne]: null } },
        transaction: t,
      });
      if (tamamlananSayisi >= anket.kota) {
        await t.rollback();
        return res.status(403).json({ error: 'Anket kotası doldu.', kod: 'KOTA_DOLDU' });
      }
    }

    // Zorunlu soru kontrolü
    const sorular = await Soru.findAll({ where: { anket_id }, transaction: t });
    const zorunluSorular = sorular.filter(s => s.zorunlu);
    const cevaplananSoruIdleri = cevaplar.map(c => c.soru_id);

    for (const zorunluSoru of zorunluSorular) {
      if (!cevaplananSoruIdleri.includes(zorunluSoru.id)) {
        await t.rollback();
        return res.status(400).json({
          error: `Zorunlu soru cevaplandırılmadı: "${zorunluSoru.soru_metni}"`,
          soru_id: zorunluSoru.id,
        });
      }
    }

    // Cevapları kaydet (JSONB formatında)
    await Promise.all(
      cevaplar.map(c =>
        Cevap.create({
          yanit_id,
          soru_id: c.soru_id,
          cevap_verisi: c.cevap_verisi, // JSONB: {value: ...} veya {selected: [...]} veya {text: ...}
        }, { transaction: t })
      )
    );

    // Oturumu tamamla (bitis_tarihi'ni set et = "tamamlanmış katılım")
    await yanit.update({ bitis_tarihi: new Date() }, { transaction: t });

    await t.commit();

    res.json({ message: 'Cevaplarınız başarıyla kaydedildi. Teşekkürler!' });
  } catch (err) {
    await t.rollback();
    console.error('Submit hatası:', err);
    res.status(500).json({ error: 'Cevaplar kaydedilemedi.' });
  }
};

module.exports = { getSurveyByToken, startSurvey, submitResponse };
