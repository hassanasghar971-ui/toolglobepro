import { processRequest } from "@/lib/image-metadata-remover-engine";
import type { MetaRequest } from "@/lib/image-metadata-remover-engine";

interface Poster {
  postMessage(message: unknown): void;
}

const poster = self as unknown as Poster;
const KNOWN_TYPES: string[] = ["inspect", "clean"];

async function handle(request: MetaRequest): Promise<void> {
  const reply = await processRequest(request);
  poster.postMessage(reply);
}

self.addEventListener("message", (event: MessageEvent<MetaRequest>) => {
  const data = event.data;
  if (data && KNOWN_TYPES.includes(data.type)) {
    void handle(data);
  }
});
