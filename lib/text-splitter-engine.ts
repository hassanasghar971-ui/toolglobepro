export const MAX_BYTES = 600 * 1024 * 1024;
export const MAX_PARTS = 500;

const MAX_LINE_CHARS = 8000000;
const FLUSH_CHARS = 4000000;
const YIELD_EVERY = 16;

export interface SplitOptions {
  mode: string;
  linesPerPart: number;
  bytesPerPart: number;
  keepHeader: boolean;
}

export interface SplitPart {
  index: number;
  rows: number;
  bytes: number;
  blob: Blob;
}

export interface SplitOutcome {
  parts: SplitPart[];
  error: string;
  cancelled: boolean;
}

export interface BuiltOptions {
  options: SplitOptions;
  error: string;
}

export function utf8Length(text: string): number {
  let n = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    if (c < 0x80) {
      n += 1;
    } else if (c < 0x800) {
      n += 2;
    } else if (c >= 0xd800 && c <= 0xdbff) {
      n += 4;
      i += 1;
    } else {
      n += 3;
    }
  }
  return n;
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0 B";
  if (n < 1024) return n + " B";
  const units = ["KB", "MB", "GB"];
  let value = n / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return value.toFixed(value >= 100 ? 0 : 1) + " " + units[i];
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function splitName(fileName: string): { base: string; ext: string } {
  const safe = fileName.replace(/[\\/:*?"<>]/g, "_");
  const dot = safe.lastIndexOf(".");
  if (dot > 0) return { base: safe.slice(0, dot), ext: safe.slice(dot) };
  return { base: safe === "" ? "file" : safe, ext: ".txt" };
}

export function partName(base: string, ext: string, index: number): string {
  return base + "-part-" + String(index).padStart(3, "0") + ext;
}

export function buildOptions(
  mode: string,
  linesText: string,
  sizeText: string,
  unit: string,
  partsText: string,
  keepHeader: boolean,
  fileSize: number,
): BuiltOptions {
  const base: SplitOptions = { mode: "lines", linesPerPart: 1000, bytesPerPart: 0, keepHeader };

  if (mode === "lines") {
    const n = Number(linesText.trim());
    if (!Number.isInteger(n) || n < 1) {
      return { options: base, error: "Enter a whole number of lines per file, 1 or more." };
    }
    return { options: { ...base, linesPerPart: n }, error: "" };
  }

  if (mode === "size") {
    const v = Number(sizeText.trim().replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) {
      return { options: base, error: "Enter a size greater than 0." };
    }
    const bytes = Math.floor(v * (unit === "KB" ? 1024 : 1048576));
    if (bytes < 1024) {
      return { options: base, error: "The size per file must be at least 1 KB." };
    }
    return { options: { ...base, mode: "size", bytesPerPart: bytes }, error: "" };
  }

  const p = Number(partsText.trim());
  if (!Number.isInteger(p) || p < 2) {
    return { options: base, error: "Enter a whole number of parts, 2 or more." };
  }
  if (p > MAX_PARTS) {
    return { options: base, error: "You can create at most " + MAX_PARTS + " files at once." };
  }
  const target = Math.max(1024, Math.ceil((fileSize / p) * 1.02));
  return { options: { ...base, mode: "size", bytesPerPart: target }, error: "" };
}

export class LineSplitter {
  readonly parts: SplitPart[] = [];
  private readonly opts: SplitOptions;
  private readonly bySize: boolean;
  private carry = "";
  private header = "";
  private lineCount = 0;
  private open = false;
  private pieces: string[] = [];
  private pieceChars = 0;
  private blobs: Blob[] = [];
  private partRows = 0;
  private partBytes = 0;

  constructor(opts: SplitOptions) {
    this.opts = opts;
    this.bySize = opts.mode !== "lines";
  }

  push(text: string): string {
    const data = this.carry === "" ? text : this.carry + text;
    let pos = 0;
    let idx = data.indexOf("\n", pos);
    while (idx >= 0) {
      const err = this.addLine(data.slice(pos, idx + 1));
      if (err !== "") return err;
      pos = idx + 1;
      idx = data.indexOf("\n", pos);
    }
    this.carry = data.slice(pos);
    if (this.carry.length > MAX_LINE_CHARS) {
      return "A single line is longer than 8 million characters, so this file cannot be split by line breaks.";
    }
    return "";
  }

  finish(): string {
    if (this.carry !== "") {
      const tail = this.carry;
      this.carry = "";
      const err = this.addLine(tail);
      if (err !== "") return err;
    }
    if (this.open) this.closePart();
    return "";
  }

  private addLine(line: string): string {
    const bytes = this.bySize ? utf8Length(line) : 0;
    this.lineCount += 1;

    if (this.lineCount === 1 && this.opts.keepHeader) {
      this.header = line.endsWith("\n") ? line : line + "\n";
      this.openPart();
      this.write(line, bytes);
      return "";
    }

    if (this.open && this.partRows > 0 && this.isFull(bytes)) this.closePart();

    if (!this.open) {
      if (this.parts.length >= MAX_PARTS) {
        return "This would create more than " + MAX_PARTS + " files. Choose more lines or a bigger size per file.";
      }
      this.openPart();
    }

    this.write(line, bytes);
    this.partRows += 1;
    return "";
  }

  private isFull(bytes: number): boolean {
    if (this.opts.mode === "lines") return this.partRows >= this.opts.linesPerPart;
    return this.partBytes + bytes > this.opts.bytesPerPart;
  }

  private openPart() {
    this.open = true;
    this.partRows = 0;
    this.partBytes = 0;
    this.blobs = [];
    this.pieces = [];
    this.pieceChars = 0;
    if (this.opts.keepHeader && this.parts.length > 0 && this.header !== "") {
      this.write(this.header, this.bySize ? utf8Length(this.header) : 0);
    }
  }

  private write(text: string, bytes: number) {
    this.pieces.push(text);
    this.pieceChars += text.length;
    this.partBytes += bytes;
    if (this.pieceChars >= FLUSH_CHARS) this.flush();
  }

  private flush() {
    if (this.pieces.length > 0) {
      this.blobs.push(new Blob(this.pieces));
      this.pieces = [];
      this.pieceChars = 0;
    }
  }

  private closePart() {
    this.flush();
    const blob = new Blob(this.blobs, { type: "text/plain;charset=utf-8" });
    this.parts.push({ index: this.parts.length + 1, rows: this.partRows, bytes: blob.size, blob });
    this.open = false;
    this.blobs = [];
  }
}

function pause(): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

export async function splitFile(
  file: File,
  opts: SplitOptions,
  onProgress: (done: number, total: number) => void,
  isCancelled: () => boolean,
): Promise<SplitOutcome> {
  const fail = (message: string): SplitOutcome => ({ parts: [], error: message, cancelled: false });

  if (typeof file.stream !== "function") {
    return fail("This browser cannot read files in chunks. Please use a recent version of Chrome, Edge, Firefox or Safari.");
  }

  const splitter = new LineSplitter(opts);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const reader = file.stream().getReader();
  let done = 0;
  let round = 0;

  try {
    for (;;) {
      const step = await reader.read();
      if (step.done) break;
      if (isCancelled()) {
        await reader.cancel().catch(() => undefined);
        return { parts: [], error: "", cancelled: true };
      }
      done += step.value.byteLength;
      const err = splitter.push(decoder.decode(step.value, { stream: true }));
      if (err !== "") {
        await reader.cancel().catch(() => undefined);
        return fail(err);
      }
      round += 1;
      if (round % YIELD_EVERY === 0) {
        onProgress(done, file.size);
        await pause();
      }
    }
    const errTail = splitter.push(decoder.decode());
    if (errTail !== "") return fail(errTail);
    const errEnd = splitter.finish();
    if (errEnd !== "") return fail(errEnd);
  } catch (e) {
    if (e instanceof TypeError) {
      return fail("This file is not valid UTF-8 text, so it cannot be split safely. Convert it to UTF-8 first.");
    }
    return fail("The file could not be read. Try again, or try a smaller file.");
  }

  onProgress(file.size, file.size);
  return { parts: splitter.parts, error: "", cancelled: false };
}
