const express = require('express');
const router = express.Router();
const { getSurveyByToken, startSurvey, submitResponse } = require('../controllers/PublicSurveyController');
const { authenticate } = require('../middleware/auth');

// Opsiyonel JWT middleware - token varsa kullanıcıyı tanımla, yoksa anonim devam et
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Anonim - devam et
  }
  authenticate(req, res, next); // JWT doğrula
};

// GET /api/public/surveys/share/:token - QR/Link ile anket getir
router.get('/surveys/share/:token', getSurveyByToken);

// POST /api/public/surveys/start/:token - Katılım oturumu başlat
router.post('/surveys/start/:token', optionalAuth, startSurvey);

// POST /api/public/responses/submit - Cevapları gönder
router.post('/responses/submit', optionalAuth, submitResponse);

module.exports = router;
