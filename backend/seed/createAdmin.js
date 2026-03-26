/**
 * Seed Script - İlk Admin Kullanıcısını Oluştur
 * Kullanım: node seed/createAdmin.js
 */
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { sequelize, Kullanici } = require('../models');

const ADMIN_AD    = process.env.ADMIN_AD    || 'Platform Admin';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@platform.com';
const ADMIN_SIFRE = process.env.ADMIN_SIFRE || 'Admin123!';

async function createAdmin() {
  try {
    await sequelize.authenticate();
    console.log('✅ Veritabanı bağlantısı kuruldu.');

    const mevcut = await Kullanici.findOne({ where: { eposta: ADMIN_EMAIL } });
    if (mevcut) {
      console.log(`⚠️  Admin zaten mevcut: ${ADMIN_EMAIL}`);
      process.exit(0);
    }

    const sifre_hash = await bcrypt.hash(ADMIN_SIFRE, 10);
    const admin = await Kullanici.create({
      rol: 'admin',
      ad: ADMIN_AD,
      eposta: ADMIN_EMAIL,
      sifre_hash,
    });

    console.log('✅ Admin kullanıcısı oluşturuldu!');
    console.log(`   📧 E-posta : ${admin.eposta}`);
    console.log(`   🔑 Şifre   : ${ADMIN_SIFRE}`);
    console.log('   ⚠️  Şifreyi production ortamında değiştirin!');
  } catch (err) {
    console.error('❌ Seed hatası:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

createAdmin();
