export const MAX_FILE_BYTES = 600 * 1024 * 1024;
export const MAX_TEXT_CHARS = 5_000_000;
export const STREAM_CHUNK_BYTES = 4 * 1024 * 1024;
export const FULL_PARSE_LIMIT = 40 * 1024 * 1024;
export const INLINE_TEXT_LIMIT = 5_000_000;
export const TREE_LIMIT = 1_000_000;
export const MAX_DEPTH = 10_000;

export type JsonMode = "format" | "minify" | "validate";
export type IndentKey = "2" | "4" | "tab";
export const INDENT_STRINGS: Record<IndentKey, string> = { "2": "  ", "4": "    ", tab: "\t" };

export interface JsonStats {
  objects: number;
  arrays: number;
  keys: number;
  strings: number;
  numbers: number;
  booleans: number;
  nulls: number;
  values: number;
  maxDepth: number;
  bytes: number;
}

export interface JsonErrorInfo {
  message: string;
  line: number;
  column: number;
  offset: number;
  before: string;
  after: string;
}

export interface JsonWorkerRequest {
  type: "start";
  id: number;
  mode: JsonMode;
  indent: string;
  sortKeys: boolean;
  file: File;
}

export type JsonWorkerResponse =
  | { type: "progress"; id: number; processed: number; total: number; phase: string }
  | {
      type: "done";
      id: number;
      blob: Blob | null;
      size: number;
      stats: JsonStats;
      strategy: "stream" | "full";
      preview: string;
      previewTruncated: boolean;
    }
  | { type: "invalid"; id: number; error: JsonErrorInfo }
  | { type: "error"; id: number; message: string };

export class JsonError extends Error {
  readonly line: number;
  readonly column: number;
  readonly offset: number;

  constructor(message: string, line: number, column: number, offset: number) {
    super(message);
    this.name = "JsonError";
    this.line = line;
    this.column = column;
    this.offset = offset;
  }
}

const encoder = new TextEncoder();
const EMPTY = new Uint8Array(0);

const S_VALUE = 0;
const S_VALUE_OR_END = 1;
const S_KEY_OR_END = 2;
const S_KEY = 3;
const S_COLON = 4;
const S_COMMA_OR_END = 5;
const S_END = 6;
const S_STRING = 7;
const S_ESC = 8;
const S_UNI = 9;
const S_LIT = 10;
const S_N_MINUS = 11;
const S_N_ZERO = 12;
const S_N_INT = 13;
const S_N_DOT = 14;
const S_N_FRAC = 15;
const S_N_E = 16;
const S_N_ESIGN = 17;
const S_N_EDIG = 18;

const OBJ = 1;
const ARR = 2;

function describe(b: number): string {
  if (b >= 0x21 && b <= 0x7e) return `'${String.fromCharCode(b)}'`;
  if (b >= 0x80) return "a non-ASCII character";
  return `0x${b.toString(16).padStart(2, "0")}`;
}

export class JsonStreamProcessor {
  private state = S_VALUE;
  private readonly stack: number[] = [];
  private isKey = false;
  private lit = "";
  private litIdx = 0;
  private uniLeft = 0;
  private pendingBreak = false;
  private afterOpen = false;
  private line = 1;
  private col = 1;
  private offset = 0;
  private buf = new Uint8Array(1 << 16);
  private len = 0;
  private readonly emit: boolean;
  private readonly pretty: boolean;
  private readonly indentBytes: Uint8Array;
  private stats: JsonStats = {
    objects: 0,
    arrays: 0,
    keys: 0,
    strings: 0,
    numbers: 0,
    booleans: 0,
    nulls: 0,
    values: 0,
    maxDepth: 0,
    bytes: 0,
  };

  constructor(opts: { mode: JsonMode; indent: string }) {
    this.emit = opts.mode !== "validate";
    this.pretty = opts.mode === "format";
    this.indentBytes = encoder.encode(opts.indent);
  }

  getStats(): JsonStats {
    const s = this.stats;
    return { ...s, values: s.objects + s.arrays + s.strings + s.numbers + s.booleans + s.nulls };
  }

  push(chunk: Uint8Array): Uint8Array {
    const n = chunk.length;
    let i = 0;
    if (this.offset === 0 && n >= 3 && chunk[0] === 0xef && chunk[1] === 0xbb && chunk[2] === 0xbf) {
      i = 3;
      this.offset = 3;
    }
    while (i < n) {
      if (this.state === S_STRING) {
        let j = i;
        let cols = 0;
        while (j < n) {
          const c = chunk[j];
          if (c === 0x22 || c === 0x5c || c < 0x20) break;
          if ((c & 0xc0) !== 0x80) cols++;
          j++;
        }
        if (j > i) {
          if (this.emit) this.putRange(chunk, i, j);
          this.col += cols;
          this.offset += j - i;
          i = j;
          if (i >= n) break;
        }
      }
      const b = chunk[i++];
      this.step(b);
      this.offset++;
      if (b === 0x0a) {
        this.line++;
        this.col = 1;
      } else if ((b & 0xc0) !== 0x80) {
        this.col++;
      }
    }
    this.stats.bytes = this.offset;
    return this.take();
  }

  finish(): Uint8Array {
    const s = this.state;
    if (s === S_N_ZERO || s === S_N_INT || s === S_N_FRAC || s === S_N_EDIG) {
      this.afterValue();
    } else if (s === S_STRING || s === S_ESC || s === S_UNI) {
      this.fail("Unterminated string — the input ended inside a string");
    } else if (s >= S_N_MINUS) {
      this.fail("Incomplete number at the end of the input");
    }
    if (this.state !== S_END) {
      this.fail(
        this.offset === 0
          ? "The input is empty"
          : "Unexpected end of JSON input — a bracket, brace or value is missing",
      );
    }
    this.stats.bytes = this.offset;
    return this.take();
  }

  private fail(message: string): never {
    throw new JsonError(message, this.line, this.col, this.offset);
  }

  private take(): Uint8Array {
    if (!this.emit || this.len === 0) return EMPTY;
    const out = this.buf.slice(0, this.len);
    this.len = 0;
    return out;
  }

  private grow(extra: number): void {
    let cap = this.buf.length * 2;
    while (cap < this.len + extra) cap *= 2;
    const next = new Uint8Array(cap);
    next.set(this.buf.subarray(0, this.len));
    this.buf = next;
  }

  private put(b: number): void {
    if (!this.emit) return;
    if (this.len === this.buf.length) this.grow(1);
    this.buf[this.len++] = b;
  }

  private putRange(src: Uint8Array, from: number, to: number): void {
    const k = to - from;
    if (this.len + k > this.buf.length) this.grow(k);
    this.buf.set(src.subarray(from, to), this.len);
    this.len += k;
  }

  private newline(depth: number): void {
    const unit = this.indentBytes.length;
    const need = 1 + depth * unit;
    if (this.len + need > this.buf.length) this.grow(need);
    this.buf[this.len++] = 0x0a;
    for (let d = 0; d < depth; d++) {
      for (let k = 0; k < unit; k++) this.buf[this.len++] = this.indentBytes[k];
    }
  }

  private afterValue(): void {
    this.state = this.stack.length === 0 ? S_END : S_COMMA_OR_END;
  }

  private tokenStart(): void {
    if (this.pendingBreak) {
      if (this.pretty) this.newline(this.stack.length);
      this.pendingBreak = false;
    }
    this.afterOpen = false;
  }

  private open(kind: number): void {
    this.tokenStart();
    if (this.stack.length >= MAX_DEPTH) this.fail(`Nesting is deeper than ${MAX_DEPTH.toLocaleString()} levels`);
    this.put(kind === OBJ ? 0x7b : 0x5b);
    this.stack.push(kind);
    if (this.stack.length > this.stats.maxDepth) this.stats.maxDepth = this.stack.length;
    if (kind === OBJ) this.stats.objects++;
    else this.stats.arrays++;
    this.state = kind === OBJ ? S_KEY_OR_END : S_VALUE_OR_END;
    this.afterOpen = true;
    this.pendingBreak = true;
  }

  private close(kind: number): void {
    const empty = this.afterOpen;
    this.stack.pop();
    if (!empty && this.pretty) this.newline(this.stack.length);
    this.put(kind === OBJ ? 0x7d : 0x5d);
    this.afterOpen = false;
    this.pendingBreak = false;
    this.afterValue();
  }

  private startKey(b: number): void {
    if (b !== 0x22) this.fail(`Expected a property name in double quotes but found ${describe(b)}`);
    this.tokenStart();
    this.put(0x22);
    this.isKey = true;
    this.stats.keys++;
    this.state = S_STRING;
  }

  private startNumber(b: number, state: number): void {
    this.tokenStart();
    this.put(b);
    this.stats.numbers++;
    this.state = state;
  }

  private startLit(word: string): void {
    this.tokenStart();
    this.put(word.charCodeAt(0));
    this.lit = word;
    this.litIdx = 1;
    if (word === "null") this.stats.nulls++;
    else this.stats.booleans++;
    this.state = S_LIT;
  }

  private startValue(b: number): void {
    switch (b) {
      case 0x7b:
        this.open(OBJ);
        return;
      case 0x5b:
        this.open(ARR);
        return;
      case 0x22:
        this.tokenStart();
        this.put(b);
        this.isKey = false;
        this.stats.strings++;
        this.state = S_STRING;
        return;
      case 0x2d:
        this.startNumber(b, S_N_MINUS);
        return;
      case 0x30:
        this.startNumber(b, S_N_ZERO);
        return;
      case 0x74:
        this.startLit("true");
        return;
      case 0x66:
        this.startLit("false");
        return;
      case 0x6e:
        this.startLit("null");
        return;
      default:
        if (b >= 0x31 && b <= 0x39) this.startNumber(b, S_N_INT);
        else if (b === 0x5d || b === 0x7d)
          this.fail(`Unexpected ${describe(b)} — trailing commas and missing values are not allowed in JSON`);
        else if (b === 0x27) this.fail("Single quotes are not valid in JSON — use double quotes");
        else this.fail(`Unexpected character ${describe(b)} — expected a JSON value`);
    }
  }

  private numStep(b: number): boolean {
    const digit = b >= 0x30 && b <= 0x39;
    const exp = b === 0x65 || b === 0x45;
    switch (this.state) {
      case S_N_MINUS:
        if (!digit) this.fail("Expected a digit after '-'");
        this.state = b === 0x30 ? S_N_ZERO : S_N_INT;
        break;
      case S_N_ZERO:
        if (b === 0x2e) this.state = S_N_DOT;
        else if (exp) this.state = S_N_E;
        else if (digit) this.fail("Leading zeros are not allowed in JSON numbers");
        else {
          this.afterValue();
          return false;
        }
        break;
      case S_N_INT:
        if (digit) break;
        if (b === 0x2e) this.state = S_N_DOT;
        else if (exp) this.state = S_N_E;
        else {
          this.afterValue();
          return false;
        }
        break;
      case S_N_DOT:
        if (!digit) this.fail("Expected a digit after the decimal point");
        this.state = S_N_FRAC;
        break;
      case S_N_FRAC:
        if (digit) break;
        if (exp) this.state = S_N_E;
        else {
          this.afterValue();
          return false;
        }
        break;
      case S_N_E:
        if (b === 0x2b || b === 0x2d) this.state = S_N_ESIGN;
        else if (digit) this.state = S_N_EDIG;
        else this.fail("Expected a digit or sign in the exponent");
        break;
      case S_N_ESIGN:
        if (!digit) this.fail("Expected a digit in the exponent");
        this.state = S_N_EDIG;
        break;
      default:
        if (digit) break;
        this.afterValue();
        return false;
    }
    this.put(b);
    return true;
  }

  private step(b: number): void {
    const s = this.state;
    if (s === S_STRING) {
      if (b === 0x22) {
        this.put(b);
        if (this.isKey) this.state = S_COLON;
        else this.afterValue();
      } else if (b === 0x5c) {
        this.put(b);
        this.state = S_ESC;
      } else if (b < 0x20) {
        this.fail("Control character inside a string — line breaks and tabs must be escaped (\\n, \\t)");
      } else {
        this.put(b);
      }
      return;
    }
    if (s === S_ESC) {
      if (b === 0x75) {
        this.uniLeft = 4;
        this.state = S_UNI;
      } else if (
        b === 0x22 || b === 0x5c || b === 0x2f || b === 0x62 ||
        b === 0x66 || b === 0x6e || b === 0x72 || b === 0x74
      ) {
        this.state = S_STRING;
      } else {
        this.fail(`Invalid escape: ${describe(b)} after a backslash`);
      }
      this.put(b);
      return;
    }
    if (s === S_UNI) {
      const hex = (b >= 0x30 && b <= 0x39) || (b >= 0x41 && b <= 0x46) || (b >= 0x61 && b <= 0x66);
      if (!hex) this.fail("Invalid \\u escape — expected 4 hexadecimal digits");
      this.put(b);
      if (--this.uniLeft === 0) this.state = S_STRING;
      return;
    }
    if (s === S_LIT) {
      if (b !== this.lit.charCodeAt(this.litIdx)) {
        this.fail(`Unexpected character ${describe(b)} while reading "${this.lit}"`);
      }
      this.put(b);
      if (++this.litIdx === this.lit.length) this.afterValue();
      return;
    }
    if (s >= S_N_MINUS) {
      if (!this.numStep(b)) this.step(b);
      return;
    }
    if (b === 0x20 || b === 0x0a || b === 0x0d || b === 0x09) return;

    switch (s) {
      case S_VALUE:
      case S_VALUE_OR_END:
        if (b === 0x5d && s === S_VALUE_OR_END) this.close(ARR);
        else this.startValue(b);
        return;
      case S_KEY_OR_END:
        if (b === 0x7d) this.close(OBJ);
        else this.startKey(b);
        return;
      case S_KEY:
        this.startKey(b);
        return;
      case S_COLON:
        if (b !== 0x3a) this.fail(`Expected ':' after the property name but found ${describe(b)}`);
        this.put(0x3a);
        if (this.pretty) this.put(0x20);
        this.state = S_VALUE;
        return;
      case S_COMMA_OR_END: {
        const top = this.stack[this.stack.length - 1];
        if (b === 0x2c) {
          this.put(0x2c);
          this.pendingBreak = true;
          this.state = top === OBJ ? S_KEY : S_VALUE;
        } else if ((b === 0x7d && top === OBJ) || (b === 0x5d && top === ARR)) {
          this.close(top);
        } else {
          this.fail(`Expected ',' or '${top === OBJ ? "}" : "]"}' but found ${describe(b)}`);
        }
        return;
      }
      default:
        this.fail("Unexpected content after the end of the JSON document");
    }
  }
}

export function errorContext(bytes: Uint8Array, offset: number): { before: string; after: string } {
  const at = Math.min(offset, bytes.length);
  const start = Math.max(0, at - 60);
  const end = Math.min(bytes.length, at + 60);
  const dec = new TextDecoder();
  const clean = (s: string) => s.replace(/\s+/g, " ");
  return {
    before: (start > 0 ? "…" : "") + clean(dec.decode(bytes.subarray(start, at))),
    after: clean(dec.decode(bytes.subarray(at, end))) + (end < bytes.length ? "…" : ""),
  };
}

export function toErrorInfo(err: JsonError, bytes: Uint8Array, baseOffset = 0): JsonErrorInfo {
  const ctx = errorContext(bytes, err.offset - baseOffset);
  return {
    message: err.message,
    line: err.line,
    column: err.column,
    offset: err.offset,
    before: ctx.before,
    after: ctx.after,
  };
}

export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === "object") {
    const src = value as Record<string, unknown>;
    const out = Object.create(null) as Record<string, unknown>;
    for (const k of Object.keys(src).sort()) out[k] = sortKeysDeep(src[k]);
    return out;
  }
  return value;
}

export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function indexFromLineCol(text: string, line: number, column: number): number {
  let idx = 0;
  for (let l = 1; l < line; l++) {
    const nl = text.indexOf("\n", idx);
    if (nl < 0) return text.length;
    idx = nl + 1;
  }
  let c = 1;
  while (c < column && idx < text.length && text[idx] !== "\n") {
    idx += (text.codePointAt(idx) ?? 0) > 0xffff ? 2 : 1;
    c++;
  }
  return idx;
}

export type JsonTextResult =
  | { ok: true; output: string; stats: JsonStats; sorted: boolean }
  | { ok: false; error: JsonErrorInfo };

export function processJsonText(
  text: string,
  opts: { mode: JsonMode; indent: string; sortKeys: boolean },
): JsonTextResult {
  const bytes = encoder.encode(text);
  const sort = opts.sortKeys && opts.mode !== "validate";
  try {
    const proc = new JsonStreamProcessor({ mode: sort ? "validate" : opts.mode, indent: opts.indent });
    const a = proc.push(bytes);
    const b = proc.finish();
    const stats = proc.getStats();
    if (sort) {
      const parsed: unknown = JSON.parse(stripBom(text));
      const output = JSON.stringify(sortKeysDeep(parsed), null, opts.mode === "format" ? opts.indent : undefined);
      return { ok: true, output, stats, sorted: true };
    }
    const dec = new TextDecoder();
    const output = opts.mode === "validate" ? "" : dec.decode(a) + (b.length > 0 ? dec.decode(b) : "");
    return { ok: true, output, stats, sorted: false };
  } catch (e) {
    if (e instanceof JsonError) return { ok: false, error: toErrorInfo(e, bytes) };
    return {
      ok: false,
      error: {
        message: e instanceof Error ? e.message : "Could not process this JSON.",
        line: 0,
        column: 0,
        offset: 0,
        before: "",
        after: "",
      },
    };
  }
}
