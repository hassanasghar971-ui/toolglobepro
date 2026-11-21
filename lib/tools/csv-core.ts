/**
 * CSV core: a chunk-fed streaming parser plus a JSON writer that flushes to Blobs.
 * Pure TypeScript, no DOM access except Blob, so it runs in a Web Worker.
 */
export const MAX_CSV_BYTES = 600 * 1024 * 1024;
export const PREVIEW_CHARS = 100000;
const FLUSH_CHARS = 4 * 1024 * 1024;

export type OutputFormat = "objects" | "arrays" | "ndjson";
export type OutputStyle = "pretty" | "lines" | "minified";

export interface CsvOptions {
  /** "auto" or a single character such as "," ";" "\t" "|" */
  delimiter: string;
  hasHeader: boolean;
  trim: boolean;
  dynamicTyping: boolean;
  emptyAsNull: boolean;
  skipEmpty: boolean;
  format: OutputFormat;
  style: OutputStyle;
}

export const DEFAULT_OPTIONS: CsvOptions = {
  delimiter: "auto",
  hasHeader: true,
  trim: true,
  dynamicTyping: true,
  emptyAsNull: true,
  skipEmpty: true,
  format: "objects",
  style: "pretty",
};

export interface CsvStats {
  rows: number;
  columns: number;
  delimiter: string;
  mismatched: number;
  unterminated: boolean;
  warnings: string[];
  outputBytes: number;
  elapsedMs: number;
}

export interface CsvResult {
  blob: Blob;
  preview: string;
  previewTruncated: boolean;
  stats: CsvStats;
}

export interface CsvWorkerRequest {
  type: "convert";
  id: number;
  options: CsvOptions;
  text?: string;
  file?: File;
}

export type CsvWorkerResponse =
  | { type: "progress"; id: number; processed: number; total: number; rows: number }
  | { type: "done"; id: number; result: CsvResult }
  | { type: "error"; id: number; message: string };

/** Picks the most consistent delimiter in the first lines of a sample. */
export function detectDelimiter(sample: string): string {
  const cands = [",", ";", "\t", "|"];
  const counts: number[][] = cands.map(() => [0]);
  let inQuotes = false;
  let lines = 0;

  for (let i = 0; i < sample.length && lines < 20; i++) {
    const ch = sample.charAt(i);
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (ch === "\n") {
      lines++;
      for (let c = 0; c < cands.length; c++) counts[c].push(0);
      continue;
    }
    const idx = cands.indexOf(ch);
    if (idx >= 0) counts[idx][counts[idx].length - 1]++;
  }

  let best = ",";
  let bestScore = 0;
  for (let c = 0; c < cands.length; c++) {
    const arr = counts[c].slice();
    if (arr.length > 1) arr.pop();
    const firstCount = arr[0];
    if (!firstCount) continue;
    let consistent = 0;
    for (let k = 0; k < arr.length; k++) if (arr[k] === firstCount) consistent++;
    const score = consistent * 100 + firstCount;
    if (score > bestScore) {
      bestScore = score;
      best = cands[c];
    }
  }
  return best;
}

export type RowHandler = (row: string[], quoted: boolean[]) => void;

/** Feed it text chunks with write(), then call end(). Rows are delivered through the handler. */
export class CsvStreamParser {
  unterminated = false;
  private field = "";
  private row: string[] = [];
  private flags: boolean[] = [];
  private inQuotes = false;
  private quoted = false;
  private pendingQuote = false;
  private skipLF = false;
  private readonly dc: number;
  private readonly onRow: RowHandler;

  constructor(delimiter: string, onRow: RowHandler) {
    this.dc = delimiter.charCodeAt(0);
    this.onRow = onRow;
  }

  write(chunk: string): void {
    const n = chunk.length;
    if (n === 0) return;
    let i = 0;

    if (this.skipLF) {
      this.skipLF = false;
      if (chunk.charCodeAt(0) === 10) i = 1;
    }

    if (this.pendingQuote) {
      this.pendingQuote = false;
      if (chunk.charCodeAt(i) === 34) {
        this.field += '"';
        i++;
      } else {
        this.inQuotes = false;
      }
    }

    while (i < n) {
      if (this.inQuotes) {
        const q = chunk.indexOf('"', i);
        if (q === -1) {
          this.field += chunk.slice(i);
          i = n;
          break;
        }
        this.field += chunk.slice(i, q);
        if (q + 1 >= n) {
          this.pendingQuote = true;
          i = n;
          break;
        }
        if (chunk.charCodeAt(q + 1) === 34) {
          this.field += '"';
          i = q + 2;
        } else {
          this.inQuotes = false;
          i = q + 1;
        }
        continue;
      }

      let j = i;
      while (j < n) {
        const c = chunk.charCodeAt(j);
        if (c === this.dc || c === 10 || c === 13 || c === 34) break;
        j++;
      }
      if (j > i) {
        this.field += chunk.slice(i, j);
        i = j;
        if (i >= n) break;
      }

      const c = chunk.charCodeAt(i);
      if (c === 34) {
        if (!this.quoted && (this.field.length === 0 || this.field.trim() === "")) {
          this.field = "";
          this.inQuotes = true;
          this.quoted = true;
        } else {
          this.field += '"';
        }
        i++;
      } else if (c === this.dc) {
        this.endField();
        i++;
      } else {
        this.endRow();
        if (c === 13) {
          if (i + 1 < n) {
            if (chunk.charCodeAt(i + 1) === 10) i++;
          } else {
            this.skipLF = true;
          }
        }
        i++;
      }
    }
  }

  end(): void {
    if (this.pendingQuote) {
      this.pendingQuote = false;
      this.inQuotes = false;
    }
    if (this.inQuotes) this.unterminated = true;
    if (this.field.length > 0 || this.row.length > 0 || this.quoted || this.inQuotes) {
      this.endRow();
    }
    this.inQuotes = false;
  }

  private endField(): void {
    this.row.push(this.field);
    this.flags.push(this.quoted);
    this.field = "";
    this.quoted = false;
  }

  private endRow(): void {
    this.endField();
    const r = this.row;
    const f = this.flags;
    this.row = [];
    this.flags = [];
    this.onRow(r, f);
  }
}

const NUMBER_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

function normalizeHeaders(cells: string[]): string[] {
  const seen = Object.create(null) as Record<string, number>;
  const out: string[] = [];
  for (let k = 0; k < cells.length; k++) {
    let name = cells[k].trim();
    if (!name) name = "column_" + (k + 1);
    if (seen[name] === undefined) {
      seen[name] = 1;
      out.push(name);
    } else {
      seen[name] += 1;
      out.push(name + "_" + seen[name]);
    }
  }
  return out;
}

/** Turns CSV rows into JSON text, flushing to Blobs so memory stays flat. */
export class CsvConverter {
  rows = 0;
  columns = 0;
  mismatched = 0;
  warnings: string[] = [];
  private readonly opts: CsvOptions;
  private headers: string[] | null = null;
  private headerPending: boolean;
  private records = 0;
  private wroteAny = false;
  private buf = "";
  private blobs: Blob[] = [];
  private totalChars = 0;
  private preview = "";

  constructor(opts: CsvOptions) {
    this.opts = opts;
    this.headerPending = opts.hasHeader;
  }

  pushRow(row: string[], quoted: boolean[]): void {
    this.records++;
    const o = this.opts;

    if (o.skipEmpty) {
      let blank = true;
      for (let k = 0; k < row.length; k++) {
        if (quoted[k] || row[k].trim() !== "") {
          blank = false;
          break;
        }
      }
      if (blank) return;
    }

    const cells: string[] = [];
    for (let k = 0; k < row.length; k++) {
      cells.push(quoted[k] || !o.trim ? row[k] : row[k].trim());
    }

    if (this.headerPending) {
      this.headerPending = false;
      if (o.format === "arrays") {
        this.columns = Math.max(this.columns, cells.length);
        this.emit(cells);
      } else {
        this.headers = normalizeHeaders(cells);
        this.columns = this.headers.length;
      }
      return;
    }

    if (o.format === "arrays") {
      const arr: unknown[] = [];
      for (let k = 0; k < cells.length; k++) arr.push(this.convert(cells[k], quoted[k]));
      this.columns = Math.max(this.columns, arr.length);
      this.emit(arr);
      this.rows++;
      return;
    }

    const headers = this.headers;
    const obj = Object.create(null) as Record<string, unknown>;
    const width = headers ? headers.length : 0;
    if (headers && cells.length !== width) this.noteMismatch(cells.length, width);
    const count = Math.max(width, cells.length);
    for (let k = 0; k < count; k++) {
      const key = headers && k < headers.length ? headers[k] : "column_" + (k + 1);
      obj[key] = k < cells.length ? this.convert(cells[k], quoted[k]) : null;
    }
    this.columns = Math.max(this.columns, count);
    this.emit(obj);
    this.rows++;
  }

  finish(delimiter: string, unterminated: boolean, startedAt: number): CsvResult {
    const o = this.opts;
    if (o.format !== "ndjson") {
      if (!this.wroteAny) this.out("[]\n");
      else this.out(o.style === "minified" ? "]\n" : "\n]\n");
    }
    if (unterminated) {
      this.warnings.push(
        "A quoted field was never closed, so the last record may be truncated or merged with the one before it."
      );
    }
    if (this.buf.length > 0) {
      this.blobs.push(new Blob([this.buf]));
      this.buf = "";
    }
    const blob = new Blob(this.blobs, {
      type: o.format === "ndjson" ? "application/x-ndjson" : "application/json",
    });
    return {
      blob,
      preview: this.preview,
      previewTruncated: this.totalChars > this.preview.length,
      stats: {
        rows: this.rows,
        columns: this.columns,
        delimiter,
        mismatched: this.mismatched,
        unterminated,
        warnings: this.warnings,
        outputBytes: blob.size,
        elapsedMs: Date.now() - startedAt,
      },
    };
  }

  private noteMismatch(got: number, expected: number): void {
    this.mismatched++;
    if (this.warnings.length < 5) {
      this.warnings.push("Record " + this.records + " has " + got + " fields but the header has " + expected + ".");
    }
  }

  private convert(value: string, quoted: boolean): unknown {
    if (quoted) return value;
    if (value === "") return this.opts.emptyAsNull ? null : "";
    if (!this.opts.dynamicTyping) return value;
    const t = value.trim();
    if (NUMBER_RE.test(t)) {
      const digits = t.replace(/[^0-9]/g, "").replace(/^0+/, "");
      if (digits.length <= 15) {
        const n = Number(t);
        if (isFinite(n)) return n;
      }
      return value;
    }
    const lower = t.toLowerCase();
    if (lower === "true") return true;
    if (lower === "false") return false;
    if (lower === "null") return null;
    return value;
  }

  private emit(value: unknown): void {
    const o = this.opts;
    if (o.format === "ndjson") {
      this.out(JSON.stringify(value) + "\n");
      this.wroteAny = true;
      return;
    }
    const min = o.style === "minified";
    if (!this.wroteAny) this.out(min ? "[" : "[\n");
    else this.out(min ? "," : ",\n");
    if (o.style === "pretty") {
      this.out("  " + JSON.stringify(value, null, 2).split("\n").join("\n  "));
    } else if (o.style === "lines") {
      this.out("  " + JSON.stringify(value));
    } else {
      this.out(JSON.stringify(value));
    }
    this.wroteAny = true;
  }

  private out(s: string): void {
    this.totalChars += s.length;
    if (this.preview.length < PREVIEW_CHARS) {
      this.preview += s.slice(0, PREVIEW_CHARS - this.preview.length);
    }
    this.buf += s;
    if (this.buf.length >= FLUSH_CHARS) {
      this.blobs.push(new Blob([this.buf]));
      this.buf = "";
    }
  }
}
