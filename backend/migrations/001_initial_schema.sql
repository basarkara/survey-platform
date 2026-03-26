-- ============================================================
-- Mobil Anket Platformu - PostgreSQL Migration
-- ER Diyagramına birebir uygun şema
-- ============================================================

-- Enum tip: Kullanıcı rolleri
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 1. KULLANICILAR (Users) Tablosu
-- ============================================================
CREATE TABLE IF NOT EXISTS "Kullanicilar" (
  "id"                SERIAL        PRIMARY KEY,
  "rol"               user_role     NOT NULL DEFAULT 'user',
  "ad"                VARCHAR(100)  NOT NULL,
  "eposta"            VARCHAR(255)  NOT NULL UNIQUE,
  "sifre_hash"        VARCHAR(255)  NOT NULL,
  "olusturulma_tarihi" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kullanicilar_eposta ON "Kullanicilar"("eposta");
CREATE INDEX IF NOT EXISTS idx_kullanicilar_rol ON "Kullanicilar"("rol");

-- ============================================================
-- 2. ANKETLER (Surveys) Tablosu
-- ============================================================
CREATE TABLE IF NOT EXISTS "Anketler" (
  "id"                SERIAL        PRIMARY KEY,
  "admin_id"          INTEGER       NOT NULL REFERENCES "Kullanicilar"("id") ON DELETE CASCADE,
  "baslik"            VARCHAR(255)  NOT NULL,
  "aciklama"          TEXT,
  "paylasim_token"    UUID          NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  "aktif"             BOOLEAN       NOT NULL DEFAULT true,
  "bitis_tarihi"      TIMESTAMP WITH TIME ZONE,       -- Nullable
  "kota"              INTEGER,                         -- Nullable
  "olusturulma_tarihi" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anketler_admin_id ON "Anketler"("admin_id");
CREATE INDEX IF NOT EXISTS idx_anketler_paylasim_token ON "Anketler"("paylasim_token");
CREATE INDEX IF NOT EXISTS idx_anketler_aktif ON "Anketler"("aktif");

-- ============================================================
-- 3. SORULAR (Questions) Tablosu
-- ============================================================
CREATE TABLE IF NOT EXISTS "Sorular" (
  "id"          SERIAL        PRIMARY KEY,
  "anket_id"    INTEGER       NOT NULL REFERENCES "Anketler"("id") ON DELETE CASCADE,
  "soru_metni"  TEXT          NOT NULL,
  "soru_tipi"   VARCHAR(50)   NOT NULL, -- 'star', 'boolean', 'scale', 'multiple_choice', 'text'
  "zorunlu"     BOOLEAN       NOT NULL DEFAULT false,
  "sira_no"     INTEGER       NOT NULL DEFAULT 1,
  "secenekler"  JSONB,                  -- Nullable - Sadece multiple_choice için kullanılır
  "createdAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sorular_anket_id ON "Sorular"("anket_id");
CREATE INDEX IF NOT EXISTS idx_sorular_sira_no ON "Sorular"("sira_no");

-- ============================================================
-- 4. ANKET_YANITLARI (Survey_Responses) Tablosu
-- ============================================================
CREATE TABLE IF NOT EXISTS "Anket_Yanitlari" (
  "id"                SERIAL        PRIMARY KEY,
  "anket_id"          INTEGER       NOT NULL REFERENCES "Anketler"("id") ON DELETE CASCADE,
  "kullanici_id"      INTEGER       REFERENCES "Kullanicilar"("id") ON DELETE SET NULL, -- Nullable (Anonim)
  "ip_adresi"         VARCHAR(45)   NOT NULL, -- IPv4 ve IPv6 destekli
  "baslangic_tarihi"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "bitis_tarihi"      TIMESTAMP WITH TIME ZONE,       -- Nullable - Dolu ise "tamamlanmış"
  "createdAt"         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anket_yanitlari_anket_id ON "Anket_Yanitlari"("anket_id");
CREATE INDEX IF NOT EXISTS idx_anket_yanitlari_kullanici_id ON "Anket_Yanitlari"("kullanici_id");
CREATE INDEX IF NOT EXISTS idx_anket_yanitlari_ip ON "Anket_Yanitlari"("ip_adresi");
-- Mükerrer katılım kontrolü için bileşik index
CREATE INDEX IF NOT EXISTS idx_anket_yanitlari_anket_ip ON "Anket_Yanitlari"("anket_id", "ip_adresi");

-- ============================================================
-- 5. CEVAPLAR (Answers) Tablosu
-- ============================================================
CREATE TABLE IF NOT EXISTS "Cevaplar" (
  "id"          SERIAL        PRIMARY KEY,
  "yanit_id"    INTEGER       NOT NULL REFERENCES "Anket_Yanitlari"("id") ON DELETE CASCADE,
  "soru_id"     INTEGER       NOT NULL REFERENCES "Sorular"("id") ON DELETE CASCADE,
  "cevap_verisi" JSONB        NOT NULL, -- Esnek cevap formatı: {value: ...} veya {selected: [...]}
  "createdAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cevaplar_yanit_id ON "Cevaplar"("yanit_id");
CREATE INDEX IF NOT EXISTS idx_cevaplar_soru_id ON "Cevaplar"("soru_id");
-- JSONB GIN index - hızlı JSON sorguları için
CREATE INDEX IF NOT EXISTS idx_cevaplar_cevap_verisi ON "Cevaplar" USING GIN("cevap_verisi");

-- ============================================================
-- CONSTRAINT: Her anket için her IP'den sadece 1 tamamlanmış katılım
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_tamamlanmis_katilim
  ON "Anket_Yanitlari"("anket_id", "ip_adresi")
  WHERE "bitis_tarihi" IS NOT NULL;

-- ============================================================
-- Örnek Admin Kullanıcısı (Şifre: Admin123! - bcrypt hash)
-- Gerçek ortamda bu satırı kaldırın veya değiştirin
-- ============================================================
-- INSERT INTO "Kullanicilar" (rol, ad, eposta, sifre_hash)
-- VALUES ('admin', 'Platform Admin', 'admin@platform.com', '$2b$10$...');

COMMENT ON TABLE "Kullanicilar" IS 'Platform kullanıcıları - admin ve user rolleri';
COMMENT ON TABLE "Anketler" IS 'Adminlerin oluşturduğu anketler';
COMMENT ON TABLE "Sorular" IS 'Ankete ait sorular - JSONB ile esnek seçenek yapısı';
COMMENT ON TABLE "Anket_Yanitlari" IS 'Katılımcı oturumları - anonim veya kayıtlı';
COMMENT ON TABLE "Cevaplar" IS 'Her soruya verilen cevaplar - JSONB ile esnek format';
