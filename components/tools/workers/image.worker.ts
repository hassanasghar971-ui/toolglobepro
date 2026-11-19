/// <reference lib="webworker" />
import {
  CanvasUnavailableError,
  compressImage,
  type ImageWorkerRequest,
  type ImageWorkerResponse,
} from "../../../lib/tools/image-core";

const scope = self as unknown as {
  postMessage(message: ImageWorkerResponse): void;
  onmessage: ((event: MessageEvent<ImageWorkerRequest>) => void) | null;
};

scope.onmessage = async (event: MessageEvent<ImageWorkerRequest>) => {
  const { id, file, inputType, settings } = event.data;
  try {
    const result = await compressImage(file, inputType, settings, (stage) => {
      scope.postMessage({ kind: "stage", id, stage });
    });
    scope.postMessage({ kind: "result", id, result });
  } catch (error) {
    if (error instanceof CanvasUnavailableError) {
      scope.postMessage({ kind: "error", id, message: error.message, code: "unsupported" });
      return;
    }
    const message =
      error instanceof Error && error.message
        ? error.message
        : "The image could not be processed.";
    scope.postMessage({ kind: "error", id, message, code: "failed" });
  }
};
