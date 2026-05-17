const { Op } = require('sequelize');
const { Anket, Soru, AnketYaniti, Cevap } = require('../models');

const SUPPORTED_TYPES = ['boolean', 'multiple_choice', 'multi_select', 'scale', 'star'];
const EPSILON = 1e-12;

async function analyzeSurveyCrossTab({ surveyId, userId, rowQuestionId, columnQuestionId }) {
  const parsedSurveyId = Number(surveyId);
  const parsedRowQuestionId = Number(rowQuestionId);
  const parsedColumnQuestionId = Number(columnQuestionId);

  if (!Number.isInteger(parsedRowQuestionId) || !Number.isInteger(parsedColumnQuestionId)) {
    return badRequest('Satır ve sütun sorusu seçilmelidir.');
  }

  if (parsedRowQuestionId === parsedColumnQuestionId) {
    return badRequest('Aynı soru iki kez seçilemez. Lütfen iki farklı soru seçin.');
  }

  const survey = await Anket.findOne({
    where: { id: parsedSurveyId, admin_id: userId },
    include: [{ model: Soru, as: 'sorular' }],
  });

  if (!survey) {
    const error = new Error('Anket bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const rowQuestion = survey.sorular.find((soru) => soru.id === parsedRowQuestionId);
  const columnQuestion = survey.sorular.find((soru) => soru.id === parsedColumnQuestionId);

  if (!rowQuestion || !columnQuestion) {
    return badRequest('Seçilen sorular bu ankete ait değil veya geçersiz.');
  }

  const unsupported = [rowQuestion, columnQuestion].filter((soru) => !SUPPORTED_TYPES.includes(soru.soru_tipi));
  if (unsupported.length > 0) {
    return badRequest('Text soruları çapraz tablo analizinde desteklenmez. Lütfen seçenekli, boolean, yıldız veya ölçek sorusu seçin.');
  }

  const responses = await AnketYaniti.findAll({
    where: { anket_id: parsedSurveyId, bitis_tarihi: { [Op.ne]: null } },
    include: [{
      model: Cevap,
      as: 'cevaplar',
      attributes: ['soru_id', 'cevap_verisi'],
    }],
    order: [['bitis_tarihi', 'ASC']],
  });

  const analysis = buildCrossTab({
    surveyId: parsedSurveyId,
    rowQuestion,
    columnQuestion,
    responses,
  });

  if (analysis.totalValidResponses < 2) {
    analysis.warnings.push('Analiz için yeterli geçerli cevap yok. En az iki tamamlanmış ve iki soruyu da cevaplamış yanıt gerekir.');
  }

  return analysis;
}

function buildCrossTab({ surveyId, rowQuestion, columnQuestion, responses }) {
  const rowValuesSet = new Set();
  const columnValuesSet = new Set();
  const cellCounts = new Map();
  const rowTotals = new Map();
  const columnTotals = new Map();
  const warnings = [];

  let totalValidResponses = 0;
  let missingResponses = 0;
  let expandedObservationCount = 0;

  responses.forEach((response) => {
    const rowAnswer = findAnswer(response, rowQuestion.id);
    const columnAnswer = findAnswer(response, columnQuestion.id);
    const rowValues = extractAnswerValues(rowQuestion, rowAnswer);
    const columnValues = extractAnswerValues(columnQuestion, columnAnswer);

    if (rowValues.length === 0 || columnValues.length === 0) {
      missingResponses += 1;
      return;
    }

    totalValidResponses += 1;

    rowValues.forEach((rowValue) => {
      rowValuesSet.add(rowValue);
      columnValues.forEach((columnValue) => {
        columnValuesSet.add(columnValue);
        incrementNestedCell(cellCounts, rowValue, columnValue);
        rowTotals.set(rowValue, (rowTotals.get(rowValue) || 0) + 1);
        columnTotals.set(columnValue, (columnTotals.get(columnValue) || 0) + 1);
        expandedObservationCount += 1;
      });
    });
  });

  const rowValues = sortValues([...rowValuesSet]);
  const columnValues = sortValues([...columnValuesSet]);
  const matrix = rowValues.map((rowValue) =>
    columnValues.map((columnValue) => cellCounts.get(rowValue)?.get(columnValue) || 0)
  );

  if (rowQuestion.soru_tipi === 'multi_select' || columnQuestion.soru_tipi === 'multi_select') {
    warnings.push('Multi-select sorularda bir katılımcı birden fazla kategoriye girebilir. Hücre sayıları kişi sayısından yüksek olabilir.');
  }

  const statistics = calculateStatistics(matrix, expandedObservationCount, warnings);

  const table = rowValues.map((rowValue) => ({
    rowValue,
    columns: columnValues.map((columnValue) => {
      const count = cellCounts.get(rowValue)?.get(columnValue) || 0;
      const rowTotal = rowTotals.get(rowValue) || 0;
      const columnTotal = columnTotals.get(columnValue) || 0;
      return {
        columnValue,
        count,
        rowPercentage: percentage(count, rowTotal),
        columnPercentage: percentage(count, columnTotal),
        totalPercentage: percentage(count, expandedObservationCount),
      };
    }),
    rowTotal: rowTotals.get(rowValue) || 0,
  }));

  const result = {
    surveyId,
    rowQuestion: questionInfo(rowQuestion),
    columnQuestion: questionInfo(columnQuestion),
    totalValidResponses,
    missingResponses,
    expandedObservationCount,
    table,
    columnTotals: columnValues.map((columnValue) => ({
      columnValue,
      count: columnTotals.get(columnValue) || 0,
    })),
    statistics,
    interpretation: buildInterpretation({ rowQuestion, columnQuestion, table, statistics, totalValidResponses }),
    warnings,
  };

  return result;
}

function findAnswer(response, questionId) {
  return (response.cevaplar || []).find((cevap) => cevap.soru_id === questionId)?.cevap_verisi;
}

function extractAnswerValues(question, answer) {
  if (!answer) return [];

  switch (question.soru_tipi) {
    case 'boolean':
      if (answer.value === true) return ['Evet'];
      if (answer.value === false) return ['Hayır'];
      return [];
    case 'multiple_choice':
    case 'multi_select':
      return Array.isArray(answer.selected)
        ? [...new Set(answer.selected.map(String).filter(Boolean))]
        : [];
    case 'star':
    case 'scale':
      return groupNumericAnswer(question.soru_tipi, Number(answer.value));
    default:
      return [];
  }
}

function groupNumericAnswer(questionType, value) {
  if (!Number.isFinite(value)) return [];

  if (questionType === 'star') {
    if (value <= 2) return ['Low'];
    if (value === 3) return ['Medium'];
    if (value >= 4) return ['High'];
  }

  if (questionType === 'scale') {
    if (value <= 4) return ['Low'];
    if (value <= 7) return ['Medium'];
    if (value <= 10) return ['High'];
  }

  return [];
}

function incrementNestedCell(cellCounts, rowValue, columnValue) {
  if (!cellCounts.has(rowValue)) cellCounts.set(rowValue, new Map());
  const row = cellCounts.get(rowValue);
  row.set(columnValue, (row.get(columnValue) || 0) + 1);
}

function sortValues(values) {
  const order = ['Low', 'Medium', 'High', 'Evet', 'Hayır'];
  return values.sort((a, b) => {
    const orderA = order.indexOf(a);
    const orderB = order.indexOf(b);
    if (orderA !== -1 || orderB !== -1) return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
    return String(a).localeCompare(String(b), 'tr');
  });
}

function calculateStatistics(matrix, total, warnings) {
  const rows = matrix.length;
  const cols = matrix[0]?.length || 0;

  if (rows < 2 || cols < 2 || total <= 0) {
    warnings.push('Ki-kare testi için en az iki satır ve iki sütunda cevap bulunmalıdır.');
    return emptyStatistics();
  }

  const rowTotals = matrix.map((row) => row.reduce((sum, value) => sum + value, 0));
  const columnTotals = Array.from({ length: cols }, (_, colIndex) =>
    matrix.reduce((sum, row) => sum + row[colIndex], 0)
  );

  let chiSquare = 0;
  let lowExpectedCount = 0;

  matrix.forEach((row, rowIndex) => {
    row.forEach((observed, colIndex) => {
      const expected = (rowTotals[rowIndex] * columnTotals[colIndex]) / total;
      if (expected > 0 && expected < 5) lowExpectedCount += 1;
      if (expected > 0) {
        chiSquare += ((observed - expected) ** 2) / expected;
      }
    });
  });

  if (lowExpectedCount > 0) {
    warnings.push('Bazı hücrelerde beklenen frekans 5’in altında olabilir. Ki-kare sonucu dikkatli yorumlanmalıdır.');
  }

  const degreesOfFreedom = (rows - 1) * (cols - 1);
  const pValue = chiSquarePValue(chiSquare, degreesOfFreedom);
  const minDimension = Math.min(rows - 1, cols - 1);
  const cramersV = minDimension > 0 ? Math.sqrt(chiSquare / (total * minDimension)) : 0;
  const isSignificant = pValue < 0.05;
  const strength = relationshipStrength(cramersV);

  return {
    chiSquare: round(chiSquare, 3),
    degreesOfFreedom,
    pValue: round(pValue, 4),
    cramersV: round(cramersV, 3),
    relationshipStrength: `${strength}${isSignificant ? ' and statistically significant' : ''}`,
    isSignificant,
  };
}

function emptyStatistics() {
  return {
    chiSquare: null,
    degreesOfFreedom: null,
    pValue: null,
    cramersV: null,
    relationshipStrength: 'Not enough data',
    isSignificant: false,
  };
}

function buildInterpretation({ rowQuestion, columnQuestion, table, statistics, totalValidResponses }) {
  const rowText = rowQuestion.soru_metni;
  const columnText = columnQuestion.soru_metni;
  const strengthLabel = translateStrength(statistics.cramersV);
  const details = [];

  if (statistics.pValue === null) {
    return {
      summary: 'Bu iki soru için istatistiksel analiz yapmaya yetecek veri bulunmuyor.',
      details: [
        'Analiz için iki soruda da yeterli sayıda ve farklı kategorilerde cevap olmalıdır.',
        'Daha fazla yanıt toplandıktan sonra bu bölümü tekrar kontrol edin.',
      ],
      decisionAdvice: 'Bu sonuçla karar almak için veri yetersizdir.',
    };
  }

  if (statistics.isSignificant) {
    details.push(`${rowText} sorusuna verilen cevaplara göre ${columnText} dağılımı değişiyor olabilir.`);
    details.push(`İlişki gücü ${strengthLabel} seviyededir.`);
  } else {
    details.push(`${rowText} ve ${columnText} arasında belirgin bir ilişki görülmedi.`);
    details.push(`Gözlenen ilişki gücü ${strengthLabel} seviyededir.`);
  }

  const topDifference = findLargestRowDifference(table);
  if (topDifference) details.push(topDifference);
  details.push('Bu sonuç neden-sonuç ilişkisi kanıtlamaz, sadece iki değişken arasında ilişki olup olmadığını gösterir.');

  if (totalValidResponses < 30) {
    details.push('Yanıt sayısı düşük olduğu için sonuç genel eğilimi gösterebilir ancak kesin karar için yeterli olmayabilir.');
  }

  return {
    summary: statistics.isSignificant
      ? `${rowText} ile ${columnText} arasında istatistiksel olarak anlamlı bir ilişki görülmektedir.`
      : `${rowText} ile ${columnText} arasında istatistiksel olarak anlamlı bir ilişki görülmemektedir.`,
    details,
    decisionAdvice: statistics.isSignificant
      ? `Karar alırken ${rowText} kırılımlarındaki farklı eğilimleri dikkate alabilirsiniz. Ancak örneklem büyüklüğü ve segment dağılımı kontrol edilmelidir.`
      : 'Bu iki soruya göre belirgin bir segment farkı görünmediği için kararları başka metrikler ve nitel geri bildirimlerle destekleyin.',
  };
}

function findLargestRowDifference(table) {
  let best = null;
  table.forEach((row) => {
    row.columns.forEach((cell) => {
      if (!best || cell.rowPercentage > best.rowPercentage) {
        best = { rowValue: row.rowValue, columnValue: cell.columnValue, rowPercentage: cell.rowPercentage };
      }
    });
  });

  if (!best || best.rowPercentage <= 0) return null;
  return `${best.rowValue} grubunda en yüksek eğilim ${best.columnValue} yönünde görünüyor (%${best.rowPercentage}).`;
}

function relationshipStrength(value) {
  if (value === null || value === undefined) return 'Not enough data';
  if (value < 0.10) return 'Very weak';
  if (value < 0.30) return 'Weak';
  if (value < 0.50) return 'Moderate';
  return 'Strong';
}

function translateStrength(value) {
  const strength = relationshipStrength(value);
  if (strength === 'Very weak') return 'çok zayıf';
  if (strength === 'Weak') return 'zayıf';
  if (strength === 'Moderate') return 'orta';
  if (strength === 'Strong') return 'güçlü';
  return 'yetersiz veri';
}

function questionInfo(question) {
  return {
    id: question.id,
    text: question.soru_metni,
    type: question.soru_tipi,
    multiSelectExpansion: question.soru_tipi === 'multi_select'
      ? 'Bir katılımcının birden fazla seçimi ayrı kategori sayımı olarak analiz edilir.'
      : undefined,
  };
}

function percentage(count, total) {
  if (!total) return 0;
  return round((count / total) * 100, 1);
}

function round(value, digits) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}

// Numerical Recipes style incomplete gamma helpers for chi-square survival function.
function chiSquarePValue(chiSquare, degreesOfFreedom) {
  if (chiSquare < 0 || degreesOfFreedom <= 0) return 1;
  return gammaincc(degreesOfFreedom / 2, chiSquare / 2);
}

function gammaincc(a, x) {
  if (x < 0 || a <= 0) return 1;
  if (x === 0) return 1;
  if (x < a + 1) return 1 - gammaSeries(a, x);
  return gammaContinuedFraction(a, x);
}

function gammaSeries(a, x) {
  const ITMAX = 100;
  const gln = logGamma(a);
  let sum = 1 / a;
  let del = sum;
  let ap = a;

  for (let n = 1; n <= ITMAX; n += 1) {
    ap += 1;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * 3e-7) {
      return sum * Math.exp(-x + a * Math.log(x) - gln);
    }
  }
  return sum * Math.exp(-x + a * Math.log(x) - gln);
}

function gammaContinuedFraction(a, x) {
  const ITMAX = 100;
  const FPMIN = 1e-30;
  const gln = logGamma(a);
  let b = x + 1 - a;
  let c = 1 / FPMIN;
  let d = 1 / b;
  let h = d;

  for (let i = 1; i <= ITMAX; i += 1) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-7) break;
  }

  return Math.exp(-x + a * Math.log(x) - gln) * h;
}

function logGamma(xx) {
  const cof = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.001208650973866179,
    -0.000005395239384953,
  ];
  let x = xx - 1;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < cof.length; j += 1) {
    x += 1;
    ser += cof[j] / x;
  }
  return -tmp + Math.log(2.5066282746310005 * ser);
}

module.exports = { analyzeSurveyCrossTab };
