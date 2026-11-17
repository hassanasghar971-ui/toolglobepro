/**
 * Pure-TypeScript MD5, SHA-1, SHA-256 and SHA-512 with a streaming interface.
 * No dependencies. Runs in a Web Worker for files and on the main thread for text.
 */

export type HashAlgo = "md5" | "sha1" | "sha256" | "sha512";
export type DigestFormat = "hex" | "HEX" | "base64";

export const MAX_FILE_BYTES = 600 * 1024 * 1024;
export const MAX_TEXT_CHARS = 2_000_000;

export interface AlgoInfo {
  id: HashAlgo;
  label: string;
  bits: number;
  /** False for algorithms with practical collision attacks. */
  collisionResistant: boolean;
  note: string;
}

export const ALGORITHMS: readonly AlgoInfo[] = [
  { id: "md5", label: "MD5", bits: 128, collisionResistant: false, note: "Legacy checksums only" },
  { id: "sha1", label: "SHA-1", bits: 160, collisionResistant: false, note: "Legacy checksums only" },
  { id: "sha256", label: "SHA-256", bits: 256, collisionResistant: true, note: "Recommended default" },
  { id: "sha512", label: "SHA-512", bits: 512, collisionResistant: true, note: "Longer digest" },
];

export type HashWorkerRequest = {
  id: number;
  file: File;
  algos: HashAlgo[];
};

export type HashWorkerResponse =
  | { type: "progress"; id: number; processed: number; total: number }
  | {
      type: "done";
      id: number;
      results: { algo: HashAlgo; digest: Uint8Array }[];
      elapsedMs: number;
    }
  | { type: "error"; id: number; message: string };

export interface Hasher {
  update(data: Uint8Array): void;
  digest(): Uint8Array;
}

/* -------------------------------------------------------------------------- */
/*  Shared block-buffering base class                                          */
/* -------------------------------------------------------------------------- */

abstract class BlockHasher implements Hasher {
  protected readonly buffer: Uint8Array;
  protected readonly view: DataView;
  protected filled = 0;
  protected total = 0;
  private readonly blockSize: number;
  private readonly littleEndian: boolean;

  constructor(blockSize: number, littleEndian: boolean) {
    this.blockSize = blockSize;
    this.littleEndian = littleEndian;
    this.buffer = new Uint8Array(blockSize);
    this.view = new DataView(this.buffer.buffer);
  }

  protected abstract processBlock(view: DataView, offset: number): void;
  protected abstract output(): Uint8Array;

  update(data: Uint8Array): void {
    const size = this.blockSize;
    this.total += data.length;
    let offset = 0;

    if (this.filled > 0) {
      const take = Math.min(size - this.filled, data.length);
      this.buffer.set(data.subarray(0, take), this.filled);
      this.filled += take;
      offset = take;
      if (this.filled === size) {
        this.processBlock(this.view, 0);
        this.filled = 0;
      }
    }

    if (offset + size <= data.length) {
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      while (offset + size <= data.length) {
        this.processBlock(view, offset);
        offset += size;
      }
    }

    if (offset < data.length) {
      this.buffer.set(data.subarray(offset), 0);
      this.filled = data.length - offset;
    }
  }

  digest(): Uint8Array {
    const size = this.blockSize;
    const lengthField = size === 128 ? 16 : 8;
    const bitsLow = (this.total * 8) % 4294967296;
    const bitsHigh = Math.floor((this.total * 8) / 4294967296);

    const tail = new Uint8Array(size * 2);
    tail.set(this.buffer.subarray(0, this.filled));
    tail[this.filled] = 0x80;
    const end = this.filled + 1 + lengthField <= size ? size : size * 2;
    const view = new DataView(tail.buffer);

    if (this.littleEndian) {
      view.setUint32(end - 8, bitsLow, true);
      view.setUint32(end - 4, bitsHigh, true);
    } else {
      view.setUint32(end - 8, bitsHigh, false);
      view.setUint32(end - 4, bitsLow, false);
    }

    for (let offset = 0; offset < end; offset += size) {
      this.processBlock(view, offset);
    }
    return this.output();
  }
}

/* -------------------------------------------------------------------------- */
/*  MD5                                                                        */
/* -------------------------------------------------------------------------- */

const MD5_K = new Int32Array(64);
const MD5_S = new Uint8Array(64);
(() => {
  const shifts = [
    [7, 12, 17, 22],
    [5, 9, 14, 20],
    [4, 11, 16, 23],
    [6, 10, 15, 21],
  ];
  for (let i = 0; i < 64; i++) {
    MD5_K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
    MD5_S[i] = shifts[i >> 4][i & 3];
  }
})();

class Md5 extends BlockHasher {
  private readonly state = new Int32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476]);
  private readonly words = new Int32Array(16);

  constructor() {
    super(64, true);
  }

  protected processBlock(view: DataView, offset: number): void {
    const m = this.words;
    for (let i = 0; i < 16; i++) m[i] = view.getUint32(offset + i * 4, true);

    let a = this.state[0];
    let b = this.state[1];
    let c = this.state[2];
    let d = this.state[3];

    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) & 15;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) & 15;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) & 15;
      }
      const sum = (a + f + MD5_K[i] + m[g]) | 0;
      const s = MD5_S[i];
      a = d;
      d = c;
      c = b;
      b = (b + ((sum << s) | (sum >>> (32 - s)))) | 0;
    }

    this.state[0] = (this.state[0] + a) | 0;
    this.state[1] = (this.state[1] + b) | 0;
    this.state[2] = (this.state[2] + c) | 0;
    this.state[3] = (this.state[3] + d) | 0;
  }

  protected output(): Uint8Array {
    const out = new Uint8Array(16);
    const view = new DataView(out.buffer);
    for (let i = 0; i < 4; i++) view.setUint32(i * 4, this.state[i] >>> 0, true);
    return out;
  }
}

/* -------------------------------------------------------------------------- */
/*  SHA-1                                                                      */
/* -------------------------------------------------------------------------- */

class Sha1 extends BlockHasher {
  private readonly state = new Int32Array([
    0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0,
  ]);
  private readonly w = new Int32Array(80);

  constructor() {
    super(64, false);
  }

  protected processBlock(view: DataView, offset: number): void {
    const w = this.w;
    for (let t = 0; t < 16; t++) w[t] = view.getUint32(offset + t * 4, false);
    for (let t = 16; t < 80; t++) {
      const x = w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16];
      w[t] = (x << 1) | (x >>> 31);
    }

    let a = this.state[0];
    let b = this.state[1];
    let c = this.state[2];
    let d = this.state[3];
    let e = this.state[4];

    for (let t = 0; t < 80; t++) {
      let f: number;
      let k: number;
      if (t < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (t < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (t < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = ((((a << 5) | (a >>> 27)) + f + e + k + w[t]) | 0);
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = temp;
    }

    this.state[0] = (this.state[0] + a) | 0;
    this.state[1] = (this.state[1] + b) | 0;
    this.state[2] = (this.state[2] + c) | 0;
    this.state[3] = (this.state[3] + d) | 0;
    this.state[4] = (this.state[4] + e) | 0;
  }

  protected output(): Uint8Array {
    const out = new Uint8Array(20);
    const view = new DataView(out.buffer);
    for (let i = 0; i < 5; i++) view.setUint32(i * 4, this.state[i] >>> 0, false);
    return out;
  }
}

/* -------------------------------------------------------------------------- */
/*  SHA-2 constants, derived exactly with BigInt integer roots                 */
/* -------------------------------------------------------------------------- */

const ZERO = BigInt(0);
const ONE = BigInt(1);

function integerRoot(n: bigint, k: number): bigint {
  let lo = ZERO;
  let hi = ONE << BigInt(Math.ceil(n.toString(2).length / k) + 1);
  while (lo < hi) {
    const mid = (lo + hi + ONE) >> ONE;
    let power = ONE;
    for (let i = 0; i < k; i++) power *= mid;
    if (power <= n) lo = mid;
    else hi = mid - ONE;
  }
  return lo;
}

function firstPrimes(count: number): number[] {
  const primes: number[] = [];
  for (let candidate = 2; primes.length < count; candidate++) {
    let isPrime = true;
    for (const p of primes) {
      if (p * p > candidate) break;
      if (candidate % p === 0) {
        isPrime = false;
        break;
      }
    }
    if (isPrime) primes.push(candidate);
  }
  return primes;
}

interface Sha2Constants {
  k256: Int32Array;
  h256: Int32Array;
  /** Pairs of [high, low] 32-bit words. */
  k512: Int32Array;
  h512: Int32Array;
}

let sha2Cache: Sha2Constants | null = null;

function sha2Constants(): Sha2Constants {
  if (sha2Cache) return sha2Cache;

  const primes = firstPrimes(80);
  const s32 = BigInt(32);
  const s64 = BigInt(64);
  const s96 = BigInt(96);
  const s128 = BigInt(128);
  const s192 = BigInt(192);
  const mask32 = (ONE << s32) - ONE;

  const k256 = new Int32Array(64);
  const h256 = new Int32Array(8);
  const k512 = new Int32Array(160);
  const h512 = new Int32Array(16);

  for (let i = 0; i < 64; i++) {
    k256[i] = Number(integerRoot(BigInt(primes[i]) << s96, 3) & mask32) | 0;
  }
  for (let i = 0; i < 8; i++) {
    h256[i] = Number(integerRoot(BigInt(primes[i]) << s64, 2) & mask32) | 0;
    const v = integerRoot(BigInt(primes[i]) << s128, 2);
    h512[i * 2] = Number((v >> s32) & mask32) | 0;
    h512[i * 2 + 1] = Number(v & mask32) | 0;
  }
  for (let i = 0; i < 80; i++) {
    const v = integerRoot(BigInt(primes[i]) << s192, 3);
    k512[i * 2] = Number((v >> s32) & mask32) | 0;
    k512[i * 2 + 1] = Number(v & mask32) | 0;
  }

  sha2Cache = { k256, h256, k512, h512 };
  return sha2Cache;
}

/* -------------------------------------------------------------------------- */
/*  SHA-256                                                                    */
/* -------------------------------------------------------------------------- */

class Sha256 extends BlockHasher {
  private readonly state: Int32Array;
  private readonly k: Int32Array;
  private readonly w = new Int32Array(64);

  constructor() {
    super(64, false);
    const constants = sha2Constants();
    this.state = new Int32Array(constants.h256);
    this.k = constants.k256;
  }

  protected processBlock(view: DataView, offset: number): void {
    const w = this.w;
    const k = this.k;
    for (let t = 0; t < 16; t++) w[t] = view.getUint32(offset + t * 4, false);
    for (let t = 16; t < 64; t++) {
      const x = w[t - 15];
      const y = w[t - 2];
      const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
      const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }

    let a = this.state[0];
    let b = this.state[1];
    let c = this.state[2];
    let d = this.state[3];
    let e = this.state[4];
    let f = this.state[5];
    let g = this.state[6];
    let h = this.state[7];

    for (let t = 0; t < 64; t++) {
      const bigS1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + bigS1 + ch + k[t] + w[t]) | 0;
      const bigS0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (bigS0 + maj) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }

    this.state[0] = (this.state[0] + a) | 0;
    this.state[1] = (this.state[1] + b) | 0;
    this.state[2] = (this.state[2] + c) | 0;
    this.state[3] = (this.state[3] + d) | 0;
    this.state[4] = (this.state[4] + e) | 0;
    this.state[5] = (this.state[5] + f) | 0;
    this.state[6] = (this.state[6] + g) | 0;
    this.state[7] = (this.state[7] + h) | 0;
  }

  protected output(): Uint8Array {
    const out = new Uint8Array(32);
    const view = new DataView(out.buffer);
    for (let i = 0; i < 8; i++) view.setUint32(i * 4, this.state[i] >>> 0, false);
    return out;
  }
}

/* -------------------------------------------------------------------------- */
/*  SHA-512 (64-bit words held as [high, low] 32-bit pairs)                    */
/* -------------------------------------------------------------------------- */

class Sha512 extends BlockHasher {
  private readonly state: Int32Array;
  private readonly k: Int32Array;
  private readonly w = new Int32Array(160);

  constructor() {
    super(128, false);
    const constants = sha2Constants();
    this.state = new Int32Array(constants.h512);
    this.k = constants.k512;
  }

  private addToState(index: number, high: number, low: number): void {
    const lo = (this.state[index * 2 + 1] >>> 0) + (low >>> 0);
    this.state[index * 2 + 1] = lo | 0;
    this.state[index * 2] = (this.state[index * 2] + high + (lo >= 4294967296 ? 1 : 0)) | 0;
  }

  protected processBlock(view: DataView, offset: number): void {
    const w = this.w;
    const k = this.k;

    for (let t = 0; t < 16; t++) {
      w[t * 2] = view.getUint32(offset + t * 8, false);
      w[t * 2 + 1] = view.getUint32(offset + t * 8 + 4, false);
    }

    for (let t = 16; t < 80; t++) {
      const h15 = w[(t - 15) * 2];
      const l15 = w[(t - 15) * 2 + 1];
      const s0h = ((h15 >>> 1) | (l15 << 31)) ^ ((h15 >>> 8) | (l15 << 24)) ^ (h15 >>> 7);
      const s0l =
        ((l15 >>> 1) | (h15 << 31)) ^ ((l15 >>> 8) | (h15 << 24)) ^ ((l15 >>> 7) | (h15 << 25));

      const h2 = w[(t - 2) * 2];
      const l2 = w[(t - 2) * 2 + 1];
      const s1h = ((h2 >>> 19) | (l2 << 13)) ^ ((l2 >>> 29) | (h2 << 3)) ^ (h2 >>> 6);
      const s1l =
        ((l2 >>> 19) | (h2 << 13)) ^ ((h2 >>> 29) | (l2 << 3)) ^ ((l2 >>> 6) | (h2 << 26));

      const lo =
        (w[(t - 16) * 2 + 1] >>> 0) + (s0l >>> 0) + (w[(t - 7) * 2 + 1] >>> 0) + (s1l >>> 0);
      const carry = Math.floor(lo / 4294967296);
      w[t * 2] = (w[(t - 16) * 2] + s0h + w[(t - 7) * 2] + s1h + carry) | 0;
      w[t * 2 + 1] = lo | 0;
    }

    let ah = this.state[0];
    let al = this.state[1];
    let bh = this.state[2];
    let bl = this.state[3];
    let ch = this.state[4];
    let cl = this.state[5];
    let dh = this.state[6];
    let dl = this.state[7];
    let eh = this.state[8];
    let el = this.state[9];
    let fh = this.state[10];
    let fl = this.state[11];
    let gh = this.state[12];
    let gl = this.state[13];
    let hh = this.state[14];
    let hl = this.state[15];

    for (let t = 0; t < 80; t++) {
      const S1h =
        ((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((el >>> 9) | (eh << 23));
      const S1l =
        ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((eh >>> 9) | (el << 23));

      const chooseH = (eh & fh) ^ (~eh & gh);
      const chooseL = (el & fl) ^ (~el & gl);

      const t1lo =
        (hl >>> 0) + (S1l >>> 0) + (chooseL >>> 0) + (k[t * 2 + 1] >>> 0) + (w[t * 2 + 1] >>> 0);
      const t1hi = (hh + S1h + chooseH + k[t * 2] + w[t * 2] + Math.floor(t1lo / 4294967296)) | 0;
      const t1l = t1lo | 0;

      const S0h =
        ((ah >>> 28) | (al << 4)) ^ ((al >>> 2) | (ah << 30)) ^ ((al >>> 7) | (ah << 25));
      const S0l =
        ((al >>> 28) | (ah << 4)) ^ ((ah >>> 2) | (al << 30)) ^ ((ah >>> 7) | (al << 25));

      const majH = (ah & bh) ^ (ah & ch) ^ (bh & ch);
      const majL = (al & bl) ^ (al & cl) ^ (bl & cl);

      const t2lo = (S0l >>> 0) + (majL >>> 0);
      const t2hi = (S0h + majH + Math.floor(t2lo / 4294967296)) | 0;
      const t2l = t2lo | 0;

      hh = gh;
      hl = gl;
      gh = fh;
      gl = fl;
      fh = eh;
      fl = el;

      const elo = (dl >>> 0) + (t1l >>> 0);
      eh = (dh + t1hi + Math.floor(elo / 4294967296)) | 0;
      el = elo | 0;

      dh = ch;
      dl = cl;
      ch = bh;
      cl = bl;
      bh = ah;
      bl = al;

      const alo = (t1l >>> 0) + (t2l >>> 0);
      ah = (t1hi + t2hi + Math.floor(alo / 4294967296)) | 0;
      al = alo | 0;
    }

    this.addToState(0, ah, al);
    this.addToState(1, bh, bl);
    this.addToState(2, ch, cl);
    this.addToState(3, dh, dl);
    this.addToState(4, eh, el);
    this.addToState(5, fh, fl);
    this.addToState(6, gh, gl);
    this.addToState(7, hh, hl);
  }

  protected output(): Uint8Array {
    const out = new Uint8Array(64);
    const view = new DataView(out.buffer);
    for (let i = 0; i < 8; i++) {
      view.setUint32(i * 8, this.state[i * 2] >>> 0, false);
      view.setUint32(i * 8 + 4, this.state[i * 2 + 1] >>> 0, false);
    }
    return out;
  }
}

/* -------------------------------------------------------------------------- */
/*  Public helpers                                                             */
/* -------------------------------------------------------------------------- */

export function createHasher(algo: HashAlgo): Hasher {
  switch (algo) {
    case "md5":
      return new Md5();
    case "sha1":
      return new Sha1();
    case "sha256":
      return new Sha256();
    case "sha512":
      return new Sha512();
  }
}

const HEX_CHARS = "0123456789abcdef";

export function toHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += HEX_CHARS[bytes[i] >> 4] + HEX_CHARS[bytes[i] & 15];
  }
  return out;
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function formatDigest(bytes: Uint8Array, format: DigestFormat): string {
  if (format === "base64") return toBase64(bytes);
  const hex = toHex(bytes);
  return format === "HEX" ? hex.toUpperCase() : hex;
}

export function hashBytes(data: Uint8Array, algo: HashAlgo): Uint8Array {
  const hasher = createHasher(algo);
  hasher.update(data);
  return hasher.digest();
}

export function hashText(text: string, algo: HashAlgo): Uint8Array {
  return hashBytes(new TextEncoder().encode(text), algo);
}

export function matchDigest(expected: string, digest: Uint8Array): boolean {
  const cleaned = expected.replace(/[\s:]/g, "");
  if (cleaned.length === 0) return false;

  if (/^[0-9a-fA-F]+$/.test(cleaned) && cleaned.length === digest.length * 2) {
    return cleaned.toLowerCase() === toHex(digest);
  }

  if (/^[A-Za-z0-9+/_-]+={0,2}$/.test(cleaned)) {
    const normalised = cleaned.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
    return normalised === toBase64(digest).replace(/=+$/, "");
  }
  return false;
}

const VECTORS: { algo: HashAlgo; input: string; expected: string }[] = [
  { algo: "md5", input: "", expected: "d41d8cd98f00b204e9800998ecf8427e" },
  { algo: "md5", input: "abc", expected: "900150983cd24fb0d6963f7d28e17f72" },
  {
    algo: "md5",
    input: "The quick brown fox jumps over the lazy dog",
    expected: "9e107d9d372bb6826bd81d3542a419d6",
  },
  { algo: "sha1", input: "", expected: "da39a3ee5e6b4b0d3255bfef95601890afd80709" },
  { algo: "sha1", input: "abc", expected: "a9993e364706816aba3e25717850c26c9cd0d89d" },
  {
    algo: "sha1",
    input: "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
    expected: "84983e441c3bd26ebaae4aa1f95129e5e54670f1",
  },
  {
    algo: "sha256",
    input: "",
    expected: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  },
  {
    algo: "sha256",
    input: "abc",
    expected: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  },
  {
    algo: "sha256",
    input: "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
    expected: "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
  },
  {
    algo: "sha512",
    input: "",
    expected:
      "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e",
  },
  {
    algo: "sha512",
    input: "abc",
    expected:
      "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f",
  },
];

export interface SelfTestResult {
  ok: boolean;
  failures: string[];
}

export function selfTest(): SelfTestResult {
  const failures: string[] = [];

  for (const vector of VECTORS) {
    try {
      const actual = toHex(hashText(vector.input, vector.algo));
      if (actual !== vector.expected) {
        failures.push(`${vector.algo} of "${vector.input.slice(0, 12)}" gave the wrong digest`);
      }
    } catch (error) {
      failures.push(`${vector.algo} threw: ${error instanceof Error ? error.message : "error"}`);
    }
  }

  const sample = new Uint8Array(1000);
  for (let i = 0; i < sample.length; i++) sample[i] = (i * 31 + 7) & 255;
  const pieces = [1, 7, 63, 64, 65, 127, 128, 129, 300];

  for (const info of ALGORITHMS) {
    try {
      const whole = toHex(hashBytes(sample, info.id));
      const hasher = createHasher(info.id);
      let offset = 0;
      let index = 0;
      while (offset < sample.length) {
        const size = pieces[index % pieces.length];
        hasher.update(sample.subarray(offset, offset + size));
        offset += size;
        index++;
      }
      if (toHex(hasher.digest()) !== whole) {
        failures.push(`${info.id} gives different results for chunked input`);
      }
    } catch (error) {
      failures.push(`${info.id} chunk test threw: ${error instanceof Error ? error.message : "error"}`);
    }
  }

  return { ok: failures.length === 0, failures };
}
