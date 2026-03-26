const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Kullanici = sequelize.define('Kullanicilar', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  rol: {
    type: DataTypes.ENUM('admin', 'user'),
    allowNull: false,
    defaultValue: 'user',
  },
  ad: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  eposta: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  sifre_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  olusturulma_tarihi: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'Kullanicilar',
  timestamps: true,
  createdAt: 'olusturulma_tarihi',
  updatedAt: 'updatedAt',
});

module.exports = Kullanici;
