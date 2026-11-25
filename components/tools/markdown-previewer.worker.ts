import { BLOCK_LIMIT, MAX_FILE_BYTES, StreamParser, parseDocument } from "../../lib/markdown-engine";
import type { BlockNode, WorkerRequest, WorkerResponse } from "../../lib/markdown-engine";

const BATCH_BLOCKS = 200;

function post(message: WorkerResponse): void {
  (self as unknown as { postMessage: (m: WorkerResponse) => void }).postMessage(message);
}

function parseText(id: number, text: string): void {
  try {
    const result = parseDocument(text);
    post({
      type: "result",
      id,
      blocks: result.blocks,
      headings: result.headings,
      stats: result.stats,
      truncated: result.truncated,
    });
  } catch (err) {
    post({ type: "error", id, message: err instanceof Error ? err.message : "Could not render this Markdown." });
  }
}

async function parseFile(id: number, file: File): Promise<void> {
  if (file.size > MAX_FILE_BYTES) {
    post({ type: "error", id, message: "This file is larger than the 600 MB limit." });
    return;
  }
  try {
    const parser = new StreamParser(BLOCK_LIMIT);
    const decoder = new TextDecoder("utf-8");
    const reader = file.stream().getReader();
    let loaded = 0;
    let pending: BlockNode[] = [];
    let lastPost = Date.now();

    const sendPending = (): void => {
      const headings = parser.takeHeadings();
      if (pending.length + headings.length > 0) {
        post({ type: "blocks", id, blocks: pending, headings });
        pending = [];
      }
    };

    for (;;) {
      const res = await reader.read();
      if (res.done) break;
      loaded += res.value.byteLength;
      const blocks = parser.push(decoder.decode(res.value, { stream: true }));
      for (const b of blocks) pending.push(b);
      const now = Date.now();
      const due = pending.length >= BATCH_BLOCKS ? true : now - lastPost > 150;
      if (due) {
        sendPending();
        post({ type: "progress", id, loaded, total: file.size });
        lastPost = now;
      }
    }

    const tail = parser.push(decoder.decode());
    for (const b of tail) pending.push(b);
    const rest = parser.finish();
    for (const b of rest) pending.push(b);
    sendPending();
    post({ type: "done", id, stats: parser.stats, truncated: parser.truncated });
  } catch (err) {
    post({ type: "error", id, message: err instanceof Error ? err.message : "Could not read this file." });
  }
}

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  if (req.type === "parse-text") {
    parseText(req.id, req.text ?? "");
  } else if (req.type === "parse-file" && req.file) {
    void parseFile(req.id, req.file);
  }
});
