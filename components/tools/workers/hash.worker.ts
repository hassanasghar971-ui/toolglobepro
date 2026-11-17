import {
  MAX_FILE_BYTES,
  createHasher,
  type HashAlgo,
  type Hasher,
  type HashWorkerRequest,
  type HashWorkerResponse,
} from "../../../lib/tools/hash-core";

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<HashWorkerRequest>) => void) | null;
  postMessage: (message: HashWorkerResponse) => void;
};

const SLICE_BYTES = 4 * 1024 * 1024;
const PROGRESS_INTERVAL_MS = 100;

async function run(request: HashWorkerRequest): Promise<void> {
  const { id, file, algos } = request;
  try {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error("This file is larger than the 600 MB limit.");
    }
    if (algos.length === 0) {
      throw new Error("Select at least one algorithm.");
    }

    const started = performance.now();
    const hashers: { algo: HashAlgo; hasher: Hasher }[] = algos.map((algo) => ({
      algo,
      hasher: createHasher(algo),
    }));

    const total = file.size;
    let processed = 0;
    let lastPost = 0;

    const feed = (chunk: Uint8Array): void => {
      for (const entry of hashers) entry.hasher.update(chunk);
      processed += chunk.length;
      const now = performance.now();
      if (now - lastPost >= PROGRESS_INTERVAL_MS) {
        lastPost = now;
        ctx.postMessage({ type: "progress", id, processed, total });
      }
    };

    if (typeof file.stream === "function") {
      const reader = file.stream().getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) feed(value);
      }
    } else {
      for (let offset = 0; offset < total; offset += SLICE_BYTES) {
        const buffer = await file.slice(offset, Math.min(offset + SLICE_BYTES, total)).arrayBuffer();
        feed(new Uint8Array(buffer));
      }
    }

    ctx.postMessage({ type: "progress", id, processed: total, total });
    ctx.postMessage({
      type: "done",
      id,
      results: hashers.map((entry) => ({ algo: entry.algo, digest: entry.hasher.digest() })),
      elapsedMs: Math.round(performance.now() - started),
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "NotReadableError"
        ? "The file could not be read. It may have been moved or deleted."
        : error instanceof Error
          ? error.message
          : "Hashing failed.";
    ctx.postMessage({ type: "error", id, message });
  }
}

ctx.onmessage = (event: MessageEvent<HashWorkerRequest>) => {
  void run(event.data);
};
