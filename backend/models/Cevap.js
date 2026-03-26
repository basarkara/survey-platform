const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cevap = sequelize.define('Cevaplar', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  yanit_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Anket_Yanitlari', key: 'id' },
  },
  soru_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Sorular', key: 'id' },
  },
  cevap_verisi: {
    type: DataTypes.JSONB, // PostgreSQL JSONB - esnek cevap formatı
    allowNull: false,
    // Örnek: { "value": 4 } (star/scale için)
    // Örnek: { "value": true } (boolean için)
    // Örnek: { "selected": ["Seçenek A", "Seçenek C"] } (multiple_choice için)
    // Örnek: { "text": "Cevap metni" } (text için)
  },
}, {
  tableName: 'Cevaplar',
  timestamps: true,
});

module.exports = Cevap;
