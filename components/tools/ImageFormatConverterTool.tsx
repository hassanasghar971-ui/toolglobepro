"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import {
  DECODE_MESSAGE,
  DEFAULT_FORMAT,
  MAX_BATCH_BYTES,
  MAX_FILE_BYTES,
  OUTPUT_FORMATS,
  SIZE_MESSAGE,
  buildZip,
  clampQuality,
  computeLayout,
  crcOfBlob,
  describeError,
  encodeFailureMessage,
  exceedsPixelLimit,
  formatBytes,
  getFormat,
  isLikelyImage,
  needsMainThread,
  normalizeHex,
  outputFileName,
  paintToContext,
  parseMaxEdge,
  savedPercent,
} from "@/lib/image-format-converter-engine";
import type {
  ConvertOptions,
  ConvertReply,
  ConvertRequest,
  ZipEntry,
} from "@/lib/image-format-converter-engine";

interface Item {
  id: number;
  file: File;
  status: string;
  message: string;
  url: string;
  name: string;
  size: number;
  width: number;
  height: number;
  crc: number;
  blob?: Blob;
}

interface RunState {
  cancelled: boolean;
  worker?: Worker;
  abort?: () => void;
}

const EDGE_PRESETS = [
  { label: "Original", value: "" },
  { label: "3840", value: "3840" },
  { label: "1920", value: "1920" },
  { label: "1280", value: "1280" },
  { label: "800", value: "800" },
];

function UploadGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </svg>
  );
}

function DownloadGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v12" />
      <path d="M7 11l5 5 5-5" />
      <path d="M4 20h16" />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

/*
  Main-thread path. Used for SVG files (workers cannot decode them
  reliably) and for browsers without OffscreenCanvas.
*/
async function convertOnMainThread(file: File, options: ConvertOptions): Promise<ConvertReply> {
  const format = getFormat(options.format);
  const vector = needsMainThread(file);
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(DECODE_MESSAGE));
      image.src = url;
    });
    const sourceWidth = image.naturalWidth > 0 ? image.naturalWidth : 1024;
    const sourceHeight = image.naturalHeight > 0 ? image.naturalHeight : 1024;
    const layout = computeLayout(sourceWidth, sourceHeight, options.maxEdge, vector);
    if (exceedsPixelLimit(layout.width, layout.height)) throw new Error(SIZE_MESSAGE);
    const canvas = document.createElement("canvas");
    canvas.width = layout.width;
    canvas.height = layout.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error(SIZE_MESSAGE);
    paintToContext(context, image, layout, format.alpha ? "" : options.background);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error(SIZE_MESSAGE));
        },
        format.mime,
        options.quality,
      );
    });
    if (blob.type !== format.mime) throw new Error(encodeFailureMessage(format.label));
    const crc = await crcOfBlob(blob);
    return {
      ok: true,
      id: 0,
      message: "",
      width: layout.width,
      height: layout.height,
      sourceWidth,
      sourceHeight,
      crc,
      blob,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ImageFormatConverterTool() {
  const [items, setItems] = useState<Item[]>([]);
  const [formatId, setFormatId] = useState(DEFAULT_FORMAT.id);
  const [qualityPct, setQualityPct] = useState(85);
  const [maxEdgeText, setMaxEdgeText] = useState("");
  const [background, setBackground] = useState("#ffffff");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(0);
  const [total, setTotal] = useState(0);
  const [notices, setNotices] = useState<string[]>([]);

  const itemsRef = useRef<Item[]>([]);
  const nextId = useRef(1);
  const runRef = useRef<RunState>({ cancelled: false });

  useEffect(() => {
    const run = runRef.current;
    return () => {
      run.cancelled = true;
      if (run.worker) {
        run.worker.terminate();
        run.worker = undefined;
      }
      for (const item of itemsRef.current) {
        if (item.url !== "") URL.revokeObjectURL(item.url);
      }
    };
  }, []);

  const format = getFormat(formatId);

  function commit(next: Item[]) {
    itemsRef.current = next;
    setItems(next);
  }

  function patch(id: number, changes: Partial<Item>) {
    commit(itemsRef.current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }

  function addFiles(incoming: File[]) {
    if (busy) return;
    const messages: string[] = [];
    const current = itemsRef.current;
    let totalBytes = current.reduce((sum, item) => sum + item.file.size, 0);
    const accepted: Item[] = [];
    for (const file of incoming) {
      if (!isLikelyImage(file)) {
        messages.push(`${file.name} is not an image and was skipped.`);
        continue;
      }
      if (file.size === 0) {
        messages.push(`${file.name} is empty and was skipped.`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        messages.push(`${file.name} is ${formatBytes(file.size)}, over the ${formatBytes(MAX_FILE_BYTES)} per-file limit.`);
        continue;
      }
      if (totalBytes + file.size > MAX_BATCH_BYTES) {
        messages.push(`${file.name} was skipped because the batch would pass ${formatBytes(MAX_BATCH_BYTES)}.`);
        continue;
      }
      const duplicate = current
        .concat(accepted)
        .some((i) => i.file.name === file.name && i.file.size === file.size && i.file.lastModified === file.lastModified);
      if (duplicate) continue;
      totalBytes += file.size;
      accepted.push({
        id: nextId.current++,
        file,
        status: "queued",
        message: "",
        url: "",
        name: "",
        size: 0,
        width: 0,
        height: 0,
        crc: 0,
      });
    }
    setNotices(messages);
    if (accepted.length > 0) commit(current.concat(accepted));
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const list = event.target.files;
    if (list) addFiles(Array.from(list));
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  function runInWorker(file: File, options: ConvertOptions, id: number): Promise<ConvertReply> {
    const run = runRef.current;
    return new Promise<ConvertReply>((resolve, reject) => {
      const existing = run.worker;
      const worker = existing ? existing : new Worker(new URL("./image-format-converter.worker.ts", import.meta.url));
      run.worker = worker;

      function cleanup() {
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onError);
        run.abort = undefined;
      }
      function onMessage(event: MessageEvent<ConvertReply>) {
        if (event.data.id !== id) return;
        cleanup();
        resolve(event.data);
      }
      function onError() {
        cleanup();
        worker.terminate();
        if (run.worker === worker) run.worker = undefined;
        reject(new Error("The background converter stopped unexpectedly. Try again, or use a smaller image."));
      }

      run.abort = () => {
        cleanup();
        reject(new Error("Cancelled"));
      };
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);
      const request: ConvertRequest = { type: "convert", id, file, options };
      worker.postMessage(request);
    });
  }

  function cancel() {
    const run = runRef.current;
    run.cancelled = true;
    if (run.worker) {
      run.worker.terminate();
      run.worker = undefined;
    }
    if (run.abort) run.abort();
  }

  async function convertAll() {
    if (busy) return;
    const queue = itemsRef.current.slice();
    if (queue.length === 0) return;
    const run = runRef.current;
    run.cancelled = false;

    const options: ConvertOptions = {
      format: format.id,
      quality: clampQuality(qualityPct / 100),
      maxEdge: parseMaxEdge(maxEdgeText),
      background: normalizeHex(background),
    };
    const workerReady =
      typeof Worker !== "undefined" &&
      typeof OffscreenCanvas !== "undefined" &&
      typeof createImageBitmap === "function";
    const used = new Set<string>();

    setBusy(true);
    setTotal(queue.length);
    setFinished(0);
    let count = 0;

    for (const item of queue) {
      if (run.cancelled) break;
      patch(item.id, { status: "working", message: "" });
      try {
        const reply =
          workerReady && !needsMainThread(item.file)
            ? await runInWorker(item.file, options, item.id)
            : await convertOnMainThread(item.file, options);
        if (run.cancelled) break;
        if (reply.ok && reply.blob) {
          const name = outputFileName(item.file.name, format.ext, used);
          const url = URL.createObjectURL(reply.blob);
          if (item.url !== "") URL.revokeObjectURL(item.url);
          patch(item.id, {
            status: "done",
            message: "",
            url,
            name,
            size: reply.blob.size,
            width: reply.width,
            height: reply.height,
            crc: reply.crc,
            blob: reply.blob,
          });
        } else {
          patch(item.id, { status: "error", message: reply.message });
        }
      } catch (error) {
        if (run.cancelled) break;
        patch(item.id, { status: "error", message: describeError(error) });
      }
      count += 1;
      setFinished(count);
    }

    commit(
      itemsRef.current.map((item) =>
        item.status === "working" ? { ...item, status: "queued", message: "" } : item,
      ),
    );
    setBusy(false);
  }

  function downloadZip() {
    const entries: ZipEntry[] = [];
    for (const item of itemsRef.current) {
      if (item.status === "done" && item.blob) {
        entries.push({ name: item.name, blob: item.blob, crc: item.crc });
      }
    }
    if (entries.length === 0) return;
    const zip = buildZip(entries);
    const url = URL.createObjectURL(zip);
    const link = document.createElement("a");
    link.href = url;
    link.download = "converted-images.zip";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function removeItem(id: number) {
    if (busy) return;
    const target = itemsRef.current.find((item) => item.id === id);
    if (target && target.url !== "") URL.revokeObjectURL(target.url);
    commit(itemsRef.current.filter((item) => item.id !== id));
  }

  function clearAll() {
    if (busy) return;
    for (const item of itemsRef.current) {
      if (item.url !== "") URL.revokeObjectURL(item.url);
    }
    commit([]);
    setNotices([]);
    setFinished(0);
    setTotal(0);
  }

  let doneCount = 0;
  let inBytes = 0;
  let outBytes = 0;
  for (const item of items) {
    if (item.status === "done") {
      doneCount += 1;
      inBytes += item.file.size;
      outBytes += item.size;
    }
  }
  const percent = total > 0 ? Math.round((finished / total) * 100) : 0;
  const labelStyle = "text-sm font-semibold text-slate-900 dark:text-white";
  const mutedStyle = "text-xs text-slate-500 dark:text-slate-400";

  return (
    <div className="space-y-6">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-10 text-center transition focus-within:ring-2 focus-within:ring-brand-500 ${
          dragging
            ? "border-brand-500 bg-brand-50 dark:bg-brand-950"
            : "border-slate-300 hover:border-brand-400 dark:border-slate-700"
        } ${busy ? "pointer-events-none opacity-60" : ""}`}
      >
        <span className="text-brand-600 dark:text-brand-300">
          <UploadGlyph />
        </span>
        <span className={labelStyle}>Tap to choose images, or drop them here</span>
        <span className={mutedStyle}>
          PNG, JPG, WebP, GIF, BMP, SVG and more. Up to {formatBytes(MAX_FILE_BYTES)} each, {formatBytes(MAX_BATCH_BYTES)} per batch.
        </span>
        <input type="file" accept="image/*" multiple className="sr-only" onChange={onPick} disabled={busy} />
      </label>

      {notices.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          {notices.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <p className={labelStyle}>Convert to</p>
          <div role="group" aria-label="Output format" className="mt-2 grid grid-cols-3 gap-2">
            {OUTPUT_FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormatId(f.id)}
                aria-pressed={f.id === format.id}
                disabled={busy}
                className={f.id === format.id ? "btn-primary" : "btn-secondary"}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className={`mt-2 ${mutedStyle}`}>{format.hint}</p>
        </div>

        <div>
          {format.lossy ? (
            <>
              <label htmlFor="ifc-quality" className={labelStyle}>
                Quality: {qualityPct}%
              </label>
              <input
                id="ifc-quality"
                type="range"
                min={10}
                max={100}
                step={5}
                value={qualityPct}
                onChange={(event) => setQualityPct(Number(event.target.value))}
                disabled={busy}
                className="mt-3 w-full accent-brand-600"
              />
              <p className={mutedStyle}>Lower is smaller. 75 to 90 suits most photos.</p>
            </>
          ) : (
            <>
              <p className={labelStyle}>Quality</p>
              <p className={`mt-2 ${mutedStyle}`}>PNG is lossless, so there is no quality setting.</p>
            </>
          )}
        </div>

        <div>
          <label htmlFor="ifc-edge" className={labelStyle}>
            Maximum width or height (pixels)
          </label>
          <input
            id="ifc-edge"
            type="text"
            inputMode="numeric"
            value={maxEdgeText}
            onChange={(event) => setMaxEdgeText(event.target.value)}
            placeholder="Original size"
            disabled={busy}
            className="input mt-2"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {EDGE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="chip"
                disabled={busy}
                onClick={() => setMaxEdgeText(preset.value)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {!format.alpha && (
          <div>
            <label htmlFor="ifc-bg" className={labelStyle}>
              Background for transparent areas
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                id="ifc-bg"
                type="color"
                value={normalizeHex(background)}
                onChange={(event) => setBackground(event.target.value)}
                disabled={busy}
                className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300 bg-transparent p-1 dark:border-slate-700"
              />
              <span className={mutedStyle}>{normalizeHex(background)}. JPG cannot be transparent.</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-primary" onClick={convertAll} disabled={busy || items.length === 0}>
          {`Convert ${items.length} image${items.length === 1 ? "" : "s"} to ${format.label}`}
        </button>
        {busy && (
          <button type="button" className="btn-secondary" onClick={cancel}>
            Cancel
          </button>
        )}
        {doneCount > 0 && !busy && (
          <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={downloadZip}>
            <DownloadGlyph /> Download all as ZIP
          </button>
        )}
        {items.length > 0 && !busy && (
          <button type="button" className="btn-ghost" onClick={clearAll}>
            Clear all
          </button>
        )}
      </div>

      {busy && (
        <div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      <p role="status" aria-live="polite" className={mutedStyle}>
        {busy
          ? `Converting ${Math.min(finished + 1, total)} of ${total}. Your files stay on this device.`
          : doneCount > 0
            ? `${doneCount} converted. ${formatBytes(inBytes)} became ${formatBytes(outBytes)}.`
            : items.length > 0
              ? "Ready. Choose your options and press Convert."
              : "No images added yet."}
      </p>

      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => {
            const delta = item.status === "done" ? savedPercent(item.file.size, item.size) : 0;
            return (
              <li key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                  {item.status === "done" ? (
                    <img src={item.url} alt={`Converted ${item.name}`} className="size-full object-contain" />
                  ) : (
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {item.status === "working" ? "..." : "IMG"}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {item.status === "done" ? item.name : item.file.name}
                  </p>
                  {item.status === "error" ? (
                    <p className="text-xs text-red-600 dark:text-red-400">{item.message}</p>
                  ) : item.status === "done" ? (
                    <p className={mutedStyle}>
                      {`${item.width} x ${item.height} px. ${formatBytes(item.file.size)} to ${formatBytes(item.size)} (${
                        delta >= 0 ? `${delta}% smaller` : `${Math.abs(delta)}% larger`
                      })`}
                    </p>
                  ) : (
                    <p className={mutedStyle}>
                      {item.status === "working" ? "Converting..." : `${formatBytes(item.file.size)}. Waiting.`}
                    </p>
                  )}
                </div>
                {item.status === "done" && (
                  <a href={item.url} download={item.name} className="btn-secondary inline-flex shrink-0 items-center gap-1.5 text-xs">
                    <DownloadGlyph /> Download
                  </a>
                )}
                <button
                  type="button"
                  className="btn-ghost shrink-0 px-2"
                  onClick={() => removeItem(item.id)}
                  disabled={busy}
                  aria-label={`Remove ${item.file.name}`}
                >
                  <CloseGlyph />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className={mutedStyle}>
        Converting redraws each image, so camera and location metadata is not copied into the new file. Animated GIFs become a single still frame.
      </p>
    </div>
  );
}
