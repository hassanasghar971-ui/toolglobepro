import {
  CsvConverter,
  CsvStreamParser,
  MAX_CSV_BYTES,
  detectDelimiter,
} from "../../../lib/tools/csv-core";
import type { CsvOptions, CsvResult, CsvWorkerRequest, CsvWorkerResponse } from "../../../lib/tools/csv-core";

interface WorkerScope {
  postMessage(message: CsvWorkerResponse): void;
  onmessage: ((event: MessageEvent<CsvWorkerRequest>) => void) | null;
}

const ctx = self as unknown as WorkerScope;
const FILE_SLICE = 8 * 1024 * 1024;
const TEXT_SLICE = 1024 * 1024;

class Runner {
  delimiter = ",";
  private parser: CsvStreamParser | null = null;
  private converter: CsvConverter | null = null;
  private readonly options: CsvOptions;
  private readonly startedAt: number;

  constructor(options: CsvOptions) {
    this.options = options;
    this.startedAt = Date.now();
  }

  feed(chunk: string): void {
    if (this.parser === null || this.converter === null) {
      this.delimiter =
        this.options.delimiter === "auto" ? detectDelimiter(chunk.slice(0, 65536)) : this.options.delimiter;
      const converter = new CsvConverter(this.options);
      this.converter = converter;
      this.parser = new CsvStreamParser(this.delimiter, (row, quoted) => converter.pushRow(row, quoted));
    }
    this.parser.write(chunk);
  }

  rows(): number {
    return this.converter ? this.converter.rows : 0;
  }

  finish(): CsvResult {
    this.feed("");
    const parser = this.parser as CsvStreamParser;
    const converter = this.converter as CsvConverter;
    parser.end();
    return converter.finish(this.delimiter, parser.unterminated, this.startedAt);
  }
}

async function run(req: CsvWorkerRequest): Promise<void> {
  try {
    const runner = new Runner(req.options);
    let lastPost = 0;
    const report = (processed: number, total: number): void => {
      const now = Date.now();
      if (now - lastPost >= 120) {
        lastPost = now;
        ctx.postMessage({ type: "progress", id: req.id, processed, total, rows: runner.rows() });
      }
    };

    if (req.file) {
      const file = req.file;
      if (file.size > MAX_CSV_BYTES) throw new Error("This file is larger than the 600 MB limit.");
      const decoder = new TextDecoder("utf-8");
      for (let offset = 0; offset < file.size; offset += FILE_SLICE) {
        const end = Math.min(offset + FILE_SLICE, file.size);
        const buffer = await file.slice(offset, end).arrayBuffer();
        runner.feed(decoder.decode(new Uint8Array(buffer), { stream: true }));
        report(end, file.size);
      }
      runner.feed(decoder.decode());
    } else {
      const text = req.text || "";
      for (let offset = 0; offset < text.length; offset += TEXT_SLICE) {
        runner.feed(text.slice(offset, offset + TEXT_SLICE));
        report(Math.min(offset + TEXT_SLICE, text.length), text.length);
        if (offset % (TEXT_SLICE * 8) === 0) await Promise.resolve();
      }
    }

    const result = runner.finish();
    ctx.postMessage({ type: "done", id: req.id, result });
  } catch (error) {
    ctx.postMessage({
      type: "error",
      id: req.id,
      message: error instanceof Error ? error.message : "The conversion failed.",
    });
  }
}

ctx.onmessage = (event: MessageEvent<CsvWorkerRequest>) => {
  const req = event.data;
  if (req && req.type === "convert") void run(req);
};
