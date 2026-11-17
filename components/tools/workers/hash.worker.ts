import {
  MAX_FILE_BYTES,
  createHasher,
  toHex,
  type HashAlgo,
  type HashWorkerRequest,
  type HashWorkerResponse,
} from "../../../lib/tools/hash-core";

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<HashWorkerRequest>) => void) | null;
  postMessage: (message: HashWorkerResponse) => void;
};

const SLICE_BYTES = 4 * 1024 * 1024;

async function forEachChunk(file: File, fn: (chunk: Uint8Array) => void): Promise<void> {
  if (typeof file.stream === "function") {
    const reader = file.stream().getReader();
    for (;;) {
      const r = await reader.read();
      if (r.done) break;
      if (r.value && r.value.length > 0) fn(r.value);
    }
    return;
  }
  for (let offset = 0; offset < file.size; offset += SLICE_BYTES) {
    fn(new Uint8Array(await file.slice(offset, offset + SLICE_BYTES).arrayBuffer()));
  }
}

ctx.onmessage = async (event) => {
  const msg = event.data;
  if (!msg || msg.type !== "start") return;
  const { id, file, algos } = msg;
  try {
    if (file.size > MAX_FILE_BYTES) throw new Error("The file is larger than the 600 MB limit.");
    if (algos.length === 0) throw new Error("Select at least one algorithm.");

    const hashers = algos.map((a) => createHasher(a));
    const started = performance.now();
    let processed = 0;
    let lastPost = 0;

    await forEachChunk(file, (chunk) => {
      for (let i = 0; i < hashers.length; i++) hashers[i].update(chunk);
      processed += chunk.length;
      const now = performance.now();
      if (now - lastPost >= 100) {
        lastPost = now;
        ctx.postMessage({ type: "progress", id, processed, total: file.size });
      }
    });

    const hashes: Partial<Record<HashAlgo, string>> = {};
    algos.forEach((a, i) => {
      hashes[a] = toHex(hashers[i].digest());
    });
    ctx.postMessage({ type: "done", id, hashes, bytes: processed, ms: performance.now() - started });
  } catch (err) {
    ctx.postMessage({
      type: "error",
      id,
      message: err instanceof Error ? err.message : "Unexpected error while hashing the file.",
    });
  }
};
