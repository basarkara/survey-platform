const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Kullanici } = require('../models');

// POST /api/auth/register
// Sadece 'user' rolüyle kayıt (admin yalnızca DB üzerinden oluşturulur)
const register = async (req, res) => {
  try {
    const { ad, eposta, sifre } = req.body;

    if (!ad || !eposta || !sifre) {
      return res.status(400).json({ error: 'Ad, eposta ve şifre zorunludur.' });
    }

    if (sifre.length < 8) {
      return res.status(400).json({ error: 'Şifre en az 8 karakter olmalıdır.' });
    }

    // Eposta benzersizlik kontrolü
    const mevcutKullanici = await Kullanici.findOne({ where: { eposta } });
    if (mevcutKullanici) {
      return res.status(409).json({ error: 'Bu eposta adresi zaten kayıtlı.' });
    }

    // Şifreyi hashle (bcrypt, salt rounds: 10)
    const sifre_hash = await bcrypt.hash(sifre, 10);

    const yeniKullanici = await Kullanici.create({
      ad,
      eposta,
      sifre_hash,
      rol: 'user', // Kayıt her zaman 'user' rolüyle
    });

    // Şifreyi response'a dahil etme
    const { sifre_hash: _, ...kullaniciBilgisi } = yeniKullanici.toJSON();

    res.status(201).json({
      message: 'Kayıt başarılı.',
      kullanici: kullaniciBilgisi,
    });
  } catch (err) {
    console.error('Register hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { eposta, sifre } = req.body;

    if (!eposta || !sifre) {
      return res.status(400).json({ error: 'Eposta ve şifre zorunludur.' });
    }

    const kullanici = await Kullanici.findOne({ where: { eposta } });
    if (!kullanici) {
      return res.status(401).json({ error: 'Eposta veya şifre hatalı.' });
    }

    const sifreGecerli = await bcrypt.compare(sifre, kullanici.sifre_hash);
    if (!sifreGecerli) {
      return res.status(401).json({ error: 'Eposta veya şifre hatalı.' });
    }

    // JWT token oluştur
    const token = jwt.sign(
      { id: kullanici.id, rol: kullanici.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Giriş başarılı.',
      token,
      kullanici: {
        id: kullanici.id,
        ad: kullanici.ad,
        eposta: kullanici.eposta,
        rol: kullanici.rol,
      },
    });
  } catch (err) {
    console.error('Login hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
};

// GET /api/auth/me - Mevcut kullanıcı bilgisi
const me = async (req, res) => {
  res.json({ kullanici: req.kullanici });
};

module.exports = { register, login, me };
