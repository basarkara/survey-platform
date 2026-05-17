const express = require('express');
const router = express.Router();
const {
  createSurvey,
  getSurveys,
  getSurveyById,
  getDashboard,
  getCrossTabAnalysis,
  updateSurvey,
  duplicateSurvey,
  exportSurveyResponses,
  deleteSurvey,
} = require('../controllers/AdminSurveyController');
const { authenticate, adminOnly } = require('../middleware/auth');

// Anket yönetimi yalnızca admin rolündeki kullanıcılar için açıktır.
// Controller katmanında admin yine yalnızca kendi anketlerini görür/yönetir.
router.use(authenticate);
router.use(adminOnly);

// POST /api/admin/surveys - Anket oluştur
router.post('/surveys', createSurvey);

// GET /api/admin/surveys - Anketleri listele
router.get('/surveys', getSurveys);

// GET /api/admin/surveys/:id/export - Cevapları CSV olarak dışa aktar
router.get('/surveys/:id/export', exportSurveyResponses);

// GET /api/admin/surveys/:id/dashboard - Dashboard verisi
router.get('/surveys/:id/dashboard', getDashboard);

// GET /api/admin/surveys/:id/crosstab - İki soru arasında ilişki analizi
router.get('/surveys/:id/crosstab', getCrossTabAnalysis);

// POST /api/admin/surveys/:id/duplicate - Anketi çoğalt
router.post('/surveys/:id/duplicate', duplicateSurvey);

// PUT /api/admin/surveys/:id - Anket güncelle
router.put('/surveys/:id', updateSurvey);

// DELETE /api/admin/surveys/:id - Anket sil
router.delete('/surveys/:id', deleteSurvey);

// GET /api/admin/surveys/:id - Anket detayı
router.get('/surveys/:id', getSurveyById);

module.exports = router;
