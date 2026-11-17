export const MAX_FILE_BYTES = 600 * 1024 * 1024;
export const MAX_TEXT_CHARS = 5_000_000;
export const ENCODE_CHUNK_BYTES = 3 * 699_050;
export const DECODE_CHUNK_BYTES = 4 * 524_288;
export const WRAP_WIDTHS = [0, 64, 76] as const;

const STD = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const URL_SAFE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function toCodes(alphabet: string): Uint8Array {
  const out = new Uint8Array(64);
  for (let i = 0; i < 64; i++) out[i] = alphabet.charCodeAt(i);
  return out;
}

const STD_CODES = toCodes(STD);
const URL_CODES = toCodes(URL_SAFE);
const PAD = 0x3d;

export class Base64Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Base64Error";
  }
}

export interface EncodeOptions {
  urlSafe: boolean;
  padding: boolean;
  wrap: number;
}

export interface Base64WorkerRequest {
  type: "start";
  id: number;
  op: "encode" | "decode";
  file: File;
  urlSafe: boolean;
  padding: boolean;
  wrap: number;
  dataUri: boolean;
}

export type Base64WorkerResponse =
  | { type: "progress"; id: number; processed: number; total: number }
  | {
      type: "done";
      id: number;
      blob: Blob;
      size: number;
      mime: string;
      preview: string;
      previewIsText: boolean;
      previewTruncated: boolean;
    }
  | { type: "error"; id: number; message: string };

export function encodeChunk(bytes: Uint8Array, urlSafe: boolean, final: boolean, padding: boolean): Uint8Array {
  const n = bytes.length;
  const rem = n % 3;
  if (!final && rem !== 0) {
    throw new Base64Error("Internal error: a non-final chunk must be a multiple of 3 bytes.");
  }
  const full = (n - rem) / 3;
  const alpha = urlSafe ? URL_CODES : STD_CODES;
  const tail = rem === 0 ? 0 : padding ? 4 : rem + 1;
  const out = new Uint8Array(full * 4 + tail);
  let o = 0;
  let i = 0;
  for (; i < full * 3; i += 3) {
    const v = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out[o++] = alpha[v >> 18];
    out[o++] = alpha[(v >> 12) & 63];
    out[o++] = alpha[(v >> 6) & 63];
    out[o++] = alpha[v & 63];
  }
  if (rem === 1) {
    const v = bytes[i] << 16;
    out[o++] = alpha[v >> 18];
    out[o++] = alpha[(v >> 12) & 63];
    if (padding) {
      out[o++] = PAD;
      out[o++] = PAD;
    }
  } else if (rem === 2) {
    const v = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out[o++] = alpha[v >> 18];
    out[o++] = alpha[(v >> 12) & 63];
    out[o++] = alpha[(v >> 6) & 63];
    if (padding) out[o++] = PAD;
  }
  return out;
}

export class LineWrapper {
  private col = 0;
  private readonly width: number;

  constructor(width: number) {
    this.width = width;
  }

  wrap(input: Uint8Array): Uint8Array {
    if (this.width <= 0) return input;
    const out = new Uint8Array(input.length + Math.ceil(input.length / this.width) + 1);
    let o = 0;
    for (let i = 0; i < input.length; i++) {
      if (this.col === this.width) {
        out[o++] = 0x0a;
        this.col = 0;
      }
      out[o++] = input[i];
      this.col++;
    }
    return out.subarray(0, o);
  }
}

export function encodeBytesToString(bytes: Uint8Array, opts: EncodeOptions): string {
  const ascii = new LineWrapper(opts.wrap).wrap(encodeChunk(bytes, opts.urlSafe, true, opts.padding));
  return new TextDecoder("utf-8").decode(ascii);
}

const DECODE_TABLE = (() => {
  const t = new Int8Array(256).fill(-1);
  for (let i = 0; i < 64; i++) t[STD.charCodeAt(i)] = i;
  t[0x2d] = 62;
  t[0x5f] = 63;
  for (const c of [9, 10, 11, 12, 13, 32]) t[c] = -2;
  t[PAD] = -3;
  return t;
})();

function describeByte(b: number): string {
  if (b >= 0x21 && b <= 0x7e) return `'${String.fromCharCode(b)}'`;
  if (b >= 0x80) return "a non-ASCII character";
  return `0x${b.toString(16).padStart(2, "0")}`;
}

export class Base64Decoder {
  private acc = 0;
  private bits = 0;
  private sextets = 0;
  private pads = 0;
  private offset: number;

  constructor(startOffset = 0) {
    this.offset = startOffset;
  }

  push(chunk: Uint8Array): Uint8Array {
    const out = new Uint8Array(Math.ceil((chunk.length * 6) / 8) + 2);
    let o = 0;
    for (let i = 0; i < chunk.length; i++) {
      const v = DECODE_TABLE[chunk[i]];
      if (v === -2) continue;
      if (v === -3) {
        this.pads++;
        if (this.pads > 2) throw new Base64Error(`Too much "=" padding near byte ${this.offset + i + 1}.`);
        continue;
      }
      if (v < 0) {
        throw new Base64Error(`Invalid Base64 character ${describeByte(chunk[i])} at byte position ${this.offset + i + 1}.`);
      }
      if (this.pads > 0) {
        throw new Base64Error(`Unexpected data after the "=" padding at byte position ${this.offset + i + 1}.`);
      }
      this.acc = (this.acc << 6) | v;
      this.bits += 6;
      this.sextets++;
      if (this.bits >= 8) {
        this.bits -= 8;
        out[o++] = (this.acc >> this.bits) & 0xff;
        this.acc &= (1 << this.bits) - 1;
      }
    }
    this.offset += chunk.length;
    return out.subarray(0, o);
  }

  finish(): void {
    const r = this.sextets % 4;
    if (r === 1) {
      throw new Base64Error("The input ends with an incomplete Base64 group (a single leftover character).");
    }
    if (this.pads > 0 && this.pads !== (r === 0 ? 0 : 4 - r)) {
      throw new Base64Error('The "=" padding does not match the length of the data.');
    }
  }
}

export function parseDataUriHeader(bytes: Uint8Array): { length: number; mime: string } | null {
  let s = 0;
  while (s < bytes.length && (bytes[s] === 32 || (bytes[s] >= 9 && bytes[s] <= 13))) s++;
  if (bytes.length - s < 5) return null;
  const prefix = [0x64, 0x61, 0x74, 0x61, 0x3a];
  for (let k = 0; k < 5; k++) {
    if ((bytes[s + k] | 0x20) !== prefix[k]) return null;
  }
  const limit = Math.min(bytes.length, s + 1024);
  let comma = -1;
  for (let k = s + 5; k < limit; k++) {
    if (bytes[k] === 0x2c) {
      comma = k;
      break;
    }
  }
  if (comma < 0) throw new Base64Error("The data URI header has no comma separator.");
  const header = new TextDecoder().decode(bytes.subarray(s + 5, comma));
  const parts = header.split(";");
  if (!parts.slice(1).some((p) => p.trim().toLowerCase() === "base64")) {
    throw new Base64Error("Only base64 data URIs can be decoded.");
  }
  return { length: comma + 1, mime: parts[0].trim() };
}

export function decodeBase64Text(text: string): { bytes: Uint8Array; mime: string } {
  const bytes = new TextEncoder().encode(text);
  const header = parseDataUriHeader(bytes);
  const body = header ? bytes.subarray(header.length) : bytes;
  const decoder = new Base64Decoder(header ? header.length : 0);
  const out = decoder.push(body);
  decoder.finish();
  return { bytes: out, mime: header?.mime ?? "" };
}
