const express = require('express');
const router = express.Router();
const {
  createSurvey,
  getSurveys,
  getSurveyById,
  getDashboard,
  updateSurvey,
  exportSurveyResponses,
  deleteSurvey,
} = require('../controllers/AdminSurveyController');
const { authenticate } = require('../middleware/auth');

// Anket yönetimi giriş yapmış tüm kullanıcılar için açıktır.
// Controller katmanında her kullanıcı yalnızca kendi anketlerini görür/yönetir.
router.use(authenticate);

// POST /api/admin/surveys - Anket oluştur
router.post('/surveys', createSurvey);

// GET /api/admin/surveys - Anketleri listele
router.get('/surveys', getSurveys);

// GET /api/admin/surveys/:id/export - Cevapları CSV olarak dışa aktar
router.get('/surveys/:id/export', exportSurveyResponses);

// GET /api/admin/surveys/:id/dashboard - Dashboard verisi
router.get('/surveys/:id/dashboard', getDashboard);

// PUT /api/admin/surveys/:id - Anket güncelle
router.put('/surveys/:id', updateSurvey);

// DELETE /api/admin/surveys/:id - Anket sil
router.delete('/surveys/:id', deleteSurvey);

// GET /api/admin/surveys/:id - Anket detayı
router.get('/surveys/:id', getSurveyById);

module.exports = router;
