const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Anket = sequelize.define('Anketler', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  admin_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Kullanicilar', key: 'id' },
  },
  baslik: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  aciklama: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  paylasim_token: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    defaultValue: DataTypes.UUIDV4,
  },
  aktif: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  bitis_tarihi: {
    type: DataTypes.DATE,
    allowNull: true, // Nullable
  },
  kota: {
    type: DataTypes.INTEGER,
    allowNull: true, // Nullable
  },
  olusturulma_tarihi: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'Anketler',
  timestamps: true,
  createdAt: 'olusturulma_tarihi',
  updatedAt: 'updatedAt',
});

module.exports = Anket;
