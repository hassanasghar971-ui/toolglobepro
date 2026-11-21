import { CsvToJsonConverter } from "./csv-parser";
import type { CsvConvertOptions, WorkerRequest, WorkerResponse } from "./csv-parser";

/**
 * Background worker: reads the input Blob in 8 MB slices, converts
 * incrementally, and assembles the output as Blob chunks so memory stays
 * bounded even for ~600 MB inputs.
 */

interface WorkerScope {
  postMessage(message: WorkerResponse): void;
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
}

const ctx = self as unknown as WorkerScope;

const READ_CHUNK_BYTES = 8 * 1024 * 1024;
const FLUSH_CHARS = 8 * 1024 * 1024;

async function run(blob: Blob, options: CsvConvertOptions): Promise<void> {
  const startedAt = performance.now();
  try {
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const outputBlobs: Blob[] = [];
    let parts: string[] = [];
    let partChars = 0;
    let outputBytes = 0;

    const flush = () => {
      if (parts.length === 0) return;
      const piece = new Blob(parts, { type: "application/json" });
      outputBytes += piece.size;
      outputBlobs.push(piece);
      parts = [];
      partChars = 0;
    };

    const converter = new CsvToJsonConverter(options, (text) => {
      parts.push(text);
      partChars += text.length;
      if (partChars >= FLUSH_CHARS) flush();
    });

    const total = blob.size;
    let offset = 0;
    let lastReport = 0;

    while (offset < total) {
      const end = Math.min(offset + READ_CHUNK_BYTES, total);
      const buffer = await blob.slice(offset, end).arrayBuffer();
      converter.push(decoder.decode(buffer, { stream: end < total }));
      offset = end;

      const now = performance.now();
      if (now - lastReport > 120 || offset >= total) {
        lastReport = now;
        ctx.postMessage({ type: "progress", bytes: offset, total, rows: converter.rows });
      }
    }

    converter.finish();
    flush();

    const preview = converter.getPreview();
    ctx.postMessage({
      type: "done",
      blob: new Blob(outputBlobs, {
        type: options.format === "ndjson" ? "application/x-ndjson" : "application/json",
      }),
      rows: converter.rows,
      columns: converter.columns,
      delimiter: converter.delimiter,
      inputBytes: total,
      outputBytes,
      preview: preview.text,
      previewTruncated: preview.truncated,
      warnings: converter.warnings,
      elapsedMs: Math.round(performance.now() - startedAt),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Conversion failed. The file may be too large for this device's memory.";
    ctx.postMessage({ type: "error", message });
  }
}

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const data = event.data;
  if (data.type === "start") {
    void run(data.blob, data.options);
  }
};

export {};
