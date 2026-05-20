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
-- 4. ANKET_YANITLARI (Survey_Responses) Tablosu
-- ============================================================
CREATE TABLE IF NOT EXISTS `Anket_Yanitlari` (
  `id`                INT           NOT NULL AUTO_INCREMENT,
  `anket_id`          INT           NOT NULL,
  `kullanici_id`      INT           DEFAULT NULL,
  `ip_adresi`         VARCHAR(45)   NOT NULL,
  `baslangic_tarihi`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `bitis_tarihi`      DATETIME      DEFAULT NULL,
  `createdAt`         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_anket_yanitlari_anket_id` (`anket_id`),
  INDEX `idx_anket_yanitlari_kullanici_id` (`kullanici_id`),
  INDEX `idx_anket_yanitlari_ip` (`ip_adresi`),
  INDEX `idx_anket_yanitlari_anket_ip` (`anket_id`, `ip_adresi`),
  CONSTRAINT `fk_yanitlar_anket`
    FOREIGN KEY (`anket_id`) REFERENCES `Anketler` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_yanitlar_kullanici`
    FOREIGN KEY (`kullanici_id`) REFERENCES `Kullanicilar` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Katılımcı oturumları - anonim veya kayıtlı';

-- ============================================================
-- Mükerrer tamamlanmış katılım kontrolü
-- PostgreSQL partial unique index karşılığı:
-- MariaDB partial index desteklemez, trigger ile sağlanır
-- ============================================================
DELIMITER $$

CREATE TRIGGER `trg_tek_tamamlanmis_katilim`
BEFORE INSERT ON `Anket_Yanitlari`
FOR EACH ROW
BEGIN
  DECLARE v_count INT;
  IF NEW.bitis_tarihi IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM `Anket_Yanitlari`
    WHERE `anket_id`   = NEW.anket_id
      AND `ip_adresi`  = NEW.ip_adresi
      AND `bitis_tarihi` IS NOT NULL;
    IF v_count > 0 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Bu IP adresi bu anketi zaten tamamlamış.';
    END IF;
  END IF;
END$$

DELIMITER ;

-- ============================================================
-- 5. CEVAPLAR (Answers) Tablosu
-- ============================================================
CREATE TABLE IF NOT EXISTS `Cevaplar` (
  `id`            INT     NOT NULL AUTO_INCREMENT,
  `yanit_id`      INT     NOT NULL,
  `soru_id`       INT     NOT NULL,
  `cevap_verisi`  JSON    NOT NULL,
  `createdAt`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_cevaplar_yanit_id` (`yanit_id`),
  INDEX `idx_cevaplar_soru_id` (`soru_id`),
  CONSTRAINT `fk_cevaplar_yanit`
    FOREIGN KEY (`yanit_id`) REFERENCES `Anket_Yanitlari` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cevaplar_soru`
    FOREIGN KEY (`soru_id`) REFERENCES `Sorular` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Her soruya verilen cevaplar - JSON ile esnek format';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Örnek Admin Kullanıcısı (Şifre: Admin123! - bcrypt hash)
-- Gerçek ortamda bu satırı kaldırın veya değiştirin
-- ============================================================
-- INSERT INTO `Kullanicilar` (rol, ad, eposta, sifre_hash)
-- VALUES ('admin', 'Platform Admin', 'admin@platform.com', '$2b$10$...');
