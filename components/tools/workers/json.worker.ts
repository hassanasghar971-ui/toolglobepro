import {
  FULL_PARSE_LIMIT,
  JsonError,
  JsonStreamProcessor,
  MAX_FILE_BYTES,
  STREAM_CHUNK_BYTES,
  sortKeysDeep,
  stripBom,
  toErrorInfo,
  type JsonWorkerRequest,
  type JsonWorkerResponse,
} from "../../../lib/tools/json-core";

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<JsonWorkerRequest>) => void) | null;
  postMessage: (message: JsonWorkerResponse) => void;
};

const FLUSH_BYTES = 32 * 1024 * 1024;
const PREVIEW_BYTES = 20_000;

class BlobSink {
  private parts: BlobPart[] = [];
  private blobs: Blob[] = [];
  private pending = 0;
  size = 0;

  add(piece: Uint8Array): void {
    if (piece.length === 0) return;
    this.parts.push(piece as BlobPart);
    this.pending += piece.length;
    this.size += piece.length;
    if (this.pending >= FLUSH_BYTES) this.flush();
  }

  private flush(): void {
    if (this.parts.length > 0) {
      this.blobs.push(new Blob(this.parts));
      this.parts = [];
      this.pending = 0;
    }
  }

  finish(type: string): Blob {
    this.flush();
    return new Blob(this.blobs, { type });
  }
}

async function run(msg: JsonWorkerRequest): Promise<void> {
  const { file, id, mode, indent } = msg;
  const total = file.size;
  if (total === 0) throw new Error("The file is empty.");
  if (total > MAX_FILE_BYTES) throw new Error("The file is larger than the 600 MB limit.");

  const useFull = msg.sortKeys && mode !== "validate" && total <= FULL_PARSE_LIMIT;
  const proc = new JsonStreamProcessor({ mode: useFull ? "validate" : mode, indent });
  const sink = new BlobSink();
  let offset = 0;

  try {
    while (offset < total) {
      const end = Math.min(offset + STREAM_CHUNK_BYTES, total);
      const bytes = new Uint8Array(await file.slice(offset, end).arrayBuffer());
      sink.add(proc.push(bytes));
      offset = end;
      ctx.postMessage({
        type: "progress",
        id,
        processed: offset,
        total,
        phase: useFull ? "Validating" : mode === "validate" ? "Validating" : mode === "format" ? "Formatting" : "Minifying",
      });
    }
    sink.add(proc.finish());
  } catch (err) {
    if (err instanceof JsonError) {
      const winStart = Math.max(0, err.offset - 80);
      const win = new Uint8Array(await file.slice(winStart, err.offset + 80).arrayBuffer());
      ctx.postMessage({ type: "invalid", id, error: toErrorInfo(err, win, winStart) });
      return;
    }
    throw err;
  }

  const stats = proc.getStats();
  let blob: Blob | null = null;

  if (useFull) {
    ctx.postMessage({ type: "progress", id, processed: total, total, phase: "Parsing" });
    const text = await file.text();
    const parsed: unknown = JSON.parse(stripBom(text));
    ctx.postMessage({ type: "progress", id, processed: total, total, phase: "Sorting keys" });
    const output = JSON.stringify(sortKeysDeep(parsed), null, mode === "format" ? indent : undefined);
    blob = new Blob([output], { type: "application/json" });
  } else if (mode !== "validate") {
    blob = sink.finish("application/json");
  }

  const preview = blob ? await blob.slice(0, PREVIEW_BYTES).text() : "";
  ctx.postMessage({
    type: "done",
    id,
    blob,
    size: blob ? blob.size : 0,
    stats,
    strategy: useFull ? "full" : "stream",
    preview,
    previewTruncated: blob ? blob.size > PREVIEW_BYTES : false,
  });
}

ctx.onmessage = async (event) => {
  const msg = event.data;
  if (!msg || msg.type !== "start") return;
  try {
    await run(msg);
  } catch (err) {
    const raw = err instanceof Error ? err.message : "";
    ctx.postMessage({
      type: "error",
      id: msg.id,
      message:
        err instanceof RangeError || /memory|allocation/i.test(raw)
          ? "The browser ran out of memory while processing this file. Try validate or minify instead of format, turn off key sorting, or use a smaller file."
          : raw || "Unexpected error while processing the file.",
    });
  }
};
