/**
 * Streaming CSV → JSON core. Pure TypeScript (no DOM / worker globals) so it
 * runs in the Web Worker, on the main thread, or in tests.
 */

export const MAX_CSV_BYTES = 600 * 1024 * 1024;

export type DelimiterChoice = "auto" | "," | ";" | "\t" | "|";
export type OutputFormat = "objects" | "arrays" | "ndjson";

export interface CsvConvertOptions {
  delimiter: DelimiterChoice;
  /** First row contains column names (objects / ndjson formats). */
  hasHeader: boolean;
  format: OutputFormat;
  /** Convert numbers, booleans and empty cells to native JSON types. */
  inferTypes: boolean;
  trimFields: boolean;
  /** Indented output (ignored for NDJSON). */
  pretty: boolean;
}

export type WorkerRequest = { type: "start"; blob: Blob; options: CsvConvertOptions };

export type WorkerResponse =
  | { type: "progress"; bytes: number; total: number; rows: number }
  | {
      type: "done";
      blob: Blob;
      rows: number;
      columns: number;
      delimiter: string;
      inputBytes: number;
      outputBytes: number;
      preview: string;
      previewTruncated: boolean;
      warnings: string[];
      elapsedMs: number;
    }
  | { type: "error"; message: string };

/* -------------------------------------------------------------------------- */
/*  Delimiter detection                                                       */
/* -------------------------------------------------------------------------- */

export function detectDelimiter(sample: string): string {
  const candidates = [",", ";", "\t", "|"];
  const perLine: number[][] = candidates.map(() => []);
  let current = candidates.map(() => 0);
  let inQuotes = false;
  let lines = 0;

  const flush = () => {
    if (current.some((count) => count > 0)) {
      current.forEach((count, k) => perLine[k].push(count));
      lines++;
    }
    current = candidates.map(() => 0);
  };

  for (let i = 0; i < sample.length && lines < 6; i++) {
    const ch = sample[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && sample[i + 1] === "\n") i++;
      flush();
      continue;
    }
    const k = candidates.indexOf(ch);
    if (k >= 0) current[k]++;
  }
  if (lines === 0) flush();

  let best = ",";
  let bestScore = 0;
  candidates.forEach((candidate, k) => {
    const counts = perLine[k];
    if (counts.length === 0) return;
    const total = counts.reduce((a, b) => a + b, 0);
    const consistent = Math.min(...counts) > 0;
    const score = (consistent ? 1000 : 0) + total;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  });
  return best;
}

/* -------------------------------------------------------------------------- */
/*  Incremental RFC 4180 parser                                               */
/* -------------------------------------------------------------------------- */

export class CsvStreamParser {
  unterminatedQuote = false;

  private readonly delim: number;
  private readonly onRow: (row: string[]) => void;
  private field = "";
  private row: string[] = [];
  private inQuotes = false;
  private quotePending = false;
  private crPending = false;
  private atFieldStart = true;
  private sawQuoted = false;

  constructor(delimiter: string, onRow: (row: string[]) => void) {
    this.delim = delimiter.charCodeAt(0);
    this.onRow = onRow;
  }

  push(chunk: string): void {
    const n = chunk.length;
    const Q = 34;
    const D = this.delim;
    let i = 0;

    while (i < n) {
      const c = chunk.charCodeAt(i);

      if (this.crPending) {
        this.crPending = false;
        if (c === 10) {
          i++;
          continue;
        }
      }

      if (this.inQuotes) {
        if (this.quotePending) {
          this.quotePending = false;
          if (c === Q) {
            this.field += '"';
            i++;
            continue;
          }
          this.inQuotes = false; // closing quote; re-process c below
        } else {
          let j = i;
          while (j < n && chunk.charCodeAt(j) !== Q) j++;
          if (j > i) this.field += chunk.slice(i, j);
          if (j < n) {
            this.quotePending = true;
            j++;
          }
          i = j;
          continue;
        }
      }

      if (c === Q && this.atFieldStart) {
        this.inQuotes = true;
        this.sawQuoted = true;
        this.atFieldStart = false;
        i++;
        continue;
      }
      if (c === D) {
        this.endField();
        i++;
        continue;
      }
      if (c === 10) {
        this.endRow();
        i++;
        continue;
      }
      if (c === 13) {
        this.endRow();
        this.crPending = true;
        i++;
        continue;
      }

      let j = i + 1;
      while (j < n) {
        const d = chunk.charCodeAt(j);
        if (d === D || d === 10 || d === 13) break;
        j++;
      }
      this.field += chunk.slice(i, j);
      this.atFieldStart = false;
      i = j;
    }
  }

  finish(): void {
    if (this.quotePending) {
      this.quotePending = false;
      this.inQuotes = false;
    }
    if (this.inQuotes) {
      this.unterminatedQuote = true;
      this.inQuotes = false;
    }
    if (this.field.length > 0 || this.row.length > 0 || this.sawQuoted) {
      this.endRow();
    }
  }

  private endField(): void {
    this.row.push(this.field);
    this.field = "";
    this.atFieldStart = true;
  }

  private endRow(): void {
    if (this.row.length === 0 && this.field.length === 0 && !this.sawQuoted) {
      this.atFieldStart = true; // blank line: skip
      return;
    }
    this.row.push(this.field);
    const complete = this.row;
    this.row = [];
    this.field = "";
    this.atFieldStart = true;
    this.sawQuoted = false;
    this.onRow(complete);
  }
}

/* -------------------------------------------------------------------------- */
/*  Value conversion                                                          */
/* -------------------------------------------------------------------------- */

const NUMBER_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

export function convertValue(raw: string, infer: boolean): string | number | boolean | null {
  if (!infer) return raw;
  if (raw === "") return null;
  if (raw.length <= 5) {
    const lower = raw.toLowerCase();
    if (lower === "true") return true;
    if (lower === "false") return false;
  }
  const first = raw.charCodeAt(0);
  const numericStart = (first >= 48 && first <= 57) || first === 45;
  if (numericStart && NUMBER_RE.test(raw)) {
    const digits = raw.replace(/[^0-9]/g, "").length;
    if (digits <= 15) {
      const value = Number(raw);
      if (Number.isFinite(value)) return value;
    }
  }
  return raw;
}

function dedupeHeaders(raw: string[]): string[] {
  const used = new Set<string>();
  return raw.map((name, index) => {
    const base = name.length > 0 ? name : `column_${index + 1}`;
    let candidate = base;
    let n = 2;
    while (used.has(candidate)) candidate = `${base}_${n++}`;
    used.add(candidate);
    return candidate;
  });
}

/* -------------------------------------------------------------------------- */
/*  Converter                                                                 */
/* -------------------------------------------------------------------------- */

export class CsvToJsonConverter {
  rows = 0;
  columns = 0;
  delimiter = ",";
  readonly warnings: string[] = [];

  private readonly options: CsvConvertOptions;
  private readonly sink: (text: string) => void;
  private parser: CsvStreamParser | null = null;
  private headers: string[] = [];
  private expected = -1;
  private ragged = 0;
  private wider = 0;
  private previewItems: string[] = [];
  private previewChars = 0;
  private previewTruncated = false;
  private finished = false;

  constructor(options: CsvConvertOptions, sink: (text: string) => void) {
    this.options = options;
    this.sink = sink;
  }

  push(text: string): void {
    if (text.length === 0) return;
    if (!this.parser) this.init(text);
    this.parser?.push(text);
  }

  finish(): void {
    if (this.finished) return;
    this.finished = true;
    if (!this.parser) this.init("");
    this.parser?.finish();

    if (this.parser?.unterminatedQuote) {
      this.warnings.push("The file ended inside a quoted field (unterminated quote). The last field was kept as-is.");
    }
    if (this.ragged > 0) {
      this.warnings.push(
        `${this.ragged.toLocaleString()} row(s) had fewer columns than expected; missing cells were set to null.`,
      );
    }
    if (this.wider > 0) {
      this.warnings.push(
        `${this.wider.toLocaleString()} row(s) had more columns than expected; extra columns were named column_N.`,
      );
    }

    const o = this.options;
    if (o.format !== "ndjson") {
      if (this.rows === 0) this.sink(o.pretty ? "[]\n" : "[]");
      else this.sink(o.pretty ? "\n]\n" : "]");
    }
  }

  getPreview(): { text: string; truncated: boolean } {
    const o = this.options;
    const items = this.previewItems;
    const truncated = this.previewTruncated;
    if (items.length === 0) return { text: o.format === "ndjson" ? "" : "[]", truncated: false };
    if (o.format === "ndjson") {
      return { text: items.join("\n") + (truncated ? "\n…" : ""), truncated };
    }
    const open = o.pretty ? "[\n  " : "[";
    const close = o.pretty ? "\n]" : "]";
    const separator = o.pretty ? ",\n  " : ",";
    const body = items.map((item) => (o.pretty ? item.replace(/\n/g, "\n  ") : item)).join(separator);
    const more = truncated ? (o.pretty ? ",\n  …" : ",…") : "";
    return { text: open + body + more + close, truncated };
  }

  private init(firstText: string): void {
    this.delimiter =
      this.options.delimiter === "auto"
        ? detectDelimiter(firstText.slice(0, 65536))
        : this.options.delimiter;
    this.parser = new CsvStreamParser(this.delimiter, (row) => this.onRow(row));
  }

  private addHeader(): void {
    let name = `column_${this.headers.length + 1}`;
    while (this.headers.includes(name)) name += "_";
    this.headers.push(name);
  }

  private onRow(raw: string[]): void {
    const o = this.options;
    const fields = o.trimFields ? raw.map((value) => value.trim()) : raw;

    if (this.expected === -1) {
      this.expected = fields.length;
      this.columns = fields.length;
      if (o.format !== "arrays") {
        if (o.hasHeader) {
          this.headers = dedupeHeaders(raw.map((value) => value.trim()));
          this.columns = this.headers.length;
          return;
        }
        this.headers = dedupeHeaders(fields.map(() => ""));
      }
    }

    if (fields.length < this.expected) this.ragged++;
    else if (fields.length > this.expected) this.wider++;

    let item: string;
    if (o.format === "arrays") {
      item = JSON.stringify(fields.map((value) => convertValue(value, o.inferTypes)));
      this.columns = Math.max(this.columns, fields.length);
    } else {
      while (this.headers.length < fields.length) this.addHeader();
      const record: Record<string, unknown> = Object.create(null);
      for (let c = 0; c < this.headers.length; c++) {
        record[this.headers[c]] = c < fields.length ? convertValue(fields[c], o.inferTypes) : null;
      }
      item = JSON.stringify(record, null, o.pretty && o.format === "objects" ? 2 : undefined);
      this.columns = Math.max(this.columns, this.headers.length);
    }
    this.emit(item);
  }

  private emit(item: string): void {
    const o = this.options;
    const isFirst = this.rows === 0;
    this.rows++;

    let piece: string;
    if (o.format === "ndjson") {
      piece = `${item}\n`;
    } else if (o.pretty) {
      piece = (isFirst ? "[\n  " : ",\n  ") + item.replace(/\n/g, "\n  ");
    } else {
      piece = (isFirst ? "[" : ",") + item;
    }
    this.sink(piece);

    if (this.previewItems.length < 25 && this.previewChars < 100_000) {
      this.previewItems.push(item);
      this.previewChars += item.length;
    } else {
      this.previewTruncated = true;
    }
  }
}
