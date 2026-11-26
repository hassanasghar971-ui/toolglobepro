export const MAX_FILE_BYTES = 600 * 1024 * 1024;
export const SMALL_FILE_BYTES = 1024 * 1024;
export const LIVE_LIMIT_CHARS = 300000;
export const COPY_LIMIT_CHARS = 8000000;
export const MAX_FIELD_CHARS = 20000000;
export const PREVIEW_ROWS = 25;
export const SNIFF_CHARS = 65536;
export const PIPE = String.fromCharCode(124);

export interface Choice {
  key: string;
  label: string;
}

export const OUTPUT_FORMATS: ReadonlyArray<Choice> = [
  { key: "objects", label: "Array of objects (uses header names)" },
  { key: "arrays", label: "Array of arrays (header kept as first row)" },
  { key: "ndjson", label: "JSON Lines (one object per line)" },
];

export const DELIMITER_CHOICES: ReadonlyArray<Choice> = [
  { key: "auto", label: "Auto-detect" },
  { key: "comma", label: "Comma (,)" },
  { key: "semicolon", label: "Semicolon (;)" },
  { key: "tab", label: "Tab" },
  { key: "pipe", label: "Pipe (" + PIPE + ")" },
];

export const ENCODING_CHOICES: ReadonlyArray<Choice> = [
  { key: "utf-8", label: "UTF-8" },
  { key: "windows-1252", label: "Windows-1252 (Excel, Western Europe)" },
  { key: "iso-8859-1", label: "ISO-8859-1 (Latin-1)" },
  { key: "utf-16le", label: "UTF-16 LE" },
];

export interface CsvOptions {
  delimiter: string;
  hasHeader: boolean;
  trim: boolean;
  inferTypes: boolean;
  skipEmpty: boolean;
  format: string;
  pretty: boolean;
  encoding: string;
}

export interface ConvertSummary {
  rows: number;
  columns: number;
  headers: string[];
  warnings: string[];
  preview: string;
  delimiter: string;
}

export interface WorkerRequest {
  type: string;
  id: number;
  options: CsvOptions;
  file?: Blob;
  text?: string;
}

export interface WorkerResponse {
  type: string;
  id: number;
  loaded?: number;
  total?: number;
  rows?: number;
  blob?: Blob;
  text?: string;
  bytes?: number;
  ms?: number;
  summary?: ConvertSummary;
  message?: string;
}

export function defaultOptions(): CsvOptions {
  return {
    delimiter: "auto",
    hasHeader: true,
    trim: true,
    inferTypes: true,
    skipEmpty: true,
    format: "objects",
    pretty: true,
    encoding: "utf-8",
  };
}

export function emptySummary(): ConvertSummary {
  return { rows: 0, columns: 0, headers: [], warnings: [], preview: "", delimiter: "comma" };
}

export function resolveDelimiter(key: string): string {
  if (key === "semicolon") return ";";
  if (key === "tab") return "\t";
  if (key === "pipe") return PIPE;
  return ",";
}

export function delimiterLabel(key: string): string {
  for (const c of DELIMITER_CHOICES) {
    if (c.key === key) return c.label;
  }
  return key;
}

export function outputExtension(format: string): string {
  return format === "ndjson" ? "ndjson" : "json";
}

export function outputMime(format: string): string {
  return format === "ndjson" ? "application/x-ndjson" : "application/json";
}

function isNewline(ch: string): boolean {
  return ch === "\n" ? true : ch === "\r";
}

function countPerLine(sample: string, d: string, maxLines: number, complete: boolean): number[] {
  const counts: number[] = [];
  let inQuote = false;
  let count = 0;
  let len = 0;
  for (let i = 0; i < sample.length; i += 1) {
    const ch = sample.charAt(i);
    if (ch === '"') {
      inQuote = !inQuote;
      len += 1;
      continue;
    }
    if (inQuote === false && isNewline(ch)) {
      if (len > 0) {
        counts.push(count);
        if (counts.length >= maxLines) return counts;
      }
      count = 0;
      len = 0;
      continue;
    }
    if (inQuote === false && ch === d) count += 1;
    len += 1;
  }
  if (complete && len > 0) counts.push(count);
  return counts;
}

export function detectDelimiter(sample: string, complete: boolean = true): string {
  const keys = ["comma", "semicolon", "tab", "pipe"];
  let bestKey = "comma";
  let bestScore = 0;
  for (const key of keys) {
    const counts = countPerLine(sample, resolveDelimiter(key), 12, complete);
    if (counts.length === 0) continue;
    const first = counts[0];
    if (first === 0) continue;
    let same = 0;
    for (const c of counts) {
      if (c === first) same += 1;
    }
    const score = same * 1000 + first;
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }
  return bestKey;
}

const NUMBER_RE = /^-?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$/;

export function inferJson(raw: string): string {
  if (raw === "") return "null";
  const lower = raw.toLowerCase();
  if (lower === "true") return "true";
  if (lower === "false") return "false";
  if (lower === "null") return "null";
  if (NUMBER_RE.test(raw)) {
    const digits = raw.charAt(0) === "-" ? raw.slice(1) : raw;
    const second = digits.charAt(1);
    const leadingZero =
      digits.length > 1 && digits.charAt(0) === "0" && second !== "." && second !== "e" && second !== "E";
    if (!leadingZero) {
      const num = Number(raw);
      const plain = raw.indexOf(".") < 0 && raw.indexOf("e") < 0 && raw.indexOf("E") < 0;
      if (plain) {
        if (Number.isSafeInteger(num)) return raw;
      } else if (Number.isFinite(num)) {
        return raw;
      }
    }
  }
  return JSON.stringify(raw);
}

export class CsvRowParser {
  private delim: number;
  private skipEmpty: boolean;
  private onRow: (fields: string[]) => void;
  private state = 0;
  private field = "";
  private row: string[] = [];
  private quoted = false;
  private sawCR = false;
  loose = 0;
  unterminated = false;
  emptyLines = 0;

  constructor(delimiter: string, skipEmpty: boolean, onRow: (fields: string[]) => void) {
    this.delim = delimiter.charCodeAt(0);
    this.skipEmpty = skipEmpty;
    this.onRow = onRow;
  }

  private checkSize(): void {
    if (this.field.length > MAX_FIELD_CHARS) {
      throw new Error(
        "A single field is larger than 20 million characters. The file probably has a quote that is never closed."
      );
    }
  }

  private endField(): void {
    this.row.push(this.field);
    this.field = "";
    this.state = 0;
  }

  private endRow(): void {
    const emptyLine = this.row.length === 0 && this.field === "" && !this.quoted;
    this.row.push(this.field);
    this.field = "";
    const fields = this.row;
    this.row = [];
    this.state = 0;
    this.quoted = false;
    if (emptyLine) {
      this.emptyLines += 1;
      if (this.skipEmpty) return;
    }
    this.onRow(fields);
  }

  push(chunk: string): void {
    const n = chunk.length;
    let i = 0;
    while (i < n) {
      if (this.sawCR) {
        this.sawCR = false;
        if (chunk.charCodeAt(i) === 10) {
          i += 1;
          continue;
        }
      }
      if (this.state === 2) {
        const q = chunk.indexOf('"', i);
        if (q < 0) {
          this.field += chunk.slice(i);
          i = n;
        } else {
          this.field += chunk.slice(i, q);
          i = q + 1;
          this.state = 3;
        }
        this.checkSize();
        continue;
      }
      if (this.state === 1) {
        let j = i;
        while (j < n) {
          const d = chunk.charCodeAt(j);
          if (d === this.delim) break;
          if (d === 10) break;
          if (d === 13) break;
          j += 1;
        }
        if (j > i) {
          this.field += chunk.slice(i, j);
          i = j;
          this.checkSize();
          if (i >= n) break;
        }
        const e = chunk.charCodeAt(i);
        if (e === this.delim) {
          this.endField();
        } else {
          this.endRow();
          if (e === 13) this.sawCR = true;
        }
        i += 1;
        continue;
      }
      const c = chunk.charCodeAt(i);
      if (this.state === 0) {
        if (c === 34) {
          this.state = 2;
          this.quoted = true;
          i += 1;
        } else if (c === this.delim) {
          this.endField();
          i += 1;
        } else if (c === 10) {
          this.endRow();
          i += 1;
        } else if (c === 13) {
          this.endRow();
          this.sawCR = true;
          i += 1;
        } else {
          this.state = 1;
        }
        continue;
      }
      if (c === 34) {
        this.field += '"';
        this.state = 2;
        i += 1;
      } else if (c === this.delim) {
        this.endField();
        i += 1;
      } else if (c === 10) {
        this.endRow();
        i += 1;
      } else if (c === 13) {
        this.endRow();
        this.sawCR = true;
        i += 1;
      } else {
        this.loose += 1;
        this.field += chunk.charAt(i);
        this.state = 1;
        i += 1;
      }
    }
  }

  finish(): void {
    if (this.state === 2) this.unterminated = true;
    const pending = this.row.length > 0 ? true : this.field !== "" ? true : this.quoted;
    if (pending) this.endRow();
    this.sawCR = false;
  }
}

export class CsvConverter {
  private opts: CsvOptions;
  private sink: (text: string) => void;
  private pretty: boolean;
  private parser?: CsvRowParser;
  private started = false;
  private firstChunk = true;
  private pendingText = "";
  private delimiterKey = "comma";
  private headerDone = false;
  private headerNames: string[] = [];
  private headerJson: string[] = [];
  private rows = 0;
  private emitted = 0;
  private maxColumns = 0;
  private ragged = 0;
  private renamed = 0;
  private previews: string[] = [];
  private closed = false;

  constructor(options: CsvOptions, sink: (text: string) => void) {
    this.opts = options;
    this.sink = sink;
    this.pretty = options.pretty && options.format !== "ndjson";
  }

  get rowCount(): number {
    return this.rows;
  }

  push(text: string): void {
    let chunk = text;
    if (this.firstChunk && chunk.length > 0) {
      this.firstChunk = false;
      if (chunk.charCodeAt(0) === 0xfeff) chunk = chunk.slice(1);
    }
    if (!this.started) {
      this.pendingText += chunk;
      if (this.opts.delimiter !== "auto") {
        this.start(true);
      } else if (this.pendingText.length >= SNIFF_CHARS) {
        this.start(false);
      }
      return;
    }
    if (this.parser) this.parser.push(chunk);
  }

  finish(): void {
    if (!this.started) this.start(true);
    if (this.parser) this.parser.finish();
    this.close();
  }

  private start(complete: boolean): void {
    this.started = true;
    this.delimiterKey =
      this.opts.delimiter === "auto" ? detectDelimiter(this.pendingText, complete) : this.opts.delimiter;
    this.parser = new CsvRowParser(resolveDelimiter(this.delimiterKey), this.opts.skipEmpty, (fields) =>
      this.handleRow(fields)
    );
    const first = this.pendingText;
    this.pendingText = "";
    this.parser.push(first);
  }

  private close(): void {
    if (this.closed) return;
    this.closed = true;
    if (this.opts.format === "ndjson") return;
    this.sink(this.emitted === 0 ? "[]\n" : "\n]\n");
  }

  private buildHeaders(fields: string[], fromValues: boolean): void {
    const seen: Record<string, number> = Object.create(null) as Record<string, number>;
    const names: string[] = [];
    for (let k = 0; k < fields.length; k += 1) {
      let name = fromValues ? fields[k].trim() : "";
      if (name === "") name = "column_" + (k + 1);
      const used = seen[name] ?? 0;
      seen[name] = used + 1;
      if (used > 0) {
        this.renamed += 1;
        name = name + "_" + (used + 1);
        seen[name] = 1;
      }
      names.push(name);
    }
    this.headerNames = names;
    this.headerJson = names.map((nm) => JSON.stringify(nm));
  }

  private valueJson(raw: string): string {
    const v = this.opts.trim ? raw.trim() : raw;
    return this.opts.inferTypes ? inferJson(v) : JSON.stringify(v);
  }

  private arrayText(items: string[]): string {
    return this.pretty ? "  [" + items.join(", ") + "]" : "[" + items.join(",") + "]";
  }

  private objectText(fields: string[]): string {
    const count = this.headerJson.length;
    const total = fields.length > count ? fields.length : count;
    let body = "";
    for (let k = 0; k < total; k += 1) {
      const key = k < count ? this.headerJson[k] : JSON.stringify("column_" + (k + 1));
      const val = k < fields.length ? this.valueJson(fields[k]) : "null";
      if (this.pretty) {
        body += (k > 0 ? ",\n" : "") + "    " + key + ": " + val;
      } else {
        body += (k > 0 ? "," : "") + key + ":" + val;
      }
    }
    return this.pretty ? "  {\n" + body + "\n  }" : "{" + body + "}";
  }

  private emitRow(text: string): void {
    if (this.opts.format === "ndjson") {
      this.sink(text + "\n");
    } else {
      this.sink((this.emitted === 0 ? "[\n" : ",\n") + text);
    }
    if (this.previews.length < PREVIEW_ROWS) this.previews.push(text);
    this.emitted += 1;
  }

  private handleRow(fields: string[]): void {
    if (fields.length > this.maxColumns) this.maxColumns = fields.length;
    if (!this.headerDone) {
      this.headerDone = true;
      if (this.opts.hasHeader) {
        this.buildHeaders(fields, true);
        if (this.opts.format === "arrays") this.emitRow(this.arrayText(this.headerJson));
        return;
      }
      this.buildHeaders(fields, false);
    }
    if (fields.length !== this.headerNames.length) this.ragged += 1;
    if (this.opts.format === "arrays") {
      this.emitRow(this.arrayText(fields.map((f) => this.valueJson(f))));
    } else {
      this.emitRow(this.objectText(fields));
    }
    this.rows += 1;
  }

  summary(): ConvertSummary {
    const warnings: string[] = [];
    const p = this.parser;
    if (this.ragged > 0) {
      warnings.push(
        this.ragged.toLocaleString() +
          " row(s) had a different number of columns than the header. Missing values became null and extra values were named column_N."
      );
    }
    if (p && p.loose > 0) {
      warnings.push(p.loose.toLocaleString() + " field(s) had text after a closing quote. The text was kept as part of the field.");
    }
    if (p && p.unterminated) {
      warnings.push("The file ended inside a quoted field. The last field was kept as-is.");
    }
    if (this.renamed > 0) {
      warnings.push(this.renamed.toLocaleString() + " duplicate or empty header name(s) were renamed so every key is unique.");
    }
    if (p && p.emptyLines > 0 && this.opts.skipEmpty) {
      warnings.push(p.emptyLines.toLocaleString() + " empty line(s) were skipped.");
    }
    let preview = "";
    if (this.previews.length > 0) {
      preview =
        this.opts.format === "ndjson"
          ? this.previews.join("\n")
          : "[\n" + this.previews.join(",\n") + "\n]";
    }
    const columns = this.headerNames.length > this.maxColumns ? this.headerNames.length : this.maxColumns;
    return {
      rows: this.rows,
      columns,
      headers: this.headerNames.slice(0, 40),
      warnings,
      preview,
      delimiter: this.delimiterKey,
    };
  }
}

export interface TextConversion {
  text: string;
  summary: ConvertSummary;
}

export function convertText(text: string, options: CsvOptions): TextConversion {
  let out = "";
  const conv = new CsvConverter(options, (s) => {
    out += s;
  });
  conv.push(text);
  conv.finish();
  return { text: out, summary: conv.summary() };
}
