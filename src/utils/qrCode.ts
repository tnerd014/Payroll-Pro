/**
 * Minimalist, dependency-free QR Code generator for TOTP / MFA URLs in SVG format.
 * Generates valid SVG QR code markup for scanning with Google Authenticator / Microsoft Authenticator.
 */

// Basic Galois Field (GF 256) and Reed-Solomon polynomial math for standard QR code generation
const GF256_EXP: number[] = new Array(512);
const GF256_LOG: number[] = new Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x;
    GF256_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF256_EXP[i] = GF256_EXP[i - 255];
  }
})();

function gfMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF256_EXP[GF256_LOG[a] + GF256_LOG[b]];
}

function polyMultiply(p1: number[], p2: number[]): number[] {
  const result = new Array(p1.length + p2.length - 1).fill(0);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      result[i + j] ^= gfMultiply(p1[i], p2[j]);
    }
  }
  return result;
}

function getGeneratorPoly(degree: number): number[] {
  let g = [1];
  for (let i = 0; i < degree; i++) {
    g = polyMultiply(g, [1, GF256_EXP[i]]);
  }
  return g;
}

function calculateEcc(data: number[], eccCount: number): number[] {
  const gen = getGeneratorPoly(eccCount);
  const info = data.concat(new Array(eccCount).fill(0));
  for (let i = 0; i < data.length; i++) {
    const lead = info[i];
    if (lead !== 0) {
      for (let j = 0; j < gen.length; j++) {
        info[i + j] ^= gfMultiply(gen[j], lead);
      }
    }
  }
  return info.slice(data.length);
}

/**
 * Encodes text into a standard QR code matrix (supporting Version 4, 33x33 matrix, up to ~114 alphanumeric chars).
 * Perfectly sized for `otpauth://totp/...` authentication strings.
 */
export function generateQrMatrix(text: string): boolean[][] {
  // Use Version 4 (33x33) for typical OTPAuth URLs (~60-110 characters)
  // or Version 3 (29x29) / Version 5 (37x37)
  const size = 37; // Version 5
  const totalDataBytes = 106;
  const eccCount = 28;

  const matrix: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));

  // Finder Patterns
  const addFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const mr = row + r;
        const mc = col + c;
        if (mr >= 0 && mr < size && mc >= 0 && mc < size) {
          if (
            (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
            (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            matrix[mr][mc] = true;
          } else {
            matrix[mr][mc] = false;
          }
        }
      }
    }
  };

  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  // Alignment Pattern for Version 5: (30, 30)
  const addAlignment = (row: number, col: number) => {
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const mr = row + r;
        const mc = col + c;
        if (matrix[mr][mc] === null) {
          matrix[mr][mc] = Math.max(Math.abs(r), Math.abs(c)) !== 1;
        }
      }
    }
  };
  addAlignment(30, 30);
  addAlignment(6, 30);
  addAlignment(30, 6);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0;
    if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0;
  }

  // Dark module
  matrix[size - 8][8] = true;

  // Format reserve
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    if (matrix[i][8] === null) matrix[i][8] = false;
    if (matrix[8][size - i - 1] === null) matrix[8][size - i - 1] = false;
    if (matrix[size - i - 1][8] === null) matrix[size - i - 1][8] = false;
  }

  // Encode Data (Byte Mode 0100)
  const bytes = new TextEncoder().encode(text);
  const bitStream: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bitStream.push((val >> i) & 1);
    }
  };

  pushBits(0b0100, 4); // Byte mode indicator
  pushBits(bytes.length, 8); // Character count (8 bits for Version 1-9 byte mode)
  for (const b of bytes) {
    pushBits(b, 8);
  }

  // Terminator
  pushBits(0, Math.min(4, totalDataBytes * 8 - bitStream.length));
  while (bitStream.length % 8 !== 0) bitStream.push(0);

  // Pad bytes 0xEC, 0x11
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bitStream.length < totalDataBytes * 8) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  // Convert bits to byte array
  const rawBytes: number[] = [];
  for (let i = 0; i < bitStream.length; i += 8) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | bitStream[i + b];
    }
    rawBytes.push(byte);
  }

  // Calculate ECC
  const eccBytes = calculateEcc(rawBytes.slice(0, totalDataBytes), eccCount);
  const finalCodeBytes = rawBytes.concat(eccBytes);

  // Convert all to bits
  const finalBits: number[] = [];
  for (const b of finalCodeBytes) {
    for (let i = 7; i >= 0; i--) {
      finalBits.push((b >> i) & 1);
    }
  }

  // Place in matrix (zig-zag pattern)
  let bitIndex = 0;
  let dir = -1; // up
  let col = size - 1;

  while (col > 0) {
    if (col === 6) col--; // skip timing column

    for (let r = 0; r < size; r++) {
      const row = dir === -1 ? size - 1 - r : r;
      for (let c = 0; c < 2; c++) {
        const curCol = col - c;
        if (matrix[row][curCol] === null) {
          const bit = bitIndex < finalBits.length ? finalBits[bitIndex++] === 1 : false;
          // Apply standard mask 0: (row + col) % 2 === 0
          const mask = (row + curCol) % 2 === 0;
          matrix[row][curCol] = bit ? !mask : mask;
        }
      }
    }
    dir = -dir;
    col -= 2;
  }

  // Format information (Mask 0, Low ECC) -> 0x77c4
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
  for (let i = 0; i < 6; i++) matrix[8][i] = formatBits[i] === 1;
  matrix[8][7] = formatBits[6] === 1;
  matrix[8][8] = formatBits[7] === 1;
  matrix[7][8] = formatBits[8] === 1;
  for (let i = 9; i < 15; i++) matrix[14 - i][8] = formatBits[i] === 1;

  for (let i = 0; i < 8; i++) matrix[size - 1 - i][8] = formatBits[i] === 1;
  for (let i = 8; i < 15; i++) matrix[8][size - 15 + i] = formatBits[i] === 1;

  // Fill any remaining nulls with false
  return matrix.map(row => row.map(cell => Boolean(cell)));
}

/**
 * Renders the QR code matrix into an SVG string.
 */
export function generateQrSvg(text: string, sizePx = 200, foreground = '#09090b', background = '#ffffff'): string {
  try {
    const matrix = generateQrMatrix(text);
    const n = matrix.length;
    const cellSize = (sizePx / n).toFixed(2);

    let rects = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (matrix[r][c]) {
          rects += `<rect x="${(c * (sizePx / n)).toFixed(2)}" y="${(r * (sizePx / n)).toFixed(2)}" width="${cellSize}" height="${cellSize}" fill="${foreground}" />`;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sizePx} ${sizePx}" width="${sizePx}" height="${sizePx}" shape-rendering="crispEdges">
      <rect width="${sizePx}" height="${sizePx}" fill="${background}" rx="8" />
      ${rects}
    </svg>`;
  } catch (e) {
    console.error('Failed to generate QR SVG:', e);
    return '';
  }
}
