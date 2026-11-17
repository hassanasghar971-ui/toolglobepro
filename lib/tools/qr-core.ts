export type EccLevel = "L" | "M" | "Q" | "H";

export interface QrMatrix {
  size: number;
  version: number;
  ecl: EccLevel;
  mask: number;
  modules: boolean[][];
  dataBytes: number;
}

export class QrError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QrError";
  }
}

const ECC_INDEX: Record<EccLevel, number> = { L: 0, M: 1, Q: 2, H: 3 };
const ECC_FORMAT_BITS: Record<EccLevel, number> = { L: 1, M: 0, Q: 3, H: 2 };

const ECC_CODEWORDS_PER_BLOCK: number[][] = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];

const NUM_ERROR_CORRECTION_BLOCKS: number[][] = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

const MAX_INPUT_CHARS = 8000;
const ALNUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
const ALNUM_RE = /^[0-9A-Z $%*+\-./:]+$/;

function getBit(x: number, i: number): boolean {
  return ((x >>> i) & 1) !== 0;
}

function appendBits(buf: number[], value: number, len: number): void {
  for (let i = len - 1; i >= 0; i--) buf.push((value >>> i) & 1);
}

function numRawDataModules(ver: number): number {
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (ver >= 7) result -= 36;
  }
  return result;
}

function numDataCodewords(ver: number, eclIdx: number): number {
  return (
    Math.floor(numRawDataModules(ver) / 8) -
    ECC_CODEWORDS_PER_BLOCK[eclIdx][ver] * NUM_ERROR_CORRECTION_BLOCKS[eclIdx][ver]
  );
}

function charCountBits(mode: number, ver: number): number {
  const idx = ver <= 9 ? 0 : ver <= 26 ? 1 : 2;
  if (mode === 1) return [10, 12, 14][idx];
  if (mode === 2) return [9, 11, 13][idx];
  return [8, 16, 16][idx];
}

function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function rsDivisor(degree: number): number[] {
  const result: number[] = new Array<number>(degree - 1).fill(0);
  result.push(1);
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function rsRemainder(data: number[], divisor: number[]): number[] {
  const result = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coef, i) => {
      result[i] ^= gfMultiply(coef, factor);
    });
  }
  return result;
}

interface Segment {
  mode: number;
  count: number;
  bits: number[];
}

function makeSegment(text: string): Segment {
  const bits: number[] = [];
  if (/^[0-9]+$/.test(text)) {
    for (let i = 0; i < text.length; ) {
      const take = Math.min(3, text.length - i);
      appendBits(bits, parseInt(text.substr(i, take), 10), take * 3 + 1);
      i += take;
    }
    return { mode: 1, count: text.length, bits };
  }
  if (ALNUM_RE.test(text)) {
    let i = 0;
    for (; i + 2 <= text.length; i += 2) {
      appendBits(bits, ALNUM.indexOf(text[i]) * 45 + ALNUM.indexOf(text[i + 1]), 11);
    }
    if (i < text.length) appendBits(bits, ALNUM.indexOf(text[i]), 6);
    return { mode: 2, count: text.length, bits };
  }
  const bytes = new TextEncoder().encode(text);
  for (let i = 0; i < bytes.length; i++) appendBits(bits, bytes[i], 8);
  return { mode: 4, count: bytes.length, bits };
}

function buildMatrix(version: number, ecl: EccLevel, data: number[], dataBytes: number): QrMatrix {
  const eclIdx = ECC_INDEX[ecl];
  const size = version * 4 + 17;
  const modules: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const isFn: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));

  const setFn = (x: number, y: number, dark: boolean) => {
    modules[y][x] = dark;
    isFn[y][x] = true;
  };

  const drawFormatBits = (mask: number) => {
    const d = (ECC_FORMAT_BITS[ecl] << 3) | mask;
    let rem = d;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((d << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) setFn(8, i, getBit(bits, i));
    setFn(8, 7, getBit(bits, 6));
    setFn(8, 8, getBit(bits, 7));
    setFn(7, 8, getBit(bits, 8));
    for (let i = 9; i < 15; i++) setFn(14 - i, 8, getBit(bits, i));
    for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, getBit(bits, i));
    for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, getBit(bits, i));
    setFn(8, size - 8, true);
  };

  const drawVersion = () => {
    if (version < 7) return;
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const color = getBit(bits, i);
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFn(a, b, color);
      setFn(b, a, color);
    }
  };

  const drawFinder = (x: number, y: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < size && yy >= 0 && yy < size) setFn(xx, yy, dist !== 2 && dist !== 4);
      }
    }
  };

  const drawAlignment = (x: number, y: number) => {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) setFn(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  };

  const alignPositions = (): number[] => {
    if (version === 1) return [];
    const numAlign = Math.floor(version / 7) + 2;
    const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
    const result = [6];
    for (let pos = size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
    return result;
  };

  for (let i = 0; i < size; i++) {
    setFn(6, i, i % 2 === 0);
    setFn(i, 6, i % 2 === 0);
  }
  drawFinder(3, 3);
  drawFinder(size - 4, 3);
  drawFinder(3, size - 4);
  const align = alignPositions();
  const n = align.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
      drawAlignment(align[i], align[j]);
    }
  }
  drawFormatBits(0);
  drawVersion();

  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[eclIdx][version];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[eclIdx][version];
  const rawCodewords = Math.floor(numRawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);
  const blocks: number[][] = [];
  const div = rsDivisor(blockEccLen);
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
    k += dat.length;
    const ecc = rsRemainder(dat, div);
    if (i < numShortBlocks) dat.push(0);
    blocks.push(dat.concat(ecc));
  }
  const all: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) all.push(block[i]);
    });
  }

  let bitIdx = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFn[y][x] && bitIdx < all.length * 8) {
          modules[y][x] = getBit(all[bitIdx >>> 3], 7 - (bitIdx & 7));
          bitIdx++;
        }
      }
    }
  }

  const applyMask = (mask: number) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let invert: boolean;
        switch (mask) {
          case 0:
            invert = (x + y) % 2 === 0;
            break;
          case 1:
            invert = y % 2 === 0;
            break;
          case 2:
            invert = x % 3 === 0;
            break;
          case 3:
            invert = (x + y) % 3 === 0;
            break;
          case 4:
            invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
            break;
          case 5:
            invert = ((x * y) % 2) + ((x * y) % 3) === 0;
            break;
          case 6:
            invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
            break;
          default:
            invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
        }
        if (!isFn[y][x] && invert) modules[y][x] = !modules[y][x];
      }
    }
  };

  const penalty = (): number => {
    let result = 0;
    const addHistory = (run: number, h: number[]) => {
      if (h[0] === 0) run += size;
      h.pop();
      h.unshift(run);
    };
    const countPatterns = (h: number[]) => {
      const c = h[1];
      const core = c > 0 && h[2] === c && h[3] === c * 3 && h[4] === c && h[5] === c;
      return (core && h[0] >= c * 4 && h[6] >= c ? 1 : 0) + (core && h[6] >= c * 4 && h[0] >= c ? 1 : 0);
    };
    const terminate = (color: boolean, run: number, h: number[]) => {
      if (color) {
        addHistory(run, h);
        run = 0;
      }
      run += size;
      addHistory(run, h);
      return countPatterns(h);
    };

    for (let y = 0; y < size; y++) {
      let color = false;
      let run = 0;
      const h = [0, 0, 0, 0, 0, 0, 0];
      for (let x = 0; x < size; x++) {
        if (modules[y][x] === color) {
          run++;
          if (run === 5) result += 3;
          else if (run > 5) result++;
        } else {
          addHistory(run, h);
          if (!color) result += countPatterns(h) * 40;
          color = modules[y][x];
          run = 1;
        }
      }
      result += terminate(color, run, h) * 40;
    }
    for (let x = 0; x < size; x++) {
      let color = false;
      let run = 0;
      const h = [0, 0, 0, 0, 0, 0, 0];
      for (let y = 0; y < size; y++) {
        if (modules[y][x] === color) {
          run++;
          if (run === 5) result += 3;
          else if (run > 5) result++;
        } else {
          addHistory(run, h);
          if (!color) result += countPatterns(h) * 40;
          color = modules[y][x];
          run = 1;
        }
      }
      result += terminate(color, run, h) * 40;
    }
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const c = modules[y][x];
        if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) result += 3;
      }
    }
    let dark = 0;
    for (const row of modules) for (const v of row) if (v) dark++;
    const total = size * size;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    result += k * 10;
    return result;
  };

  let bestMask = 0;
  let minPenalty = Infinity;
  for (let m = 0; m < 8; m++) {
    applyMask(m);
    drawFormatBits(m);
    const p = penalty();
    if (p < minPenalty) {
      bestMask = m;
      minPenalty = p;
    }
    applyMask(m);
  }
  applyMask(bestMask);
  drawFormatBits(bestMask);

  return { size, version, ecl, mask: bestMask, modules, dataBytes };
}

export function encodeQr(text: string, ecl: EccLevel): QrMatrix {
  if (text.length > MAX_INPUT_CHARS) {
    throw new QrError("That is too much data for a QR code. Shorten the content or split it into several codes.");
  }
  const seg = makeSegment(text);
  const eclIdx = ECC_INDEX[ecl];

  let version = 0;
  for (let v = 1; v <= 40; v++) {
    const ccBits = charCountBits(seg.mode, v);
    if (seg.count >= 1 << ccBits) continue;
    if (4 + ccBits + seg.bits.length <= numDataCodewords(v, eclIdx) * 8) {
      version = v;
      break;
    }
  }
  if (version === 0) {
    throw new QrError(
      "Too much data for a QR code at this error-correction level. Shorten the content or choose a lower correction level (L holds the most).",
    );
  }

  const bits: number[] = [];
  appendBits(bits, seg.mode, 4);
  appendBits(bits, seg.count, charCountBits(seg.mode, version));
  for (let i = 0; i < seg.bits.length; i++) bits.push(seg.bits[i]);

  const capBits = numDataCodewords(version, eclIdx) * 8;
  appendBits(bits, 0, Math.min(4, capBits - bits.length));
  appendBits(bits, 0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capBits; pad ^= 0xec ^ 0x11) appendBits(bits, pad, 8);

  const bytes: number[] = new Array<number>(bits.length / 8).fill(0);
  for (let i = 0; i < bits.length; i++) bytes[i >>> 3] |= bits[i] << (7 - (i & 7));

  return buildMatrix(version, ecl, bytes, seg.mode === 4 ? seg.count : text.length);
}

export function qrPathData(m: QrMatrix, border: number): string {
  const parts: string[] = [];
  for (let y = 0; y < m.size; y++) {
    let x = 0;
    while (x < m.size) {
      if (!m.modules[y][x]) {
        x++;
        continue;
      }
      let e = x;
      while (e < m.size && m.modules[y][e]) e++;
      parts.push(`M${x + border},${y + border}h${e - x}v1h${x - e}z`);
      x = e;
    }
  }
  return parts.join("");
}

export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

export function qrToSvg(m: QrMatrix, border: number, px: number, fg: string, bg: string): string {
  const safeFg = isHexColor(fg) ? fg : "#000000";
  const safeBg = isHexColor(bg) ? bg : "#ffffff";
  const total = m.size + border * 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${px}" height="${px}" shape-rendering="crispEdges">` +
    `<rect width="${total}" height="${total}" fill="${safeBg}"/>` +
    `<path d="${qrPathData(m, border)}" fill="${safeFg}"/></svg>\n`
  );
}

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

export function contrastRatio(a: string, b: string): number {
  if (!isHexColor(a) || !isHexColor(b)) return 21;
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function isDarker(a: string, b: string): boolean {
  return isHexColor(a) && isHexColor(b) ? luminance(a) <= luminance(b) : true;
}

export type QrContentType = "text" | "url" | "wifi" | "vcard" | "email" | "phone" | "sms" | "whatsapp";

export interface FieldDef {
  key: string;
  label: string;
  kind: "text" | "textarea" | "password" | "select" | "checkbox";
  inputType?: "text" | "tel" | "email" | "url";
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: string;
  maxLength?: number;
}

export interface QrTypeDef {
  value: QrContentType;
  label: string;
  hint: string;
  fields: FieldDef[];
}

export const QR_TYPES: QrTypeDef[] = [
  {
    value: "text",
    label: "Text",
    hint: "Any plain text, up to about 2,900 characters.",
    fields: [{ key: "text", label: "Text", kind: "textarea", placeholder: "Type or paste any text…", maxLength: 4000 }],
  },
  {
    value: "url",
    label: "Website",
    hint: "https:// is added automatically when you leave it out.",
    fields: [{ key: "url", label: "Web address", kind: "text", inputType: "url", placeholder: "example.com/menu", maxLength: 2000 }],
  },
  {
    value: "wifi",
    label: "Wi-Fi",
    hint: "Phones that scan it can join the network without typing the password.",
    fields: [
      { key: "ssid", label: "Network name (SSID)", kind: "text", maxLength: 32 },
      { key: "wifiPass", label: "Password", kind: "password", maxLength: 63 },
      {
        key: "wifiSec",
        label: "Security",
        kind: "select",
        defaultValue: "WPA",
        options: [
          { value: "WPA", label: "WPA / WPA2 / WPA3" },
          { value: "WEP", label: "WEP" },
          { value: "nopass", label: "No password" },
        ],
      },
      { key: "wifiHidden", label: "Hidden network", kind: "checkbox" },
    ],
  },
  {
    value: "vcard",
    label: "Contact",
    hint: "Creates a vCard that can be saved straight into a phone's contacts.",
    fields: [
      { key: "firstName", label: "First name", kind: "text", maxLength: 80 },
      { key: "lastName", label: "Last name", kind: "text", maxLength: 80 },
      { key: "org", label: "Company", kind: "text", maxLength: 120 },
      { key: "jobTitle", label: "Job title", kind: "text", maxLength: 120 },
      { key: "vPhone", label: "Phone", kind: "text", inputType: "tel", maxLength: 40 },
      { key: "vEmail", label: "Email", kind: "text", inputType: "email", maxLength: 120 },
      { key: "vUrl", label: "Website", kind: "text", inputType: "url", maxLength: 200 },
    ],
  },
  {
    value: "email",
    label: "Email",
    hint: "Opens a new message with the recipient, subject and body filled in.",
    fields: [
      { key: "to", label: "To", kind: "text", inputType: "email", placeholder: "name@example.com", maxLength: 200 },
      { key: "subject", label: "Subject (optional)", kind: "text", maxLength: 200 },
      { key: "body", label: "Message (optional)", kind: "textarea", maxLength: 1000 },
    ],
  },
  {
    value: "phone",
    label: "Phone",
    hint: "Scanning offers to call this number.",
    fields: [{ key: "tel", label: "Phone number", kind: "text", inputType: "tel", placeholder: "+1 555 123 4567", maxLength: 40 }],
  },
  {
    value: "sms",
    label: "SMS",
    hint: "Opens a text message with an optional pre-written body.",
    fields: [
      { key: "smsTo", label: "Phone number", kind: "text", inputType: "tel", placeholder: "+1 555 123 4567", maxLength: 40 },
      { key: "smsBody", label: "Message (optional)", kind: "textarea", maxLength: 500 },
    ],
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    hint: "Opens a WhatsApp chat. Use the full international number, digits only.",
    fields: [
      { key: "waNumber", label: "Number with country code", kind: "text", inputType: "tel", placeholder: "923001234567", maxLength: 24 },
      { key: "waText", label: "Pre-filled message (optional)", kind: "textarea", maxLength: 500 },
    ],
  },
];

export type Payload = { ok: true; text: string } | { ok: false; message: string | null };

function cleanPhone(s: string): string {
  const t = s.trim();
  const digits = t.replace(/\D/g, "");
  return (t.startsWith("+") ? "+" : "") + digits;
}

const vEsc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
const wEsc = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");

export function buildPayload(type: QrContentType, f: Record<string, string>): Payload {
  const v = (k: string) => (f[k] ?? "").trim();

  switch (type) {
    case "text": {
      const t = f.text ?? "";
      return t.trim() === "" ? { ok: false, message: null } : { ok: true, text: t };
    }
    case "url": {
      const u = v("url");
      if (u === "") return { ok: false, message: null };
      if (/\s/.test(u)) return { ok: false, message: "A web address cannot contain spaces." };
      return { ok: true, text: /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : `https://${u}` };
    }
    case "wifi": {
      const ssid = v("ssid");
      if (ssid === "") return { ok: false, message: null };
      const sec = f.wifiSec || "WPA";
      const pass = f.wifiPass ?? "";
      if (sec !== "nopass" && pass === "") return { ok: false, message: "Enter the Wi-Fi password, or choose “No password”." };
      const hidden = f.wifiHidden === "1" ? "H:true;" : "";
      return {
        ok: true,
        text: sec === "nopass" ? `WIFI:T:nopass;S:${wEsc(ssid)};${hidden};` : `WIFI:T:${sec};S:${wEsc(ssid)};P:${wEsc(pass)};${hidden};`,
      };
    }
    case "vcard": {
      const first = v("firstName");
      const last = v("lastName");
      const org = v("org");
      if (first === "" && last === "" && org === "") return { ok: false, message: null };
      const email = v("vEmail");
      if (email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, message: "Enter a valid email address or leave it empty." };
      }
      const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:${vEsc(last)};${vEsc(first)};;;`, `FN:${vEsc([first, last].filter(Boolean).join(" ") || org)}`];
      if (org) lines.push(`ORG:${vEsc(org)}`);
      if (v("jobTitle")) lines.push(`TITLE:${vEsc(v("jobTitle"))}`);
      if (v("vPhone")) lines.push(`TEL;TYPE=CELL:${cleanPhone(v("vPhone"))}`);
      if (email) lines.push(`EMAIL:${vEsc(email)}`);
      if (v("vUrl")) lines.push(`URL:${v("vUrl")}`);
      lines.push("END:VCARD");
      return { ok: true, text: lines.join("\n") };
    }
    case "email": {
      const to = v("to");
      if (to === "") return { ok: false, message: null };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { ok: false, message: "Enter a valid email address." };
      const params: string[] = [];
      if (v("subject")) params.push(`subject=${encodeURIComponent(v("subject"))}`);
      if ((f.body ?? "").trim()) params.push(`body=${encodeURIComponent((f.body ?? "").trim())}`);
      return { ok: true, text: `mailto:${to}${params.length ? `?${params.join("&")}` : ""}` };
    }
    case "phone": {
      const raw = v("tel");
      if (raw === "") return { ok: false, message: null };
      const num = cleanPhone(raw);
      if (num.replace(/\D/g, "").length < 3) return { ok: false, message: "Enter a valid phone number." };
      return { ok: true, text: `tel:${num}` };
    }
    case "sms": {
      const raw = v("smsTo");
      if (raw === "") return { ok: false, message: null };
      const num = cleanPhone(raw);
      if (num.replace(/\D/g, "").length < 3) return { ok: false, message: "Enter a valid phone number." };
      return { ok: true, text: `SMSTO:${num}:${(f.smsBody ?? "").trim()}` };
    }
    default: {
      const raw = v("waNumber");
      if (raw === "") return { ok: false, message: null };
      const digits = raw.replace(/\D/g, "").replace(/^0+/, "");
      if (digits.length < 7 || digits.length > 15) {
        return { ok: false, message: "Enter the full international number (7–15 digits, country code first, no leading zeros)." };
      }
      const text = (f.waText ?? "").trim();
      return { ok: true, text: `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}` };
    }
  }
}
