export type HashAlgo = "md5" | "sha1" | "sha256" | "sha512";
export type DigestFormat = "hex" | "HEX" | "base64";

export const MAX_FILE_BYTES = 600 * 1024 * 1024;
export const MAX_TEXT_CHARS = 5_000_000;

export const ALGORITHMS: { value: HashAlgo; label: string; bits: number; weak: boolean }[] = [
  { value: "md5", label: "MD5", bits: 128, weak: true },
  { value: "sha1", label: "SHA-1", bits: 160, weak: true },
  { value: "sha256", label: "SHA-256", bits: 256, weak: false },
  { value: "sha512", label: "SHA-512", bits: 512, weak: false },
];

export interface Hasher {
  update(data: Uint8Array): void;
  digest(): Uint8Array;
}

export interface HashWorkerRequest {
  type: "start";
  id: number;
  algos: HashAlgo[];
  file: File;
}

export type HashWorkerResponse =
  | { type: "progress"; id: number; processed: number; total: number }
  | { type: "done"; id: number; hashes: Partial<Record<HashAlgo, string>>; bytes: number; ms: number }
  | { type: "error"; id: number; message: string };

const ZERO = BigInt(0);
const ONE = BigInt(1);

function firstPrimes(count: number): number[] {
  const out: number[] = [];
  for (let n = 2; out.length < count; n++) {
    let prime = true;
    for (const p of out) {
      if (p * p > n) break;
      if (n % p === 0) {
        prime = false;
        break;
      }
    }
    if (prime) out.push(n);
  }
  return out;
}

function iroot(n: bigint, k: 2 | 3): bigint {
  if (n === ZERO) return ZERO;
  const kk = BigInt(k);
  let x = ONE << BigInt(Math.ceil(n.toString(2).length / k));
  for (;;) {
    const pow = k === 2 ? x : x * x;
    const y = ((kk - ONE) * x + n / pow) / kk;
    if (y >= x) return x;
    x = y;
  }
}

interface Constants {
  k256: Int32Array;
  h256: Int32Array;
  k512: Int32Array;
  h512: Int32Array;
}

let cached: Constants | null = null;

function getConstants(): Constants {
  if (cached) return cached;
  const primes = firstPrimes(80);
  const m32 = BigInt(0xffffffff);
  const m64 = (ONE << BigInt(64)) - ONE;
  const s32 = BigInt(32);

  const k256 = new Int32Array(64);
  for (let i = 0; i < 64; i++) {
    k256[i] = Number(iroot(BigInt(primes[i]) << BigInt(96), 3) & m32);
  }
  const h256 = new Int32Array(8);
  for (let i = 0; i < 8; i++) {
    h256[i] = Number(iroot(BigInt(primes[i]) << BigInt(64), 2) & m32);
  }
  const k512 = new Int32Array(160);
  for (let i = 0; i < 80; i++) {
    const v = iroot(BigInt(primes[i]) << BigInt(192), 3) & m64;
    k512[i * 2] = Number(v >> s32);
    k512[i * 2 + 1] = Number(v & m32);
  }
  const h512 = new Int32Array(16);
  for (let i = 0; i < 8; i++) {
    const v = iroot(BigInt(primes[i]) << BigInt(128), 2) & m64;
    h512[i * 2] = Number(v >> s32);
    h512[i * 2 + 1] = Number(v & m32);
  }
  cached = { k256, h256, k512, h512 };
  return cached;
}

const MD5_SHIFTS = new Uint8Array([
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15,
  21,
]);

const MD5_K = (() => {
  const k = new Int32Array(64);
  for (let i = 0; i < 64; i++) k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
  return k;
})();

function writeU32BE(buf: Uint8Array, off: number, v: number): void {
  buf[off] = (v >>> 24) & 255;
  buf[off + 1] = (v >>> 16) & 255;
  buf[off + 2] = (v >>> 8) & 255;
  buf[off + 3] = v & 255;
}

function writeU32LE(buf: Uint8Array, off: number, v: number): void {
  buf[off] = v & 255;
  buf[off + 1] = (v >>> 8) & 255;
  buf[off + 2] = (v >>> 16) & 255;
  buf[off + 3] = (v >>> 24) & 255;
}

abstract class BlockHasher implements Hasher {
  private readonly pending: Uint8Array;
  private pendingLen = 0;
  private total = 0;
  private readonly blockSize: number;
  private readonly lenBytes: number;
  private readonly bigEndian: boolean;

  protected constructor(blockSize: number, lenBytes: number, bigEndian: boolean) {
    this.blockSize = blockSize;
    this.lenBytes = lenBytes;
    this.bigEndian = bigEndian;
    this.pending = new Uint8Array(blockSize);
  }

  protected abstract block(data: Uint8Array, offset: number): void;
  protected abstract output(): Uint8Array;

  private feed(data: Uint8Array): void {
    const bs = this.blockSize;
    let i = 0;
    if (this.pendingLen > 0) {
      const take = Math.min(bs - this.pendingLen, data.length);
      this.pending.set(data.subarray(0, take), this.pendingLen);
      this.pendingLen += take;
      i = take;
      if (this.pendingLen === bs) {
        this.block(this.pending, 0);
        this.pendingLen = 0;
      }
    }
    while (i + bs <= data.length) {
      this.block(data, i);
      i += bs;
    }
    if (i < data.length) {
      this.pending.set(data.subarray(i), 0);
      this.pendingLen = data.length - i;
    }
  }

  update(data: Uint8Array): void {
    this.total += data.length;
    this.feed(data);
  }

  digest(): Uint8Array {
    const bs = this.blockSize;
    const zeros = (bs - ((this.total + 1 + this.lenBytes) % bs)) % bs;
    const pad = new Uint8Array(1 + zeros + this.lenBytes);
    pad[0] = 0x80;
    const hi = Math.floor(this.total / 0x20000000);
    const lo = (this.total << 3) >>> 0;
    const end = pad.length;
    if (this.bigEndian) {
      writeU32BE(pad, end - 8, hi);
      writeU32BE(pad, end - 4, lo);
    } else {
      writeU32LE(pad, end - 8, lo);
      writeU32LE(pad, end - 4, hi);
    }
    this.feed(pad);
    return this.output();
  }
}

class Md5 extends BlockHasher {
  private readonly st = new Int32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476]);
  private readonly x = new Int32Array(16);

  constructor() {
    super(64, 8, false);
  }

  protected block(d: Uint8Array, o: number): void {
    const x = this.x;
    const st = this.st;
    for (let i = 0; i < 16; i++, o += 4) {
      x[i] = d[o] | (d[o + 1] << 8) | (d[o + 2] << 16) | (d[o + 3] << 24);
    }
    let a = st[0];
    let b = st[1];
    let c = st[2];
    let dd = st[3];
    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (b & c) | (~b & dd);
        g = i;
      } else if (i < 32) {
        f = (dd & b) | (~dd & c);
        g = (5 * i + 1) & 15;
      } else if (i < 48) {
        f = b ^ c ^ dd;
        g = (3 * i + 5) & 15;
      } else {
        f = c ^ (b | ~dd);
        g = (7 * i) & 15;
      }
      const t = dd;
      dd = c;
      c = b;
      const s = (a + f + MD5_K[i] + x[g]) | 0;
      const r = MD5_SHIFTS[i];
      b = (b + ((s << r) | (s >>> (32 - r)))) | 0;
      a = t;
    }
    st[0] = (st[0] + a) | 0;
    st[1] = (st[1] + b) | 0;
    st[2] = (st[2] + c) | 0;
    st[3] = (st[3] + dd) | 0;
  }

  protected output(): Uint8Array {
    const out = new Uint8Array(16);
    for (let i = 0; i < 4; i++) writeU32LE(out, i * 4, this.st[i]);
    return out;
  }
}

class Sha1 extends BlockHasher {
  private readonly st = new Int32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]);
  private readonly w = new Int32Array(80);

  constructor() {
    super(64, 8, true);
  }

  protected block(d: Uint8Array, o: number): void {
    const w = this.w;
    const st = this.st;
    for (let t = 0; t < 16; t++, o += 4) {
      w[t] = (d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3];
    }
    for (let t = 16; t < 80; t++) {
      const v = w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16];
      w[t] = (v << 1) | (v >>> 31);
    }
    let a = st[0];
    let b = st[1];
    let c = st[2];
    let d2 = st[3];
    let e = st[4];
    for (let t = 0; t < 80; t++) {
      let f: number;
      let k: number;
      if (t < 20) {
        f = (b & c) | (~b & d2);
        k = 0x5a827999;
      } else if (t < 40) {
        f = b ^ c ^ d2;
        k = 0x6ed9eba1;
      } else if (t < 60) {
        f = (b & c) | (b & d2) | (c & d2);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d2;
        k = 0xca62c1d6;
      }
      const tmp = (((a << 5) | (a >>> 27)) + f + e + k + w[t]) | 0;
      e = d2;
      d2 = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = tmp;
    }
    st[0] = (st[0] + a) | 0;
    st[1] = (st[1] + b) | 0;
    st[2] = (st[2] + c) | 0;
    st[3] = (st[3] + d2) | 0;
    st[4] = (st[4] + e) | 0;
  }

  protected output(): Uint8Array {
    const out = new Uint8Array(20);
    for (let i = 0; i < 5; i++) writeU32BE(out, i * 4, this.st[i]);
    return out;
  }
}

class Sha256 extends BlockHasher {
  private readonly st: Int32Array;
  private readonly w = new Int32Array(64);
  private readonly k: Int32Array;

  constructor() {
    super(64, 8, true);
    const c = getConstants();
    this.st = new Int32Array(c.h256);
    this.k = c.k256;
  }

  protected block(d: Uint8Array, o: number): void {
    const w = this.w;
    const st = this.st;
    const K = this.k;
    for (let t = 0; t < 16; t++, o += 4) {
      w[t] = (d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3];
    }
    for (let t = 16; t < 64; t++) {
      const x = w[t - 15];
      const y = w[t - 2];
      const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
      const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    let a = st[0];
    let b = st[1];
    let c = st[2];
    let d2 = st[3];
    let e = st[4];
    let f = st[5];
    let g = st[6];
    let h = st[7];
    for (let t = 0; t < 64; t++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + w[t]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g;
      g = f;
      f = e;
      e = (d2 + t1) | 0;
      d2 = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    st[0] = (st[0] + a) | 0;
    st[1] = (st[1] + b) | 0;
    st[2] = (st[2] + c) | 0;
    st[3] = (st[3] + d2) | 0;
    st[4] = (st[4] + e) | 0;
    st[5] = (st[5] + f) | 0;
    st[6] = (st[6] + g) | 0;
    st[7] = (st[7] + h) | 0;
  }

  protected output(): Uint8Array {
    const out = new Uint8Array(32);
    for (let i = 0; i < 8; i++) writeU32BE(out, i * 4, this.st[i]);
    return out;
  }
}

function add64(s: Int32Array, i: number, h: number, l: number): void {
  const lo = (s[i + 1] >>> 0) + (l >>> 0);
  s[i + 1] = lo | 0;
  s[i] = (s[i] + h + Math.floor(lo / 4294967296)) | 0;
}

class Sha512 extends BlockHasher {
  private readonly st: Int32Array;
  private readonly w = new Int32Array(160);
  private readonly k: Int32Array;

  constructor() {
    super(128, 16, true);
    const c = getConstants();
    this.st = new Int32Array(c.h512);
    this.k = c.k512;
  }

  protected block(d: Uint8Array, o: number): void {
    const w = this.w;
    const s = this.st;
    const K = this.k;
    for (let t = 0; t < 32; t++, o += 4) {
      w[t] = (d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3];
    }
    for (let t = 16; t < 80; t++) {
      const i = t * 2;
      const h15 = w[i - 30];
      const l15 = w[i - 29];
      const h2 = w[i - 4];
      const l2 = w[i - 3];
      const s0h = ((h15 >>> 1) | (l15 << 31)) ^ ((h15 >>> 8) | (l15 << 24)) ^ (h15 >>> 7);
      const s0l = ((l15 >>> 1) | (h15 << 31)) ^ ((l15 >>> 8) | (h15 << 24)) ^ ((l15 >>> 7) | (h15 << 25));
      const s1h = ((h2 >>> 19) | (l2 << 13)) ^ ((l2 >>> 29) | (h2 << 3)) ^ (h2 >>> 6);
      const s1l = ((l2 >>> 19) | (h2 << 13)) ^ ((h2 >>> 29) | (l2 << 3)) ^ ((l2 >>> 6) | (h2 << 26));
      const lo = (w[i - 31] >>> 0) + (s0l >>> 0) + (w[i - 13] >>> 0) + (s1l >>> 0);
      w[i + 1] = lo | 0;
      w[i] = (w[i - 32] + s0h + w[i - 14] + s1h + Math.floor(lo / 4294967296)) | 0;
    }

    let ah = s[0], al = s[1];
    let bh = s[2], bl = s[3];
    let ch = s[4], cl = s[5];
    let dh = s[6], dl = s[7];
    let eh = s[8], el = s[9];
    let fh = s[10], fl = s[11];
    let gh = s[12], gl = s[13];
    let hh = s[14], hl = s[15];

    for (let t = 0; t < 80; t++) {
      const S1h = ((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((el >>> 9) | (eh << 23));
      const S1l = ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((eh >>> 9) | (el << 23));
      const chH = (eh & fh) ^ (~eh & gh);
      const chL = (el & fl) ^ (~el & gl);
      const t1lo = (hl >>> 0) + (S1l >>> 0) + (chL >>> 0) + (K[2 * t + 1] >>> 0) + (w[2 * t + 1] >>> 0);
      const t1h = (hh + S1h + chH + K[2 * t] + w[2 * t] + Math.floor(t1lo / 4294967296)) | 0;
      const t1l = t1lo | 0;

      const S0h = ((ah >>> 28) | (al << 4)) ^ ((al >>> 2) | (ah << 30)) ^ ((al >>> 7) | (ah << 25));
      const S0l = ((al >>> 28) | (ah << 4)) ^ ((ah >>> 2) | (al << 30)) ^ ((ah >>> 7) | (al << 25));
      const mjH = (ah & bh) ^ (ah & ch) ^ (bh & ch);
      const mjL = (al & bl) ^ (al & cl) ^ (bl & cl);
      const t2lo = (S0l >>> 0) + (mjL >>> 0);
      const t2h = (S0h + mjH + Math.floor(t2lo / 4294967296)) | 0;
      const t2l = t2lo | 0;

      hh = gh;
      hl = gl;
      gh = fh;
      gl = fl;
      fh = eh;
      fl = el;
      const elo = (dl >>> 0) + (t1l >>> 0);
      eh = (dh + t1h + Math.floor(elo / 4294967296)) | 0;
      el = elo | 0;
      dh = ch;
      dl = cl;
      ch = bh;
      cl = bl;
      bh = ah;
      bl = al;
      const alo = (t1l >>> 0) + (t2l >>> 0);
      ah = (t1h + t2h + Math.floor(alo / 4294967296)) | 0;
      al = alo | 0;
    }

    add64(s, 0, ah, al);
    add64(s, 2, bh, bl);
    add64(s, 4, ch, cl);
    add64(s, 6, dh, dl);
    add64(s, 8, eh, el);
    add64(s, 10, fh, fl);
    add64(s, 12, gh, gl);
    add64(s, 14, hh, hl);
  }

  protected output(): Uint8Array {
    const out = new Uint8Array(64);
    for (let i = 0; i < 16; i++) writeU32BE(out, i * 4, this.st[i]);
    return out;
  }
}

export function createHasher(algo: HashAlgo): Hasher {
  switch (algo) {
    case "md5":
      return new Md5();
    case "sha1":
      return new Sha1();
    case "sha256":
      return new Sha256();
    default:
      return new Sha512();
  }
}

export function toHex(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, "0");
  return s;
}

export function hexToBase64(hex: string): string {
  let bin = "";
  for (let i = 0; i + 1 < hex.length; i += 2) bin += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  return btoa(bin);
}

export function formatDigest(hex: string, fmt: DigestFormat): string {
  if (fmt === "HEX") return hex.toUpperCase();
  if (fmt === "base64") return hexToBase64(hex);
  return hex;
}

export function hashBytes(algos: HashAlgo[], bytes: Uint8Array): Partial<Record<HashAlgo, string>> {
  const out: Partial<Record<HashAlgo, string>> = {};
  for (const a of algos) {
    const h = createHasher(a);
    h.update(bytes);
    out[a] = toHex(h.digest());
  }
  return out;
}

export function hashText(algos: HashAlgo[], text: string): Partial<Record<HashAlgo, string>> {
  return hashBytes(algos, new TextEncoder().encode(text));
}

export function matchDigest(expected: string, rows: { algo: HashAlgo; hex: string }[]): HashAlgo | null {
  const cleaned = expected.replace(/\s+/g, "").replace(/^0x/i, "");
  if (cleaned === "") return null;
  if (/^[0-9a-f]+$/i.test(cleaned)) {
    const lower = cleaned.toLowerCase();
    for (const r of rows) if (r.hex === lower) return r.algo;
    return null;
  }
  const strip = (s: string) => s.replace(/=+$/, "");
  for (const r of rows) if (strip(hexToBase64(r.hex)) === strip(cleaned)) return r.algo;
  return null;
}

let selfTestResult: boolean | null = null;

export function selfTest(): boolean {
  if (selfTestResult !== null) return selfTestResult;
  const all: HashAlgo[] = ["md5", "sha1", "sha256", "sha512"];
  let ok = true;
  try {
    const abc = hashText(all, "abc");
    ok =
      abc.md5 === "900150983cd24fb0d6963f7d28e17f72" &&
      abc.sha1 === "a9993e364706816aba3e25717850c26c9cd0d89d" &&
      abc.sha256 === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad" &&
      abc.sha512 ===
        "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f";

    const two = hashText(["sha256"], "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq");
    ok = ok && two.sha256 === "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1";

    const data = new Uint8Array(1000);
    for (let i = 0; i < data.length; i++) data[i] = (i * 31 + 7) & 255;
    const whole = hashBytes(all, data);
    const sizes = [1, 63, 64, 65, 127, 128, 129, 300];
    for (const a of all) {
      const h = createHasher(a);
      let o = 0;
      for (const s of sizes) {
        const e = Math.min(data.length, o + s);
        h.update(data.subarray(o, e));
        o = e;
      }
      if (o < data.length) h.update(data.subarray(o));
      if (toHex(h.digest()) !== whole[a]) ok = false;
    }
  } catch {
    ok = false;
  }
  selfTestResult = ok;
  return ok;
}
