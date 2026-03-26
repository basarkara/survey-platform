const express = require('express');
const router = express.Router();
const {
  createSurvey,
  getSurveys,
  getSurveyById,
  getDashboard,
  updateSurvey,
  deleteSurvey,
} = require('../controllers/AdminSurveyController');
const { authenticate, adminOnly } = require('../middleware/auth');

// Tüm admin route'ları JWT + admin yetkisi gerektirir
router.use(authenticate, adminOnly);

// POST /api/admin/surveys - Anket oluştur
router.post('/surveys', createSurvey);

// GET /api/admin/surveys - Anketleri listele
router.get('/surveys', getSurveys);

// GET /api/admin/surveys/:id - Anket detayı
router.get('/surveys/:id', getSurveyById);

// GET /api/admin/surveys/:id/dashboard - Dashboard verisi
router.get('/surveys/:id/dashboard', getDashboard);

// PUT /api/admin/surveys/:id - Anket güncelle
router.put('/surveys/:id', updateSurvey);

// DELETE /api/admin/surveys/:id - Anket sil
router.delete('/surveys/:id', deleteSurvey);

module.exports = router;
