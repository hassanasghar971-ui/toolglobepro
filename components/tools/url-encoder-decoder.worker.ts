import { COPY_LIMIT_CHARS, MAX_FILE_BYTES, PREVIEW_CHARS, UrlProcessor } from "../../lib/url-encoder-decoder-engine";
import type { WorkerRequest, WorkerResponse } from "../../lib/url-encoder-decoder-engine";

const STRING_BATCH = 1000000;

function post(message: WorkerResponse): void {
  (self as unknown as { postMessage: (m: WorkerResponse) => void }).postMessage(message);
}

class OutputBuffer {
  private buf = "";
  private parts: string[] = [];
  private partChars = 0;
  private blobs: Blob[] = [];
  preview = "";

  write(text: string): void {
    if (this.preview.length < PREVIEW_CHARS) {
      this.preview += text.slice(0, PREVIEW_CHARS - this.preview.length);
    }
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

  finish(): { blob: Blob; text: string } {
    this.moveBuffer();
    const all: BlobPart[] = [];
    for (const b of this.blobs) all.push(b);
    for (const p of this.parts) all.push(p);
    const text = this.blobs.length === 0 ? this.parts.join("") : "";
    return { blob: new Blob(all, { type: "text/plain;charset=utf-8" }), text };
  }
}

async function processFile(req: WorkerRequest): Promise<void> {
  const id = req.id;
  const file = req.file;
  if (!file) {
    post({ type: "error", id, message: "No input was received." });
    return;
  }
  if (file.size > MAX_FILE_BYTES) {
    post({ type: "error", id, message: "This input is larger than the 600 MB limit." });
    return;
  }
  const started = Date.now();
  try {
    const out = new OutputBuffer();
    const proc = new UrlProcessor(req.options, (t) => out.write(t));
    const decoder = new TextDecoder("utf-8");
    const reader = file.stream().getReader();
    let loaded = 0;
    let lastPost = Date.now();
    for (;;) {
      const res = await reader.read();
      if (res.done) break;
      loaded += res.value.byteLength;
      proc.push(decoder.decode(res.value, { stream: true }));
      const now = Date.now();
      if (now - lastPost > 120) {
        post({ type: "progress", id, loaded, total: file.size });
        lastPost = now;
      }
    }
    proc.push(decoder.decode());
    proc.finish();
    const res = out.finish();
    post({
      type: "done",
      id,
      blob: res.blob,
      text: res.text,
      preview: out.preview,
      bytes: res.blob.size,
      ms: Date.now() - started,
      stray: proc.stray,
      invalid: proc.invalid,
    });
  } catch (err) {
    post({ type: "error", id, message: err instanceof Error ? err.message : "Could not process this input." });
  }
}

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  if (req.type === "process") {
    void processFile(req);
  }
});
