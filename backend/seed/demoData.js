/**
 * Demo Seed - Örnek anket ve veriler oluşturur
 * Kullanım: node seed/demoData.js
 */
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { sequelize, Kullanici, Anket, Soru, AnketYaniti, Cevap } = require('../models');

async function createDemoData() {
  const t = await sequelize.transaction();
  try {
    await sequelize.authenticate();
    console.log('✅ Bağlantı kuruldu. Demo veriler oluşturuluyor...\n');

    // 1. Admin kullanıcı
    let admin = await Kullanici.findOne({ where: { eposta: 'demo@admin.com' }, transaction: t });
    if (!admin) {
      admin = await Kullanici.create({
        rol: 'admin', ad: 'Demo Admin',
        eposta: 'demo@admin.com',
        sifre_hash: await bcrypt.hash('Demo123!', 10),
      }, { transaction: t });
      console.log('👤 Admin: demo@admin.com / Demo123!');
    }

    // 2. Normal kullanıcı
    let user = await Kullanici.findOne({ where: { eposta: 'user@test.com' }, transaction: t });
    if (!user) {
      user = await Kullanici.create({
        rol: 'user', ad: 'Test Kullanıcı',
        eposta: 'user@test.com',
        sifre_hash: await bcrypt.hash('User123!', 10),
      }, { transaction: t });
      console.log('👤 User : user@test.com / User123!');
    }

    // 3. Demo anket
    const anket = await Anket.create({
      admin_id: admin.id,
      baslik: 'Müşteri Memnuniyet Anketi 2025',
      aciklama: 'Hizmetlerimizi geliştirmemize yardımcı olun.',
      aktif: true,
      kota: 100,
    }, { transaction: t });
    console.log(`\n📋 Anket oluşturuldu: "${anket.baslik}"`);
    console.log(`   🔗 Link: /s/${anket.paylasim_token}`);

    // 4. Sorular (tüm tipler)
    const sorular = await Soru.bulkCreate([
      { anket_id: anket.id, soru_metni: 'Genel memnuniyetinizi değerlendirin.', soru_tipi: 'star', zorunlu: true, sira_no: 1 },
      { anket_id: anket.id, soru_metni: 'Hizmeti bir arkadaşınıza önerir misiniz?', soru_tipi: 'boolean', zorunlu: true, sira_no: 2 },
      { anket_id: anket.id, soru_metni: 'Tekrar alışveriş yapma olasılığınız nedir? (1=Düşük, 10=Yüksek)', soru_tipi: 'scale', zorunlu: false, sira_no: 3 },
      { anket_id: anket.id, soru_metni: 'Sizi en çok ne memnun etti?', soru_tipi: 'multiple_choice', zorunlu: false, sira_no: 4,
        secenekler: ['Hız', 'Fiyat', 'Kalite', 'Müşteri hizmetleri', 'Kolay kullanım'] },
      { anket_id: anket.id, soru_metni: 'Geliştirilmesini istediğiniz bir şey var mı?', soru_tipi: 'text', zorunlu: false, sira_no: 5 },
    ], { transaction: t });
    console.log(`   ❓ ${sorular.length} soru eklendi.`);

    // 5. Örnek yanıtlar (5 farklı IP)
    const ornekCevaplar = [
      { starVal: 5, boolVal: true,  scaleVal: 9, mc: ['Kalite', 'Hız'],       txt: 'Harika bir deneyimdi!' },
      { starVal: 4, boolVal: true,  scaleVal: 8, mc: ['Fiyat'],               txt: 'Fiyat performans çok iyi.' },
      { starVal: 3, boolVal: false, scaleVal: 5, mc: ['Müşteri hizmetleri'],  txt: 'Teslimat biraz geç kaldı.' },
      { starVal: 5, boolVal: true,  scaleVal: 10, mc: ['Hız', 'Kolay kullanım'], txt: null },
      { starVal: 4, boolVal: true,  scaleVal: 7, mc: ['Kalite'],              txt: 'Genel olarak memnunum.' },
    ];

    for (let i = 0; i < ornekCevaplar.length; i++) {
      const oc = ornekCevaplar[i];
      const gun = new Date();
      gun.setDate(gun.getDate() - (4 - i)); // Son 5 güne yay

      const yanit = await AnketYaniti.create({
        anket_id: anket.id,
        kullanici_id: i === 0 ? user.id : null, // İlk kayıtlı, diğerleri anonim
        ip_adresi: `192.168.1.${10 + i}`,
        baslangic_tarihi: gun,
        bitis_tarihi: gun,
      }, { transaction: t });

      const cevapListesi = [
        { yanit_id: yanit.id, soru_id: sorular[0].id, cevap_verisi: { value: oc.starVal } },
        { yanit_id: yanit.id, soru_id: sorular[1].id, cevap_verisi: { value: oc.boolVal } },
        { yanit_id: yanit.id, soru_id: sorular[2].id, cevap_verisi: { value: oc.scaleVal } },
        { yanit_id: yanit.id, soru_id: sorular[3].id, cevap_verisi: { selected: oc.mc } },
      ];
      if (oc.txt) {
        cevapListesi.push({ yanit_id: yanit.id, soru_id: sorular[4].id, cevap_verisi: { text: oc.txt } });
      }
      await Cevap.bulkCreate(cevapListesi, { transaction: t });
    }
    console.log(`   👥 5 örnek katılım oluşturuldu.`);

    await t.commit();
    console.log('\n🎉 Demo veriler başarıyla yüklendi!');
    console.log(`\n📊 Dashboard: http://localhost:3000/admin/surveys/${anket.id}/dashboard`);
  } catch (err) {
    await t.rollback();
    console.error('❌ Demo seed hatası:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

createDemoData();
