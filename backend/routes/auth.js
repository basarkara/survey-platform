const express = require('express');
const router = express.Router();
const { register, login, me } = require('../controllers/AuthController');
const { authenticate } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Login rate limiter - brute force koruması
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 10, // 10 deneme
  message: { error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', loginLimiter, login);

// GET /api/auth/me (JWT korumalı)
router.get('/me', authenticate, me);

module.exports = router;
