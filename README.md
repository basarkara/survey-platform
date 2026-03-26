# 📊 Mobil Anket ve Araştırma Platformu — MVP

ER diyagramı ve Blueprint şartnamesine birebir uygun, tam stack SaaS MVP.

---

## 🏗️ Mimari Genel Bakış

```
survey-platform/
├── backend/                  # Node.js + Express.js + Sequelize ORM
│   ├── config/
│   │   └── database.js       # PostgreSQL bağlantısı
│   ├── controllers/
│   │   ├── AuthController.js         # Kayıt / Giriş / JWT
│   │   ├── AdminSurveyController.js  # CRUD + Dashboard API
│   │   └── PublicSurveyController.js # Token ile anket + cevap submit
│   ├── middleware/
│   │   └── auth.js           # JWT doğrulama + adminOnly + IP helper
│   ├── models/
│   │   ├── index.js          # Sequelize ilişkileri (associations)
│   │   ├── Kullanici.js      # Users — Enum(admin/user), bcrypt
│   │   ├── Anket.js          # Surveys — UUID token, kota, bitis_tarihi
│   │   ├── Soru.js           # Questions — JSONB secenekler
│   │   ├── AnketYaniti.js    # Survey_Responses — IP, nullable kullanici
│   │   └── Cevap.js          # Answers — JSONB cevap_verisi
│   ├── routes/
│   │   ├── auth.js           # /api/auth/*
│   │   ├── admin.js          # /api/admin/* (JWT + adminOnly)
│   │   └── public.js         # /api/public/* (opsiyonel JWT)
│   ├── migrations/
│   │   ├── 001_initial_schema.sql  # PostgreSQL migration (JSONB, Enum, Index)
│   │   └── run.js                  # Migration çalıştırıcı
│   ├── server.js             # Express app + middleware + port
│   └── .env.example          # Ortam değişkenleri şablonu
│
└── frontend/                 # React.js + Chart.js
    └── src/
        ├── services/api.js         # Axios instance + tüm API çağrıları
        ├── hooks/useAuth.js        # Global auth context
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx
        │   ├── SurveyParticipantPage.jsx  # One-screen-per-question UX
        │   └── admin/
        │       ├── AdminSurveysPage.jsx
        │       ├── AdminCreateSurveyPage.jsx
        │       └── AdminDashboardPage.jsx  # Gerçek zamanlı + Chart.js
        ├── components/admin/
        │   └── AdminLayout.jsx
        ├── App.js            # React Router + route guards
        └── index.css         # Mobile-first responsive CSS
```

---

## 🚀 Kurulum

### 1. Gereksinimler
- Node.js v18+
- PostgreSQL v14+ (yerel veya Docker)

### 2. Veritabanı Oluştur
```sql
CREATE DATABASE survey_platform;
```

### 3. Backend Kurulumu
```bash
cd backend
cp .env.example .env
# .env dosyasını düzenleyin (DB bilgileri, JWT secret)

npm install
npm run migrate      # SQL tabloları oluşturur
npm run dev          # http://localhost:5000
```

### 4. Frontend Kurulumu
```bash
cd frontend
npm install
npm start            # http://localhost:3000
```

### 5. İlk Admin Kullanıcısı
Migration sonrası veritabanından direkt admin ekleyin:
```sql
-- Önce bcrypt hash üretin (Node.js ile):
-- node -e "const b=require('bcryptjs'); b.hash('Admin123!',10).then(console.log)"

INSERT INTO "Kullanicilar" (rol, ad, eposta, sifre_hash)
VALUES ('admin', 'Platform Admin', 'admin@platform.com', '<hash>');
```

---

## 🔐 Güvenlik Özellikleri

| Özellik | Uygulama |
|---|---|
| Şifre hashleme | bcryptjs (salt rounds: 10) |
| Kimlik doğrulama | JWT Bearer Token (7 gün) |
| Admin koruması | `adminOnly` middleware |
| Mükerrer katılım | IP adresi + DB unique index |
| Rate limiting | express-rate-limit (login: 10/15dk) |
| Bitiş tarihi | API seviyesinde kontrol (GET + POST) |
| Kota | API seviyesinde kontrol (GET + POST) |
| SQL injection | Sequelize ORM parametreli sorgular |

---

## 📡 API Endpoint'leri

### Auth
| Method | URL | Açıklama |
|---|---|---|
| POST | `/api/auth/register` | Kullanıcı kaydı (user rolü) |
| POST | `/api/auth/login` | Giriş → JWT |
| GET | `/api/auth/me` | Mevcut kullanıcı bilgisi |

### Admin (JWT + Admin Yetkisi)
| Method | URL | Açıklama |
|---|---|---|
| POST | `/api/admin/surveys` | Anket + sorular oluştur |
| GET | `/api/admin/surveys` | Anket listesi |
| GET | `/api/admin/surveys/:id` | Anket detayı |
| GET | `/api/admin/surveys/:id/dashboard` | Canlı dashboard verisi |
| PUT | `/api/admin/surveys/:id` | Anket güncelle |
| DELETE | `/api/admin/surveys/:id` | Anket sil |

### Public (Anonim veya JWT)
| Method | URL | Açıklama |
|---|---|---|
| GET | `/api/public/surveys/share/:token` | Token ile anket getir |
| POST | `/api/public/surveys/start/:token` | Katılım oturumu başlat |
| POST | `/api/public/responses/submit` | Cevapları gönder |

---

## 📱 Frontend Rotaları

| Rota | Sayfa | Yetki |
|---|---|---|
| `/s/:token` | Katılımcı Anketi | Herkese açık |
| `/login` | Giriş | Sadece misafir |
| `/register` | Kayıt | Sadece misafir |
| `/admin` | Anket Listesi | Admin |
| `/admin/surveys/new` | Anket Oluştur | Admin |
| `/admin/surveys/:id/dashboard` | Canlı Dashboard | Admin |

---

## 🗃️ Veri Modeli (ER Diyagramına Göre)

### JSONB Formatları

**Sorular.secenekler** (multiple_choice için):
```json
["Çok memnunum", "Memnunum", "Nötrüm", "Memnun değilim"]
```

**Cevaplar.cevap_verisi**:
```json
{ "value": 4 }            // star / scale
{ "value": true }         // boolean
{ "selected": ["A", "C"]} // multiple_choice
{ "text": "Cevap metni" } // text
```

---

## 🧩 Soru Tipleri

| Tip | UI Bileşeni | Dashboard Grafik |
|---|---|---|
| `star` | 5 yıldız | Bar grafik + ortalama |
| `boolean` | EVET/HAYIR butonları | Pasta grafik |
| `scale` | 1-10 slider | Bar grafik + ortalama |
| `multiple_choice` | Seçenek listesi | Pasta grafik + yüzde |
| `text` | Textarea | Metin listesi |
