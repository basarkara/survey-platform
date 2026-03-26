const sequelize = require('../config/database');
const Kullanici = require('./Kullanici');
const Anket = require('./Anket');
const Soru = require('./Soru');
const AnketYaniti = require('./AnketYaniti');
const Cevap = require('./Cevap');

// ============================================================
// İLİŞKİLER (Associations) - ER Diyagramına göre
// ============================================================

// Kullanıcı -> Anketler (1'e Çok: Admin birçok anket oluşturur)
Kullanici.hasMany(Anket, { foreignKey: 'admin_id', as: 'anketler' });
Anket.belongsTo(Kullanici, { foreignKey: 'admin_id', as: 'admin' });

// Anket -> Sorular (1'e Çok)
Anket.hasMany(Soru, { foreignKey: 'anket_id', as: 'sorular' });
Soru.belongsTo(Anket, { foreignKey: 'anket_id', as: 'anket' });

// Anket -> Anket_Yanıtları (1'e Çok)
Anket.hasMany(AnketYaniti, { foreignKey: 'anket_id', as: 'yanitlar' });
AnketYaniti.belongsTo(Anket, { foreignKey: 'anket_id', as: 'anket' });

// Kullanıcı -> Anket_Yanıtları (0'a Çok: Nullable, anonim katılım için)
Kullanici.hasMany(AnketYaniti, { foreignKey: 'kullanici_id', as: 'yanitlari' });
AnketYaniti.belongsTo(Kullanici, { foreignKey: 'kullanici_id', as: 'kullanici' });

// Anket_Yanıtı -> Cevaplar (1'e Çok)
AnketYaniti.hasMany(Cevap, { foreignKey: 'yanit_id', as: 'cevaplar' });
Cevap.belongsTo(AnketYaniti, { foreignKey: 'yanit_id', as: 'yanit' });

// Soru -> Cevaplar (1'e Çok)
Soru.hasMany(Cevap, { foreignKey: 'soru_id', as: 'cevaplar' });
Cevap.belongsTo(Soru, { foreignKey: 'soru_id', as: 'soru' });

module.exports = {
  sequelize,
  Kullanici,
  Anket,
  Soru,
  AnketYaniti,
  Cevap,
};
