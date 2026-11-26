import { COPY_LIMIT_CHARS, CsvConverter, MAX_FILE_BYTES, outputMime } from "../../lib/csv-to-json-engine";
import type { CsvOptions, WorkerRequest, WorkerResponse } from "../../lib/csv-to-json-engine";

const STRING_BATCH = 1000000;
const TEXT_SLICE = 1000000;

function post(message: WorkerResponse): void {
  (self as unknown as { postMessage: (m: WorkerResponse) => void }).postMessage(message);
}

class OutputBuffer {
  private buf = "";
  private parts: string[] = [];
  private partChars = 0;
  private blobs: Blob[] = [];

  write(text: string): void {
    this.buf += text;
    if (this.buf.length >= STRING_BATCH) this.moveBuffer();
  }

  private moveBuffer(): void {
    if (this.buf === "") return;
    this.parts.push(this.buf);
    this.partChars += this.buf.length;
    this.buf = "";
    if (this.partChars >= COPY_LIMIT_CHARS) {
      this.blobs.push(new Blob(this.parts));
      this.parts = [];
      this.partChars = 0;
    }
  }

  finish(mime: string): { blob: Blob; text: string } {
    this.moveBuffer();
    const all: BlobPart[] = [];
    for (const b of this.blobs) all.push(b);
    for (const p of this.parts) all.push(p);
    const text = this.blobs.length === 0 ? this.parts.join("") : "";
    return { blob: new Blob(all, { type: mime }), text };
  }
}

function complete(id: number, out: OutputBuffer, conv: CsvConverter, options: CsvOptions, started: number): void {
  conv.finish();
  const res = out.finish(outputMime(options.format));
  post({
    type: "done",
    id,
    blob: res.blob,
    text: res.text,
    bytes: res.blob.size,
    ms: Date.now() - started,
    summary: conv.summary(),
  });
}

async function convertFile(req: WorkerRequest): Promise<void> {
  const id = req.id;
  const options = req.options;
  const file = req.file;
  if (!file) {
    post({ type: "error", id, message: "No file was received." });
    return;
  }
  if (file.size > MAX_FILE_BYTES) {
    post({ type: "error", id, message: "This file is larger than the 600 MB limit." });
    return;
  }
  const started = Date.now();
  try {
    const out = new OutputBuffer();
    const conv = new CsvConverter(options, (t) => out.write(t));
    let decoder = new TextDecoder("utf-8");
    try {
      decoder = new TextDecoder(options.encoding);
    } catch {
      decoder = new TextDecoder("utf-8");
    }
    const reader = file.stream().getReader();
    let loaded = 0;
    let lastPost = Date.now();
    for (;;) {
      const res = await reader.read();
      if (res.done) break;
      loaded += res.value.byteLength;
      conv.push(decoder.decode(res.value, { stream: true }));
      const now = Date.now();
      if (now - lastPost > 120) {
        post({ type: "progress", id, loaded, total: file.size, rows: conv.rowCount });
        lastPost = now;
      }
    }
    conv.push(decoder.decode());
    post({ type: "progress", id, loaded: file.size, total: file.size, rows: conv.rowCount });
    complete(id, out, conv, options, started);
  } catch (err) {
    post({ type: "error", id, message: err instanceof Error ? err.message : "Could not convert this file." });
  }
}

function convertLargeText(req: WorkerRequest): void {
  const id = req.id;
  const options = req.options;
  const text = req.text ?? "";
  const started = Date.now();
  try {
    const out = new OutputBuffer();
    const conv = new CsvConverter(options, (t) => out.write(t));
    let lastPost = Date.now();
    for (let pos = 0; pos < text.length; pos += TEXT_SLICE) {
      conv.push(text.slice(pos, pos + TEXT_SLICE));
      const now = Date.now();
      if (now - lastPost > 120) {
        post({ type: "progress", id, loaded: pos, total: text.length, rows: conv.rowCount });
        lastPost = now;
      }
    }
    complete(id, out, conv, options, started);
  } catch (err) {
    post({ type: "error", id, message: err instanceof Error ? err.message : "Could not convert this text." });
  }
}

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  if (req.type === "convert-file") {
    void convertFile(req);
  } else if (req.type === "convert-text") {
    convertLargeText(req);
  }
});
