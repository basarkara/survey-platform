/**
 * Cross-tab demo seed
 * Kullanım: npm run seed:crosstab-demo
 *
 * Sunum için anlamlı ilişki barındıran 3 anket oluşturur.
 */
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
require('dotenv').config();

const { sequelize, Kullanici, Anket, Soru, AnketYaniti, Cevap } = require('../models');

const DEMO_USER = {
  ad: 'Sunum Demo Kullanıcısı',
  eposta: 'sunum@pollify.demo',
  sifre: 'Sunum123!',
};

const DEMO_TITLES = [
  '[DEMO] Mağaza Deneyimi ve Tekrar Satın Alma',
  '[DEMO] Kampüs Uygulama Kullanımı',
  '[DEMO] Şehir ve Ürün Tercihi Analizi',
];

async function clearOldDemoSurveys(userId, transaction) {
  const oldSurveys = await Anket.findAll({
    where: {
      admin_id: userId,
      baslik: { [Op.in]: DEMO_TITLES },
    },
    attributes: ['id'],
    transaction,
  });

  const surveyIds = oldSurveys.map((survey) => survey.id);
  if (surveyIds.length === 0) return;

  const questions = await Soru.findAll({
    where: { anket_id: { [Op.in]: surveyIds } },
    attributes: ['id'],
    transaction,
  });
  const questionIds = questions.map((question) => question.id);

  const responses = await AnketYaniti.findAll({
    where: { anket_id: { [Op.in]: surveyIds } },
    attributes: ['id'],
    transaction,
  });
  const responseIds = responses.map((response) => response.id);

  if (responseIds.length) await Cevap.destroy({ where: { yanit_id: { [Op.in]: responseIds } }, transaction });
  if (questionIds.length) await Cevap.destroy({ where: { soru_id: { [Op.in]: questionIds } }, transaction });
  await AnketYaniti.destroy({ where: { anket_id: { [Op.in]: surveyIds } }, transaction });
  await Soru.destroy({ where: { anket_id: { [Op.in]: surveyIds } }, transaction });
  await Anket.destroy({ where: { id: { [Op.in]: surveyIds } }, transaction });
}

async function getOrCreateDemoUser(transaction) {
  let user = await Kullanici.findOne({ where: { eposta: DEMO_USER.eposta }, transaction });
  if (user) {
    if (user.rol !== 'admin') {
      user.rol = 'admin';
      await user.save({ transaction });
    }
    return user;
  }

  user = await Kullanici.create({
    rol: 'admin',
    ad: DEMO_USER.ad,
    eposta: DEMO_USER.eposta,
    sifre_hash: await bcrypt.hash(DEMO_USER.sifre, 10),
  }, { transaction });

  return user;
}

async function createSurvey({ ownerId, title, description, questions, responses, ipPrefix, transaction }) {
  const survey = await Anket.create({
    admin_id: ownerId,
    baslik: title,
    aciklama: description,
    aktif: true,
    kota: null,
  }, { transaction });

  const createdQuestions = [];
  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];
    const created = await Soru.create({
      anket_id: survey.id,
      soru_metni: question.text,
      soru_tipi: question.type,
      zorunlu: true,
      sira_no: index + 1,
      secenekler: question.options || null,
    }, { transaction });
    createdQuestions.push(created);
  }

  const questionByKey = Object.fromEntries(questions.map((question, index) => [question.key, createdQuestions[index]]));

  for (let index = 0; index < responses.length; index += 1) {
    const submittedAt = new Date();
    submittedAt.setDate(submittedAt.getDate() - Math.floor((responses.length - index) / 8));
    submittedAt.setHours(10 + (index % 8), (index * 7) % 60, 0, 0);

    const response = await AnketYaniti.create({
      anket_id: survey.id,
      kullanici_id: null,
      ip_adresi: `${ipPrefix}.${index + 1}`,
      baslangic_tarihi: new Date(submittedAt.getTime() - 1000 * 60 * 3),
      bitis_tarihi: submittedAt,
    }, { transaction });

    const answers = Object.entries(responses[index]).map(([key, value]) => ({
      yanit_id: response.id,
      soru_id: questionByKey[key].id,
      cevap_verisi: toAnswerPayload(questionByKey[key].soru_tipi, value),
    }));

    await Cevap.bulkCreate(answers, { transaction });
  }

  return { survey, questions: createdQuestions };
}

function toAnswerPayload(type, value) {
  if (type === 'boolean') return { value: value === 'Evet' || value === true };
  if (type === 'multiple_choice') return { selected: [value] };
  if (type === 'multi_select') return { selected: Array.isArray(value) ? value : [value] };
  if (type === 'scale' || type === 'star') return { value };
  return { text: String(value) };
}

function buildRetailResponses() {
  const rows = [];
  addMany(rows, 26, { gender: 'Kadın', repurchase: 'Evet', satisfaction: 5, channel: 'Kiosk', category: 'Kozmetik' });
  addMany(rows, 8, { gender: 'Kadın', repurchase: 'Hayır', satisfaction: 3, channel: 'Link', category: 'Giyim' });
  addMany(rows, 13, { gender: 'Erkek', repurchase: 'Evet', satisfaction: 4, channel: 'Kiosk', category: 'Elektronik' });
  addMany(rows, 21, { gender: 'Erkek', repurchase: 'Hayır', satisfaction: 2, channel: 'Link', category: 'Elektronik' });
  addMany(rows, 4, { gender: 'Diğer', repurchase: 'Evet', satisfaction: 4, channel: 'Kiosk', category: 'Giyim' });
  addMany(rows, 3, { gender: 'Diğer', repurchase: 'Hayır', satisfaction: 2, channel: 'Link', category: 'Kozmetik' });
  return rows;
}

function buildCampusResponses() {
  const rows = [];
  addMany(rows, 18, { age: '18-24', apps: ['Instagram', 'TikTok', 'YouTube'], recommend: 'Evet', screenTime: 9 });
  addMany(rows, 10, { age: '18-24', apps: ['Instagram', 'YouTube'], recommend: 'Evet', screenTime: 8 });
  addMany(rows, 7, { age: '18-24', apps: ['LinkedIn', 'YouTube'], recommend: 'Hayır', screenTime: 5 });
  addMany(rows, 6, { age: '25-34', apps: ['Instagram', 'YouTube'], recommend: 'Evet', screenTime: 7 });
  addMany(rows, 16, { age: '25-34', apps: ['LinkedIn', 'YouTube'], recommend: 'Evet', screenTime: 6 });
  addMany(rows, 9, { age: '35+', apps: ['LinkedIn'], recommend: 'Hayır', screenTime: 4 });
  addMany(rows, 9, { age: '35+', apps: ['YouTube'], recommend: 'Hayır', screenTime: 3 });
  return rows;
}

function buildCityProductResponses() {
  const rows = [];
  addMany(rows, 20, { city: 'İstanbul', product: 'Premium Paket', nps: 9, support: 'Evet' });
  addMany(rows, 8, { city: 'İstanbul', product: 'Standart Paket', nps: 7, support: 'Evet' });
  addMany(rows, 5, { city: 'İstanbul', product: 'Ekonomik Paket', nps: 4, support: 'Hayır' });
  addMany(rows, 6, { city: 'Ankara', product: 'Premium Paket', nps: 8, support: 'Evet' });
  addMany(rows, 20, { city: 'Ankara', product: 'Standart Paket', nps: 6, support: 'Evet' });
  addMany(rows, 7, { city: 'Ankara', product: 'Ekonomik Paket', nps: 4, support: 'Hayır' });
  addMany(rows, 4, { city: 'İzmir', product: 'Premium Paket', nps: 7, support: 'Evet' });
  addMany(rows, 8, { city: 'İzmir', product: 'Standart Paket', nps: 6, support: 'Evet' });
  addMany(rows, 18, { city: 'İzmir', product: 'Ekonomik Paket', nps: 3, support: 'Hayır' });
  return rows;
}

function addMany(target, count, base) {
  for (let i = 0; i < count; i += 1) {
    target.push({ ...base });
  }
}

async function createCrossTabDemoData() {
  const transaction = await sequelize.transaction();

  try {
    await sequelize.authenticate();
    const user = await getOrCreateDemoUser(transaction);
    await clearOldDemoSurveys(user.id, transaction);

    const created = [];
    created.push(await createSurvey({
      ownerId: user.id,
      title: DEMO_TITLES[0],
      description: 'Cinsiyet, kiosk/link katılımı ve tekrar satın alma arasındaki ilişkiyi göstermek için hazırlanmış demo veri.',
      ipPrefix: '10.10.1',
      transaction,
      questions: [
        { key: 'gender', text: 'Cinsiyetiniz nedir?', type: 'multiple_choice', options: ['Kadın', 'Erkek', 'Diğer'] },
        { key: 'repurchase', text: 'Bu mağazadan tekrar satın alır mısınız?', type: 'boolean' },
        { key: 'satisfaction', text: 'Mağaza deneyimini 1-5 arasında puanlayın.', type: 'star' },
        { key: 'channel', text: 'Bu ankete hangi kanaldan katıldınız?', type: 'multiple_choice', options: ['Kiosk', 'Link'] },
        { key: 'category', text: 'En çok hangi ürün kategorisi ilginizi çekti?', type: 'multiple_choice', options: ['Kozmetik', 'Elektronik', 'Giyim'] },
      ],
      responses: buildRetailResponses(),
    }));

    created.push(await createSurvey({
      ownerId: user.id,
      title: DEMO_TITLES[1],
      description: 'Yaş grubu ile kullanılan uygulamalar ve tavsiye eğilimi arasındaki ilişkiyi göstermek için hazırlanmış demo veri.',
      ipPrefix: '10.10.2',
      transaction,
      questions: [
        { key: 'age', text: 'Yaş grubunuz nedir?', type: 'multiple_choice', options: ['18-24', '25-34', '35+'] },
        { key: 'apps', text: 'Aşağıdaki uygulamaların hangilerini kullandınız?', type: 'multi_select', options: ['Instagram', 'TikTok', 'YouTube', 'LinkedIn'] },
        { key: 'recommend', text: 'Kampüs uygulamasını arkadaşınıza önerir misiniz?', type: 'boolean' },
        { key: 'screenTime', text: 'Günlük uygulama kullanım yoğunluğunuz nedir? (1-10)', type: 'scale' },
      ],
      responses: buildCampusResponses(),
    }));

    created.push(await createSurvey({
      ownerId: user.id,
      title: DEMO_TITLES[2],
      description: 'Şehir ile ürün paketi tercihi ve destek memnuniyeti arasındaki ilişkiyi göstermek için hazırlanmış demo veri.',
      ipPrefix: '10.10.3',
      transaction,
      questions: [
        { key: 'city', text: 'Hangi şehirde yaşıyorsunuz?', type: 'multiple_choice', options: ['İstanbul', 'Ankara', 'İzmir'] },
        { key: 'product', text: 'Hangi ürün paketini tercih edersiniz?', type: 'multiple_choice', options: ['Ekonomik Paket', 'Standart Paket', 'Premium Paket'] },
        { key: 'nps', text: 'Ürünü tavsiye etme olasılığınız nedir? (1-10)', type: 'scale' },
        { key: 'support', text: 'Destek ekibinden memnun kaldınız mı?', type: 'boolean' },
      ],
      responses: buildCityProductResponses(),
    }));

    await transaction.commit();

    console.log('\n✅ Çapraz tablo demo verileri oluşturuldu.');
    console.log(`👤 Demo kullanıcı: ${DEMO_USER.eposta} / ${DEMO_USER.sifre}`);
    created.forEach(({ survey, questions }) => {
      console.log(`\n📊 ${survey.baslik}`);
      console.log(`   Dashboard: http://localhost:3000/admin/surveys/${survey.id}/dashboard`);
      questions.forEach((question) => console.log(`   Soru ${question.sira_no}: id=${question.id} | ${question.soru_tipi} | ${question.soru_metni}`));
    });
    console.log('\nÖnerilen analizler:');
    console.log('- Mağaza: Cinsiyetiniz nedir? x Bu mağazadan tekrar satın alır mısınız?');
    console.log('- Kampüs: Yaş grubunuz nedir? x Aşağıdaki uygulamaların hangilerini kullandınız?');
    console.log('- Şehir: Hangi şehirde yaşıyorsunuz? x Hangi ürün paketini tercih edersiniz?');
  } catch (err) {
    await transaction.rollback();
    console.error('❌ Çapraz tablo demo seed hatası:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

createCrossTabDemoData();
