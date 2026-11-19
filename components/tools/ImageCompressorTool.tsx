"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, KeyboardEvent } from "react";
import {
  DEFAULT_QUALITY,
  DIMENSION_PRESETS,
  MAX_FILES,
  MAX_FILE_BYTES,
  MAX_QUALITY,
  MIN_QUALITY,
  compressImage,
  detectImageType,
  formatBytes,
  outputName,
  percentChange,
  settingsKey,
  type CompressResult,
  type CompressSettings,
  type ImageStage,
  type ImageWorkerRequest,
  type ImageWorkerResponse,
  type OutputFormat,
} from "@/lib/tools/image-core";
import { MAX_ZIP_BYTES, createZip } from "@/lib/tools/zip-core";

type ItemStatus = "queued" | "working" | "done" | "error" | "cancelled";

interface ItemResult extends CompressResult {
  settingsKey: string;
  name: string;
}

interface Item {
  id: number;
  file: File;
  name: string;
  size: number;
  inputType: string;
  thumbUrl: string | null;
  status: ItemStatus;
  stage?: ImageStage;
  result?: ItemResult;
  error?: string;
}

type JobOutcome =
  | { kind: "ok"; result: CompressResult }
  | { kind: "error"; message: string }
  | { kind: "cancelled" };

interface Pending {
  id: number;
  handle: (message: ImageWorkerResponse) => void;
  fail: (message: string) => void;
}

const THUMB_LIMIT_BYTES = 25 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif";

const FORMAT_OPTIONS: { value: OutputFormat; label: string }[] = [
  { value: "original", label: "Keep format" },
  { value: "jpeg", label: "JPEG" },
  { value: "webp", label: "WebP" },
  { value: "png", label: "PNG" },
];

const STAGE_LABELS: Record<ImageStage, string> = {
  decoding: "Decoding image…",
  resizing: "Resizing…",
  encoding: "Encoding…",
};

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong while processing this image.";
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-brand-600 dark:text-brand-400"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function ImagePlaceholder() {
  return (
    <svg
      className="h-6 w-6 text-slate-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="m21 16-5-5-9 9" />
    </svg>
  );
}

export default function ImageCompressorTool() {
  const [items, setItems] = useState<Item[]>([]);
  const [quality, setQuality] = useState<number>(DEFAULT_QUALITY);
  const [maxDimension, setMaxDimension] = useState<number>(0);
  const [format, setFormat] = useState<OutputFormat>("original");
  const [background, setBackground] = useState<string>("#ffffff");
  const [dragging, setDragging] = useState(false);
  const [notices, setNotices] = useState<string[]>([]);
  const [zipProgress, setZipProgress] = useState<number | null>(null);

  const itemsRef = useRef<Item[]>([]);
  const settingsRef = useRef<CompressSettings>({
    quality: DEFAULT_QUALITY,
    maxDimension: 0,
    format: "original",
    background: "#ffffff",
  });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef(0);
  const nextIdRef = useRef(1);
  const jobIdRef = useRef(0);
  const genRef = useRef(0);
  const runningRef = useRef(false);
  const workerRef = useRef<Worker | null>(null);
  const workerBrokenRef = useRef(false);
  const pendingRef = useRef<Pending | null>(null);
  const cancelCurrentRef = useRef<(() => void) | null>(null);
  const zipBusyRef = useRef(false);

  const settings = useMemo<CompressSettings>(
    () => ({ quality, maxDimension, format, background }),
    [quality, maxDimension, format, background],
  );
  const currentKey = useMemo(() => settingsKey(settings), [settings]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const commit = useCallback((next: Item[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const patch = useCallback(
    (id: number, changes: Partial<Item>) => {
      commit(itemsRef.current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
    },
    [commit],
  );

  const pushNotice = useCallback((message: string) => {
    setNotices((prev) => (prev.includes(message) ? prev : [...prev, message].slice(-6)));
  }, []);

  const killWorker = useCallback(() => {
    const worker = workerRef.current;
    workerRef.current = null;
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    }
  }, []);

  const getWorker = useCallback((): Worker | null => {
    if (workerBrokenRef.current) return null;
    if (workerRef.current) return workerRef.current;
    if (typeof Worker === "undefined") {
      workerBrokenRef.current = true;
      return null;
    }
    try {
      const worker = new Worker(new URL("./workers/image.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (event: MessageEvent<ImageWorkerResponse>) => {
        pendingRef.current?.handle(event.data);
      };
      worker.onerror = (event: ErrorEvent) => {
        event.preventDefault();
        const pending = pendingRef.current;
        if (pending) {
          pending.fail(
            "The image worker stopped unexpectedly. The image may be too large for your device's memory.",
          );
        } else {
          killWorker();
        }
      };
      workerRef.current = worker;
      return worker;
    } catch {
      workerBrokenRef.current = true;
      return null;
    }
  }, [killWorker]);

  const runJob = useCallback(
    (
      file: File,
      inputType: string,
      jobSettings: CompressSettings,
      onStage: (stage: ImageStage) => void,
    ): Promise<JobOutcome> => {
      return new Promise<JobOutcome>((resolve) => {
        let settled = false;
        const finish = (outcome: JobOutcome) => {
          if (settled) return;
          settled = true;
          pendingRef.current = null;
          cancelCurrentRef.current = null;
          resolve(outcome);
        };

        const viaMainThread = () => {
          compressImage(file, inputType, jobSettings, onStage).then(
            (result) => finish({ kind: "ok", result }),
            (error: unknown) => finish({ kind: "error", message: errorMessage(error) }),
          );
        };

        cancelCurrentRef.current = () => {
          killWorker();
          finish({ kind: "cancelled" });
        };

        const worker = getWorker();
        if (!worker) {
          viaMainThread();
          return;
        }

        const id = ++jobIdRef.current;
        pendingRef.current = {
          id,
          handle: (message) => {
            if (message.id !== id) return;
            if (message.kind === "stage") {
              onStage(message.stage);
            } else if (message.kind === "result") {
              finish({ kind: "ok", result: message.result });
            } else if (message.code === "unsupported") {
              workerBrokenRef.current = true;
              pendingRef.current = null;
              killWorker();
              viaMainThread();
            } else {
              finish({ kind: "error", message: message.message });
            }
          },
          fail: (message) => {
            killWorker();
            finish({ kind: "error", message });
          },
        };

        const request: ImageWorkerRequest = { id, file, inputType, settings: jobSettings };
        try {
          worker.postMessage(request);
        } catch {
          pendingRef.current = null;
          killWorker();
          workerBrokenRef.current = true;
          viaMainThread();
        }
      });
    },
    [getWorker, killWorker],
  );

  const runQueue = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    const myGen = genRef.current;
    try {
      for (;;) {
        if (genRef.current !== myGen) return;
        const next = itemsRef.current.find((item) => item.status === "queued");
        if (!next) break;

        const jobSettings = settingsRef.current;
        const key = settingsKey(jobSettings);
        patch(next.id, { status: "working", stage: "decoding", error: undefined });

        const outcome = await runJob(next.file, next.inputType, jobSettings, (stage) => {
          if (genRef.current === myGen) patch(next.id, { stage });
        });
        if (genRef.current !== myGen) return;

        if (outcome.kind === "ok") {
          patch(next.id, {
            status: "done",
            stage: undefined,
            error: undefined,
            result: {
              ...outcome.result,
              settingsKey: key,
              name: outputName(next.name, outcome.result.outType, outcome.result.keptOriginal),
            },
          });
        } else if (outcome.kind === "error") {
          patch(next.id, { status: "error", stage: undefined, error: outcome.message });
        } else {
          patch(next.id, { status: "cancelled", stage: undefined });
        }
      }
    } finally {
      if (genRef.current === myGen) runningRef.current = false;
    }
  }, [patch, runJob]);

  const addFiles = useCallback(
    (list: File[]) => {
      if (list.length === 0) return;
      const accepted: Item[] = [];
      const rejected: string[] = [];
      let overLimit = 0;
      let slots = MAX_FILES - itemsRef.current.length;

      for (const file of list) {
        const inputType = detectImageType(file.name, file.type);
        if (!inputType) {
          rejected.push(`${file.name}: not a supported image (JPEG, PNG, WebP, GIF, BMP or AVIF).`);
          continue;
        }
        if (file.size === 0) {
          rejected.push(`${file.name}: the file is empty.`);
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          rejected.push(`${file.name}: ${formatBytes(file.size)} is above the 600 MB limit.`);
          continue;
        }
        if (slots <= 0) {
          overLimit++;
          continue;
        }
        slots--;
        accepted.push({
          id: nextIdRef.current++,
          file,
          name: file.name || "image",
          size: file.size,
          inputType,
          thumbUrl: file.size <= THUMB_LIMIT_BYTES ? URL.createObjectURL(file) : null,
          status: "queued",
        });
      }

      rejected.slice(0, 4).forEach((message) => pushNotice(message));
      if (rejected.length > 4) {
        pushNotice(`${rejected.length - 4} more files were skipped for the same reasons.`);
      }
      if (overLimit > 0) {
        pushNotice(
          `Only ${MAX_FILES} images can be queued at once. ${overLimit} file${overLimit === 1 ? " was" : "s were"} skipped.`,
        );
      }

      if (accepted.length > 0) {
        commit([...itemsRef.current, ...accepted]);
        void runQueue();
      }
    },
    [commit, pushNotice, runQueue],
  );

  const cancelAll = useCallback(() => {
    genRef.current++;
    runningRef.current = false;
    cancelCurrentRef.current?.();
    commit(
      itemsRef.current.map((item) =>
        item.status === "queued" || item.status === "working"
          ? { ...item, status: "cancelled" as const, stage: undefined }
          : item,
      ),
    );
  }, [commit]);

  const requeue = useCallback(
    (ids: number[]) => {
      if (ids.length === 0) return;
      const set = new Set(ids);
      commit(
        itemsRef.current.map((item) =>
          set.has(item.id) && item.status !== "working"
            ? {
                ...item,
                status: "queued" as const,
                stage: undefined,
                result: undefined,
                error: undefined,
              }
            : item,
        ),
      );
      void runQueue();
    },
    [commit, runQueue],
  );

  const removeItem = useCallback(
    (id: number) => {
      const target = itemsRef.current.find((item) => item.id === id);
      if (!target) return;
      if (target.status === "working") cancelCurrentRef.current?.();
      if (target.thumbUrl) URL.revokeObjectURL(target.thumbUrl);
      commit(itemsRef.current.filter((item) => item.id !== id));
    },
    [commit],
  );

  const clearAll = useCallback(() => {
    genRef.current++;
    runningRef.current = false;
    cancelCurrentRef.current?.();
    itemsRef.current.forEach((item) => {
      if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
    });
    commit([]);
    setNotices([]);
  }, [commit]);

  const downloadZip = useCallback(async () => {
    if (zipBusyRef.current) return;
    const entries = itemsRef.current.flatMap((item) =>
      item.status === "done" && item.result
        ? [{ name: item.result.name, blob: item.result.blob, lastModified: item.file.lastModified }]
        : [],
    );
    if (entries.length === 0) return;
    zipBusyRef.current = true;
    setZipProgress(0);
    let last = -1;
    try {
      const blob = await createZip(entries, (fraction) => {
        const pct = Math.floor(fraction * 100);
        if (pct !== last) {
          last = pct;
          setZipProgress(pct);
        }
      });
      downloadBlob(blob, "toolglobe-compressed-images.zip");
    } catch (error) {
      pushNotice(errorMessage(error));
    } finally {
      zipBusyRef.current = false;
      setZipProgress(null);
    }
  }, [pushNotice]);

  useEffect(() => {
    return () => {
      genRef.current++;
      runningRef.current = false;
      cancelCurrentRef.current?.();
      killWorker();
      itemsRef.current.forEach((item) => {
        if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
      });
    };
  }, [killWorker]);

  const hasFiles = (event: DragEvent) =>
    Array.from(event.dataTransfer?.types ?? []).includes("Files");

  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current++;
    setDragging(true);
  };
  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };
  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragging(false);
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  };
  const onZoneKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  };
  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const stats = useMemo(() => {
    let done = 0;
    let failed = 0;
    let cancelled = 0;
    let working = 0;
    let queued = 0;
    let stale = 0;
    let originalBytes = 0;
    let newBytes = 0;
    for (const item of items) {
      if (item.status === "done" && item.result) {
        done++;
        originalBytes += item.size;
        newBytes += item.result.blob.size;
        if (item.result.settingsKey !== currentKey) stale++;
      } else if (item.status === "error") failed++;
      else if (item.status === "cancelled") cancelled++;
      else if (item.status === "working") working++;
      else if (item.status === "queued") queued++;
    }
    const total = items.length;
    const busy = working + queued > 0;
    const progress =
      total === 0 ? 0 : Math.round(((done + failed + cancelled + working * 0.5) / total) * 100);
    return { done, failed, cancelled, working, queued, stale, originalBytes, newBytes, total, busy, progress };
  }, [items, currentKey]);

  const staleIds = useMemo(
    () =>
      items
        .filter((item) => item.status === "done" && item.result && item.result.settingsKey !== currentKey)
        .map((item) => item.id),
    [items, currentKey],
  );
  const cancelledIds = useMemo(
    () => items.filter((item) => item.status === "cancelled").map((item) => item.id),
    [items],
  );

  const savedPct = percentChange(stats.originalBytes, stats.newBytes);
  const tabClass = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
      active
        ? "bg-brand-600 text-white"
        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
    }`;

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Add images. Drop files here or press Enter to browse."
        onClick={() => inputRef.current?.click()}
        onKeyDown={onZoneKey}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`card flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed px-6 py-10 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
          dragging
            ? "border-brand-500 bg-brand-50 dark:bg-brand-950"
            : "border-slate-300 hover:border-brand-400 dark:border-slate-700"
        }`}
      >
        <svg
          className="h-10 w-10 text-brand-600 dark:text-brand-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 16V4" />
          <path d="m7 9 5-5 5 5" />
          <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
        <div>
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {dragging ? "Drop your images here" : "Drag & drop images here, or click to browse"}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            JPEG, PNG, WebP, GIF, BMP and AVIF · up to {MAX_FILES} images · 600 MB each · nothing is uploaded
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={onInputChange}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {/* Settings */}
      <section className="card space-y-5 p-5" aria-label="Compression settings">
        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="img-quality" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Quality
            </label>
            <span className="chip">{quality}%</span>
          </div>
          <input
            id="img-quality"
            type="range"
            min={MIN_QUALITY}
            max={MAX_QUALITY}
            step={1}
            value={quality}
            onChange={(event) => setQuality(Number(event.target.value))}
            className="mt-2 w-full accent-brand-600"
          />
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {format === "png"
              ? "PNG is lossless, so quality has no effect. Shrink PNG files by lowering the maximum dimension, or switch to WebP or JPEG."
              : "Lower values give smaller files. 70–85% usually looks identical to the eye."}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Output format</p>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Output format">
              {FORMAT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={format === option.value}
                  onClick={() => setFormat(option.value)}
                  className={tabClass(format === option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              &ldquo;Keep format&rdquo; never makes a file bigger. GIF and BMP become PNG, and AVIF becomes WebP.
            </p>
          </div>

          <div>
            <label htmlFor="img-dim" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Maximum width or height
            </label>
            <select
              id="img-dim"
              className="input mt-2 w-full"
              value={maxDimension}
              onChange={(event) => setMaxDimension(Number(event.target.value))}
            >
              {DIMENSION_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Only shrinks larger images. Smaller images are never enlarged.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="img-bg" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            JPEG background
          </label>
          <input
            id="img-bg"
            type="color"
            value={background}
            onChange={(event) => setBackground(event.target.value)}
            className="h-9 w-14 cursor-pointer rounded-md border border-slate-300 bg-transparent p-0.5 dark:border-slate-700"
          />
          <span className="text-xs text-slate-600 dark:text-slate-400">
            Fills transparent areas when an image is saved as JPEG.
          </span>
        </div>

        {(staleIds.length > 0 || cancelledIds.length > 0) && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            {staleIds.length > 0 && (
              <>
                <span>
                  Settings changed. {staleIds.length} compressed image{staleIds.length === 1 ? " uses" : "s use"} older settings.
                </span>
                <button type="button" className="btn-secondary" onClick={() => requeue(staleIds)}>
                  Recompress {staleIds.length}
                </button>
              </>
            )}
            {cancelledIds.length > 0 && (
              <button type="button" className="btn-secondary" onClick={() => requeue(cancelledIds)}>
                Resume {cancelledIds.length} cancelled
              </button>
            )}
          </div>
        )}
      </section>

      {/* Notices */}
      {notices.length > 0 && (
        <div role="alert" className="space-y-2">
          {notices.map((message) => (
            <div
              key={message}
              className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
            >
              <span>{message}</span>
              <button
                type="button"
                className="shrink-0 font-semibold underline"
                onClick={() => setNotices((prev) => prev.filter((m) => m !== message))}
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Progress and summary */}
      {items.length > 0 && (
        <section className="card space-y-4 p-5" aria-label="Results summary">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div aria-live="polite">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {stats.busy
                  ? `Compressing… ${stats.done + stats.failed + stats.cancelled} of ${stats.total} finished`
                  : `${stats.done} of ${stats.total} image${stats.total === 1 ? "" : "s"} compressed`}
              </p>
              {stats.done > 0 && (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {formatBytes(stats.originalBytes)} → {formatBytes(stats.newBytes)}{" "}
                  <span
                    className={
                      savedPct <= 0
                        ? "font-semibold text-emerald-600 dark:text-emerald-400"
                        : "font-semibold text-amber-600 dark:text-amber-400"
                    }
                  >
                    ({savedPct > 0 ? "+" : ""}
                    {savedPct}%)
                  </span>
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.busy && (
                <button type="button" className="btn-secondary" onClick={cancelAll}>
                  Cancel
                </button>
              )}
              {stats.done > 1 && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void downloadZip()}
                  disabled={zipProgress !== null}
                >
                  {zipProgress !== null ? `Building ZIP… ${zipProgress}%` : `Download all (${stats.done}) as ZIP`}
                </button>
              )}
              <button type="button" className="btn-ghost" onClick={clearAll}>
                Clear all
              </button>
            </div>
          </div>

          {(stats.busy || zipProgress !== null) && (
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={zipProgress !== null ? zipProgress : stats.progress}
              aria-label={zipProgress !== null ? "ZIP progress" : "Compression progress"}
              className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
            >
              <div
                className="h-full rounded-full bg-brand-600 transition-[width] duration-200"
                style={{ width: `${zipProgress !== null ? zipProgress : stats.progress}%` }}
              />
            </div>
          )}
          {stats.total * 1 > 0 && stats.total >= MAX_FILES && (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              The queue is full ({MAX_FILES} images). Clear some to add more.
            </p>
          )}
          {stats.done * 1 > 0 && stats.originalBytes + stats.newBytes > MAX_ZIP_BYTES && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              The combined size is above 4 GB, so the ZIP can&apos;t be built. Download files individually.
            </p>
          )}
        </section>
      )}

      {/* File list */}
      {items.length > 0 && (
        <ul className="space-y-3" aria-label="Images">
          {items.map((item) => {
            const result = item.result;
            const change = result ? percentChange(item.size, result.blob.size) : 0;
            const isStale = !!result && result.settingsKey !== currentKey;
            return (
              <li key={item.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                  {item.thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImagePlaceholder />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100" title={item.name}>
                    {item.name}
                  </p>

                  {item.status === "queued" && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {formatBytes(item.size)} · Waiting in queue…
                    </p>
                  )}

                  {item.status === "working" && (
                    <p className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <Spinner />
                      <span>
                        {formatBytes(item.size)} · {item.stage ? STAGE_LABELS[item.stage] : "Working…"}
                      </span>
                    </p>
                  )}

                  {item.status === "done" && result && (
                    <div className="space-y-1">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                        <span>
                          {formatBytes(item.size)} → {formatBytes(result.blob.size)}
                        </span>
                        {result.keptOriginal ? (
                          <span className="chip">Already optimal · original kept</span>
                        ) : (
                          <span
                            className={`chip ${
                              change <= 0
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-amber-700 dark:text-amber-300"
                            }`}
                          >
                            {change > 0 ? "+" : ""}
                            {change}%
                          </span>
                        )}
                        <span>
                          {result.originalWidth === result.width && result.originalHeight === result.height
                            ? `${result.width}×${result.height}`
                            : `${result.originalWidth}×${result.originalHeight} → ${result.width}×${result.height}`}
                        </span>
                        <span className="uppercase">{result.outType.replace("image/", "")}</span>
                      </p>
                      {result.usedFallback && (
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          This browser can&apos;t encode WebP, so the image was saved as JPEG.
                        </p>
                      )}
                      {item.inputType === "image/gif" && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Animated GIFs keep only their first frame.
                        </p>
                      )}
                      {isStale && (
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Settings changed since this was compressed.
                        </p>
                      )}
                    </div>
                  )}

                  {item.status === "error" && (
                    <p className="text-xs text-red-700 dark:text-red-300" role="alert">
                      {item.error ?? "This image could not be processed."}
                    </p>
                  )}

                  {item.status === "cancelled" && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">Cancelled</p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {item.status === "done" && result && (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => downloadBlob(result.blob, result.name)}
                    >
                      Download
                    </button>
                  )}
                  {item.status === "done" && isStale && (
                    <button type="button" className="btn-secondary" onClick={() => requeue([item.id])}>
                      Recompress
                    </button>
                  )}
                  {(item.status === "error" || item.status === "cancelled") && (
                    <button type="button" className="btn-secondary" onClick={() => requeue([item.id])}>
                      Retry
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        Your images never leave this device. Everything is processed in your browser.
      </p>
    </div>
  );
}
