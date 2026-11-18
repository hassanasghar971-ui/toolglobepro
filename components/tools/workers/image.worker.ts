import {
  compressImage,
  type ImageWorkerRequest,
  type ImageWorkerResponse,
} from "../../../lib/tools/image-core";

interface WorkerScope {
  postMessage(message: ImageWorkerResponse): void;
  onmessage: ((event: MessageEvent<ImageWorkerRequest>) => void) | null;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = async (event: MessageEvent<ImageWorkerRequest>) => {
  const { id, file, options } = event.data;

  if (typeof OffscreenCanvas === "undefined" || typeof createImageBitmap !== "function") {
    scope.postMessage({
      id,
      type: "error",
      unsupported: true,
      message: "This browser cannot process images inside a worker.",
    });
    return;
  }

  try {
    const result = await compressImage(file, options, (stage) => {
      scope.postMessage({ id, type: "stage", stage });
    });
    scope.postMessage({ id, type: "done", result });
  } catch (error) {
    scope.postMessage({
      id,
      type: "error",
      message: error instanceof Error ? error.message : "Image processing failed.",
    });
  }
};
