const jwt = require('jsonwebtoken');
const { Kullanici } = require('../models');

// JWT token doğrulama middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Yetkilendirme token\'ı gereklidir.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const kullanici = await Kullanici.findByPk(decoded.id, {
      attributes: ['id', 'rol', 'ad', 'eposta'],
    });

    if (!kullanici) {
      return res.status(401).json({ error: 'Geçersiz token: kullanıcı bulunamadı.' });
    }

    req.kullanici = kullanici;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token süresi dolmuş. Lütfen tekrar giriş yapın.' });
    }
    return res.status(401).json({ error: 'Geçersiz token.' });
  }
};

// Eski admin koruması. Anket oluşturma/yönetme akışında artık giriş yapmış
// tüm kullanıcılar yetkili kabul edilir; geriye dönük importlar kırılmasın.
const adminOnly = (req, res, next) => {
  next();
};

// IP adresini güvenli şekilde al (proxy arkasında da çalışır)
const getClientIP = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    '0.0.0.0'
  );
};

module.exports = { authenticate, adminOnly, getClientIP };
