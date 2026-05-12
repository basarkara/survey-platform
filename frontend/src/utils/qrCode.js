const VERSION = 4;
const SIZE = 33;
const DATA_CODEWORDS = 80;
const ECC_CODEWORDS = 20;

const GF_EXP = new Array(512);
const GF_LOG = new Array(256);

let tablesReady = false;

function initGaloisTables() {
  if (tablesReady) return;
  let value = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = value;
    GF_LOG[value] = i;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255];
  tablesReady = true;
}

function gfMultiply(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function generatorPolynomial(degree) {
  initGaloisTables();
  let poly = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMultiply(poly[j], GF_EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function reedSolomon(data, degree) {
  const generator = generatorPolynomial(degree);
  const result = new Array(degree).fill(0);

  data.forEach((codeword) => {
    const factor = codeword ^ result[0];
    result.shift();
    result.push(0);
    for (let i = 0; i < degree; i += 1) {
      result[i] ^= gfMultiply(generator[i + 1], factor);
    }
  });

  return result;
}

function pushBits(bits, value, length) {
  for (let i = length - 1; i >= 0; i -= 1) {
    bits.push((value >>> i) & 1);
  }
}

function encodeData(text) {
  const bytes = Array.from(new TextEncoder().encode(text));
  if (bytes.length > 78) {
    throw new Error('QR kod linki çok uzun. Daha kısa bir domain veya link kullanın.');
  }

  const bits = [];
  pushBits(bits, 0b0100, 4);
  pushBits(bits, bytes.length, 8);
  bytes.forEach((byte) => pushBits(bits, byte, 8));

  const maxBits = DATA_CODEWORDS * 8;
  const terminator = Math.min(4, maxBits - bits.length);
  pushBits(bits, 0, terminator);
  while (bits.length % 8 !== 0) bits.push(0);

  const data = [];
  for (let i = 0; i < bits.length; i += 8) {
    data.push(bits.slice(i, i + 8).reduce((acc, bit) => (acc << 1) | bit, 0));
  }

  const pads = [0xec, 0x11];
  let padIndex = 0;
  while (data.length < DATA_CODEWORDS) {
    data.push(pads[padIndex % 2]);
    padIndex += 1;
  }

  return data;
}

function createMatrix() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
}

function setModule(matrix, reserved, row, col, value, isReserved = true) {
  if (row < 0 || col < 0 || row >= SIZE || col >= SIZE) return;
  matrix[row][col] = value;
  if (isReserved) reserved[row][col] = true;
}

function addFinder(matrix, reserved, row, col) {
  for (let r = -1; r <= 7; r += 1) {
    for (let c = -1; c <= 7; c += 1) {
      const rr = row + r;
      const cc = col + c;
      if (rr < 0 || cc < 0 || rr >= SIZE || cc >= SIZE) continue;
      const inFinder = r >= 0 && r <= 6 && c >= 0 && c <= 6;
      const dark = inFinder && (
        r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)
      );
      setModule(matrix, reserved, rr, cc, dark);
    }
  }
}

function addAlignment(matrix, reserved, centerRow, centerCol) {
  for (let r = -2; r <= 2; r += 1) {
    for (let c = -2; c <= 2; c += 1) {
      const dist = Math.max(Math.abs(r), Math.abs(c));
      setModule(matrix, reserved, centerRow + r, centerCol + c, dist !== 1);
    }
  }
}

function addPatterns(matrix, reserved) {
  addFinder(matrix, reserved, 0, 0);
  addFinder(matrix, reserved, 0, SIZE - 7);
  addFinder(matrix, reserved, SIZE - 7, 0);
  addAlignment(matrix, reserved, 26, 26);

  for (let i = 8; i < SIZE - 8; i += 1) {
    setModule(matrix, reserved, 6, i, i % 2 === 0);
    setModule(matrix, reserved, i, 6, i % 2 === 0);
  }

  setModule(matrix, reserved, 4 * VERSION + 9, 8, true);

  for (let i = 0; i < 9; i += 1) {
    if (i !== 6) {
      reserved[8][i] = true;
      reserved[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i += 1) {
    reserved[SIZE - 1 - i][8] = true;
    reserved[8][SIZE - 1 - i] = true;
  }
}

function formatBits(mask) {
  let data = (0b01 << 3) | mask;
  let value = data << 10;
  const generator = 0x537;
  for (let i = 14; i >= 10; i -= 1) {
    if ((value >>> i) & 1) value ^= generator << (i - 10);
  }
  return (((data << 10) | value) ^ 0x5412) & 0x7fff;
}

function addFormatInfo(matrix, reserved, mask) {
  const bits = formatBits(mask);
  const bit = (i) => ((bits >>> i) & 1) === 1;

  for (let i = 0; i <= 5; i += 1) setModule(matrix, reserved, 8, i, bit(i));
  setModule(matrix, reserved, 8, 7, bit(6));
  setModule(matrix, reserved, 8, 8, bit(7));
  setModule(matrix, reserved, 7, 8, bit(8));
  for (let i = 9; i < 15; i += 1) setModule(matrix, reserved, 14 - i, 8, bit(i));

  for (let i = 0; i < 8; i += 1) setModule(matrix, reserved, SIZE - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i += 1) setModule(matrix, reserved, 8, SIZE - 15 + i, bit(i));
}

function maskBit(row, col, mask) {
  if (mask === 0) return (row + col) % 2 === 0;
  return false;
}

function addData(matrix, reserved, codewords, mask) {
  const bits = [];
  codewords.forEach((codeword) => pushBits(bits, codeword, 8));

  let bitIndex = 0;
  let upward = true;

  for (let col = SIZE - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;
    for (let step = 0; step < SIZE; step += 1) {
      const row = upward ? SIZE - 1 - step : step;
      for (let offset = 0; offset < 2; offset += 1) {
        const currentCol = col - offset;
        if (reserved[row][currentCol]) continue;
        const raw = bits[bitIndex] === 1;
        matrix[row][currentCol] = raw !== maskBit(row, currentCol, mask);
        bitIndex += 1;
      }
    }
    upward = !upward;
  }
}

export function createQrMatrix(text) {
  const matrix = createMatrix();
  const reserved = createMatrix().map((row) => row.map(() => false));
  const data = encodeData(text);
  const ecc = reedSolomon(data, ECC_CODEWORDS);
  const mask = 0;

  addPatterns(matrix, reserved);
  addData(matrix, reserved, [...data, ...ecc], mask);
  addFormatInfo(matrix, reserved, mask);

  return matrix.map((row) => row.map(Boolean));
}
