import {
  runDiff,
  type DiffWorkerRequest,
  type DiffWorkerResponse,
} from "../../../lib/tools/diff-core";

interface WorkerScope {
  postMessage(message: DiffWorkerResponse): void;
  onmessage: ((event: MessageEvent<DiffWorkerRequest>) => void) | null;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = (event: MessageEvent<DiffWorkerRequest>) => {
  const { id, a, b, options } = event.data;
  let last = 0;
  try {
    const result = runDiff(a, b, options, (stage, fraction) => {
      const now = Date.now();
      if (now - last < 100 && fraction < 1) return;
      last = now;
      scope.postMessage({ id, type: "progress", stage, fraction });
    });
    scope.postMessage({ id, type: "done", result });
  } catch (error) {
    scope.postMessage({
      id,
      type: "error",
      message: error instanceof Error ? error.message : "The comparison failed.",
    });
  }
};
