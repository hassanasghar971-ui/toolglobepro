import {
  Base64Decoder,
  Base64Error,
  DECODE_CHUNK_BYTES,
  ENCODE_CHUNK_BYTES,
  LineWrapper,
  MAX_FILE_BYTES,
  encodeChunk,
  parseDataUriHeader,
  type Base64WorkerRequest,
  type Base64WorkerResponse,
} from "../../../lib/tools/base64-core";

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<Base64WorkerRequest>) => void) | null;
  postMessage: (message: Base64WorkerResponse) => void;
};

const FLUSH_BYTES = 32 * 1024 * 1024;
const PREVIEW_BYTES = 4096;
const HEAD_BYTES = 65_536;

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

async function readSlice(file: File, start: number, end: number): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(start, end).arrayBuffer());
}

async function runEncode(msg: Base64WorkerRequest): Promise<void> {
  const { file, id, urlSafe, padding, dataUri } = msg;
  const total = file.size;
  const wrapper = new LineWrapper(dataUri ? 0 : msg.wrap);
  const sink = new BlobSink();
  if (dataUri) {
    sink.add(new TextEncoder().encode(`data:${file.type || "application/octet-stream"};base64,`));
  }
  let offset = 0;
  while (offset < total) {
    const end = Math.min(offset + ENCODE_CHUNK_BYTES, total);
    const bytes = await readSlice(file, offset, end);
    sink.add(wrapper.wrap(encodeChunk(bytes, urlSafe, end >= total, padding)));
    offset = end;
    ctx.postMessage({ type: "progress", id, processed: offset, total });
  }
  const blob = sink.finish("text/plain");
  const preview = await blob.slice(0, PREVIEW_BYTES).text();
  ctx.postMessage({
    type: "done",
    id,
    blob,
    size: blob.size,
    mime: "text/plain",
    preview,
    previewIsText: true,
    previewTruncated: blob.size > PREVIEW_BYTES,
  });
}

function textPreview(head: Uint8Array): string | null {
  if (head.length === 0) return "";
  for (let i = 0; i < head.length; i++) {
    const c = head[i];
    if (c === 0 || (c < 32 && c !== 9 && c !== 10 && c !== 13)) return null;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(head, { stream: true }).slice(0, 4000);
  } catch {
    return null;
  }
}

async function runDecode(msg: Base64WorkerRequest): Promise<void> {
  const { file, id } = msg;
  const total = file.size;
  const sink = new BlobSink();
  const head = new Uint8Array(HEAD_BYTES);
  let headLen = 0;
  let decoder: Base64Decoder | null = null;
  let mime = "";
  let offset = 0;

  while (offset < total) {
    const end = Math.min(offset + DECODE_CHUNK_BYTES, total);
    let bytes = await readSlice(file, offset, end);
    if (decoder === null) {
      const header = parseDataUriHeader(bytes);
      if (header) {
        bytes = bytes.subarray(header.length);
        mime = header.mime;
        decoder = new Base64Decoder(offset + header.length);
      } else {
        decoder = new Base64Decoder(offset);
      }
    }
    const out = decoder.push(bytes);
    if (headLen < HEAD_BYTES && out.length > 0) {
      const n = Math.min(out.length, HEAD_BYTES - headLen);
      head.set(out.subarray(0, n), headLen);
      headLen += n;
    }
    sink.add(out);
    offset = end;
    ctx.postMessage({ type: "progress", id, processed: offset, total });
  }
  decoder?.finish();

  const blob = sink.finish(mime || "application/octet-stream");
  const headView = head.subarray(0, headLen);
  const text = textPreview(headView);
  const isText = text !== null;
  const preview = isText
    ? text
    : `Binary data (first ${Math.min(64, headLen)} bytes, hex):\n` +
      Array.from(headView.subarray(0, 64), (b) => b.toString(16).padStart(2, "0")).join(" ");
  ctx.postMessage({
    type: "done",
    id,
    blob,
    size: blob.size,
    mime,
    preview,
    previewIsText: isText,
    previewTruncated: isText ? blob.size > text.length : blob.size > 64,
  });
}

ctx.onmessage = async (event) => {
  const msg = event.data;
  if (!msg || msg.type !== "start") return;
  try {
    if (msg.file.size === 0) throw new Base64Error("The file is empty.");
    if (msg.file.size > MAX_FILE_BYTES) throw new Base64Error("The file is larger than the 600 MB limit.");
    if (msg.op === "encode") await runEncode(msg);
    else await runDecode(msg);
  } catch (err) {
    ctx.postMessage({
      type: "error",
      id: msg.id,
      message: err instanceof Error ? err.message : "Unexpected error while converting the file.",
    });
  }
};
