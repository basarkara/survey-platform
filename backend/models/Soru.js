const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Soru = sequelize.define('Sorular', {
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
  soru_metni: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  soru_tipi: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: [['star', 'boolean', 'scale', 'multiple_choice', 'multi_select', 'text']],
    },
  },
  zorunlu: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  sira_no: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  secenekler: {
    type: DataTypes.JSONB, // PostgreSQL JSONB - performanslı JSON
    allowNull: true,       // Nullable - seçenekli soru tipleri için
  },
}, {
  tableName: 'Sorular',
  timestamps: true,
});

module.exports = Soru;
