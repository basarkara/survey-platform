const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('✅ PostgreSQL bağlantısı kuruldu.');

    const migrationFile = path.join(__dirname, '001_initial_schema.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    await client.query(sql);
    console.log('✅ Migration başarıyla tamamlandı!');
    console.log('📊 Tablolar oluşturuldu: Kullanicilar, Anketler, Sorular, Anket_Yanitlari, Cevaplar');
  } catch (err) {
    console.error('❌ Migration hatası:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
