const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AnketYaniti = sequelize.define('Anket_Yanitlari', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  anket_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Anketler', key: 'id' },
  },
  kullanici_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Nullable - Anonim katılım için
    references: { model: 'Kullanicilar', key: 'id' },
  },
  ip_adresi: {
    type: DataTypes.STRING(45), // IPv6 için 45 karakter
    allowNull: false,
  },
  baslangic_tarihi: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  bitis_tarihi: {
    type: DataTypes.DATE,
    allowNull: true, // Nullable - Dolu ise "tamamlanmış katılım"
  },
}, {
  tableName: 'Anket_Yanitlari',
  timestamps: true,
});

module.exports = AnketYaniti;
