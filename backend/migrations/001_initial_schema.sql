-- ============================================================
-- Mobil Anket Platformu - MariaDB Migration
-- Orijinal PostgreSQL şemasının birebir MariaDB karşılığı
-- Dönüşümler:
--   SERIAL                    → INT AUTO_INCREMENT
--   UUID tip + gen_random_uuid() → CHAR(36) DEFAULT (UUID())
--   JSONB                     → JSON
--   BOOLEAN                   → TINYINT(1)
--   TIMESTAMP WITH TIME ZONE  → DATETIME
--   CREATE TYPE ENUM          → inline ENUM
--   JSONB GIN index           → normal INDEX (MariaDB JSON index alternatifi)
--   Partial unique index      → UNIQUE + trigger ile karşılandı
--   COMMENT ON TABLE          → inline COMMENT
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. KULLANICILAR (Users) Tablosu
-- ============================================================
CREATE TABLE IF NOT EXISTS `Kullanicilar` (
  `id`                   INT           NOT NULL AUTO_INCREMENT,
  `rol`                  ENUM('admin','user') NOT NULL DEFAULT 'user',
  `ad`                   VARCHAR(100)  NOT NULL,
  `eposta`               VARCHAR(255)  NOT NULL UNIQUE,
  `sifre_hash`           VARCHAR(255)  NOT NULL,
  `olusturulma_tarihi`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_kullanicilar_eposta` (`eposta`),
  INDEX `idx_kullanicilar_rol` (`rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Platform kullanıcıları - admin ve user rolleri';

-- ============================================================
-- 2. ANKETLER (Surveys) Tablosu
-- ============================================================
CREATE TABLE IF NOT EXISTS `Anketler` (
  `id`                   INT           NOT NULL AUTO_INCREMENT,
  `admin_id`             INT           NOT NULL,
  `baslik`               VARCHAR(255)  NOT NULL,
  `aciklama`             TEXT,
  `paylasim_token`       CHAR(36)      NOT NULL UNIQUE DEFAULT (UUID()),
  `aktif`                TINYINT(1)    NOT NULL DEFAULT 1,
  `bitis_tarihi`         DATETIME      DEFAULT NULL,
  `kota`                 INT           DEFAULT NULL,
  `olusturulma_tarihi`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_anketler_admin_id` (`admin_id`),
  INDEX `idx_anketler_paylasim_token` (`paylasim_token`),
  INDEX `idx_anketler_aktif` (`aktif`),
  CONSTRAINT `fk_anketler_admin`
    FOREIGN KEY (`admin_id`) REFERENCES `Kullanicilar` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Adminlerin oluşturduğu anketler';

-- ============================================================
-- 3. SORULAR (Questions) Tablosu
-- ============================================================
CREATE TABLE IF NOT EXISTS `Sorular` (
  `id`          INT           NOT NULL AUTO_INCREMENT,
  `anket_id`    INT           NOT NULL,
  `soru_metni`  TEXT          NOT NULL,
  `soru_tipi`   VARCHAR(50)   NOT NULL,
  `zorunlu`     TINYINT(1)    NOT NULL DEFAULT 0,
  `sira_no`     INT           NOT NULL DEFAULT 1,
  `secenekler`  JSON          DEFAULT NULL,
  `createdAt`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_sorular_anket_id` (`anket_id`),
  INDEX `idx_sorular_sira_no` (`sira_no`),
  CONSTRAINT `fk_sorular_anket`
    FOREIGN KEY (`anket_id`) REFERENCES `Anketler` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Ankete ait sorular - JSON ile esnek seçenek yapısı';

-- ============================================================