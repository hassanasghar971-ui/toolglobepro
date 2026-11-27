"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import {
  ACCEPT_ATTRIBUTE,
  MAX_FILES,
  MAX_FILE_BYTES,
  cleanFileName,
  describeError,
  formatBytes,
  isSupportedFile,
  processRequest,
} from "@/lib/image-metadata-remover-engine";
import type { MetaReply, MetaReport, MetaRequest } from "@/lib/image-metadata-remover-engine";

interface Item {
  id: number;
  file: File;
  status: string;
  message: string;
  url: string;
  name: string;
  size: number;
  leftover: number;
  report?: MetaReport;
  blob?: Blob;
}

interface RunState {
  cancelled: boolean;
  worker?: Worker;
}

interface Pending {
  resolve: (reply: MetaReply) => void;
  reject: (error: Error) => void;
}

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

function FoundList({ report, done }: { report: MetaReport; done: boolean }) {
  const hasAny = report.fields.length > 0 ? true : report.removed.length > 0;
  if (!hasAny) {
    return (
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {done ? "This file had no metadata to remove." : "No metadata found in this file."}
      </p>
    );
  }
  const shown = report.fields.slice(0, 8);
  const hidden = report.fields.length - shown.length;
  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs font-semibold text-slate-900 dark:text-white">{done ? "Removed:" : "Found:"}</p>
      {shown.length > 0 && (
        <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
          {shown.map((f) => (
            <div key={f.label} className="flex gap-2">
              <dt className="shrink-0 text-slate-500 dark:text-slate-400">{f.label}:</dt>
              <dd className={f.sensitive ? "break-all font-semibold text-red-600 dark:text-red-400" : "break-all text-slate-800 dark:text-slate-200"}>
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {hidden > 0 && <p className="text-xs text-slate-500 dark:text-slate-400">{`And ${hidden} more detail${hidden === 1 ? "" : "s"}.`}</p>}
      {report.removed.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {report.removed.map((r) => (
            <li key={`${r.kind}-${r.label}`} className="chip">
              {r.count > 1 ? `${r.label} x${r.count}` : r.label} ({formatBytes(r.bytes)})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function describeStatus(item: Item): string {
  if (item.status === "scanning") return "Scanning for metadata...";
  if (item.status === "working") return "Removing metadata...";
  if (item.status === "scanned") return `${formatBytes(item.file.size)}. Scanned.`;
  if (item.status === "done") return `${formatBytes(item.file.size)} to ${formatBytes(item.size)}`;
  return `${formatBytes(item.file.size)}. Waiting.`;
}

function settle(item: Item): Item {
  const interrupted = item.status === "scanning" ? true : item.status === "working";
  if (!interrupted) return item;
  return { ...item, status: item.report ? "scanned" : "queued", message: "" };
}

export default function ImageMetadataRemoverTool() {
  const [items, setItems] = useState<Item[]>([]);
  const [keepOrientation, setKeepOrientation] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [finished, setFinished] = useState(0);
  const [total, setTotal] = useState(0);
  const [notices, setNotices] = useState<string[]>([]);

  const itemsRef = useRef<Item[]>([]);
  const nextId = useRef(1);
  const runRef = useRef<RunState>({ cancelled: false });
  const pendingRef = useRef(new Map<number, Pending>());

  useEffect(() => {
    const run = runRef.current;
    const pending = pendingRef.current;
    return () => {
      run.cancelled = true;
      if (run.worker) {
        run.worker.terminate();
        run.worker = undefined;
      }
      const waiting = Array.from(pending.values());
      pending.clear();
      for (const p of waiting) p.reject(new Error("Cancelled"));
      for (const item of itemsRef.current) {
        if (item.url !== "") URL.revokeObjectURL(item.url);
      }
    };
  }, []);

  function commit(next: Item[]) {
    itemsRef.current = next;
    setItems(next);
  }

  function patch(id: number, changes: Partial<Item>) {
    commit(itemsRef.current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }

  function stopWorker() {
    const run = runRef.current;
    if (run.worker) {
      run.worker.terminate();
      run.worker = undefined;
    }
    const waiting = Array.from(pendingRef.current.values());
    pendingRef.current.clear();
    for (const p of waiting) p.reject(new Error("Cancelled"));
  }

  function getWorker(): Worker {
    const run = runRef.current;
    if (run.worker) return run.worker;
    const worker = new Worker(new URL("./image-metadata-remover.worker.ts", import.meta.url));
    worker.onmessage = (event: MessageEvent<MetaReply>) => {
      const pending = pendingRef.current.get(event.data.id);
      if (pending) {
        pendingRef.current.delete(event.data.id);
        pending.resolve(event.data);
      }
    };
    worker.onerror = () => {
      const waiting = Array.from(pendingRef.current.values());
      pendingRef.current.clear();
      worker.terminate();
      if (run.worker === worker) run.worker = undefined;
      for (const p of waiting) {
        p.reject(new Error("The background worker stopped unexpectedly. Try again with a smaller file."));
      }
    };
    run.worker = worker;
    return worker;
  }

  function send(request: MetaRequest): Promise<MetaReply> {
    if (typeof Worker === "undefined") return processRequest(request);
    return new Promise<MetaReply>((resolve, reject) => {
      pendingRef.current.set(request.id, { resolve, reject });
      getWorker().postMessage(request);
    });
  }

  function finishRun() {
    stopWorker();
    commit(itemsRef.current.map(settle));
    setBusy(false);
    setPhase("");
  }

  async function scan(list: Item[]) {
    const run = runRef.current;
    run.cancelled = false;
    setBusy(true);
    setPhase("scan");
    setTotal(list.length);
    setFinished(0);
    let count = 0;
    for (const item of list) {
      if (run.cancelled) break;
      patch(item.id, { status: "scanning", message: "" });
      try {
        const reply = await send({ type: "inspect", id: item.id, file: item.file, keepOrientation });
        if (run.cancelled) break;
        if (reply.ok) patch(item.id, { status: "scanned", report: reply.report });
        else patch(item.id, { status: "error", message: reply.message });
      } catch (error) {
        if (run.cancelled) break;
        patch(item.id, { status: "error", message: describeError(error) });
      }
      count += 1;
      setFinished(count);
    }
    finishRun();
  }

  function addFiles(incoming: File[]) {
    if (busy) return;
    const messages: string[] = [];
    const current = itemsRef.current;
    const accepted: Item[] = [];
    for (const file of incoming) {
      if (!isSupportedFile(file)) {
        messages.push(`${file.name} is not a JPG, PNG or WebP image and was skipped.`);
        continue;
      }
      if (file.size === 0) {
        messages.push(`${file.name} is empty and was skipped.`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        messages.push(`${file.name} is ${formatBytes(file.size)}, over the ${formatBytes(MAX_FILE_BYTES)} limit.`);
        continue;
      }
      if (current.length + accepted.length >= MAX_FILES) {
        messages.push(`${file.name} was skipped because a batch holds at most ${MAX_FILES} files.`);
        continue;
      }
      const duplicate = current
        .concat(accepted)
        .some((i) => i.file.name === file.name && i.file.size === file.size && i.file.lastModified === file.lastModified);
      if (duplicate) continue;
      accepted.push({
        id: nextId.current++,
        file,
        status: "queued",
        message: "",
        url: "",
        name: "",
        size: 0,
        leftover: 0,
      });
    }
    setNotices(messages);
    if (accepted.length === 0) return;
    commit(current.concat(accepted));
    void scan(accepted);
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

  function cancel() {
    runRef.current.cancelled = true;
    stopWorker();
  }

  async function cleanAll() {
    if (busy) return;
    const queue = itemsRef.current.slice();
    if (queue.length === 0) return;
    const run = runRef.current;
    run.cancelled = false;
    const used = new Set<string>();
    setBusy(true);
    setPhase("clean");
    setTotal(queue.length);
    setFinished(0);
    let count = 0;
    for (const item of queue) {
      if (run.cancelled) break;
      patch(item.id, { status: "working", message: "" });
      try {
        const reply = await send({ type: "clean", id: item.id, file: item.file, keepOrientation });
        if (run.cancelled) break;
        if (reply.ok && reply.blob) {
          const name = cleanFileName(item.file.name, reply.report.format, used);
          const url = URL.createObjectURL(reply.blob);
          if (item.url !== "") URL.revokeObjectURL(item.url);
          patch(item.id, {
            status: "done",
            message: "",
            url,
            name,
            size: reply.outputSize,
            leftover: reply.leftover,
            report: reply.report,
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
    finishRun();
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
  let gpsCount = 0;
  let leftoverTotal = 0;
  let beforeBytes = 0;
  let afterBytes = 0;
  for (const item of items) {
    if (item.report && item.report.hasGps && item.status !== "done") gpsCount += 1;
    if (item.status === "done") {
      doneCount += 1;
      leftoverTotal += item.leftover;
      beforeBytes += item.file.size;
      afterBytes += item.size;
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
        <span className={labelStyle}>Tap to choose photos, or drop them here</span>
        <span className={mutedStyle}>
          JPG, PNG and WebP. Up to {formatBytes(MAX_FILE_BYTES)} each. Your photos are scanned on this device.
        </span>
        <input type="file" accept={ACCEPT_ATTRIBUTE} multiple className="sr-only" onChange={onPick} disabled={busy} />
      </label>

      {notices.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          {notices.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={keepOrientation}
          onChange={(event) => setKeepOrientation(event.target.checked)}
          disabled={busy}
          className="mt-1 size-4 accent-brand-600"
        />
        <span>
          <span className={labelStyle}>Keep the rotation tag (recommended)</span>
          <span className={`block ${mutedStyle}`}>
            Phones often store photos sideways and rely on this tag to show them upright. Keeping it stops cleaned JPGs from turning. It holds a single number and nothing else.
          </span>
        </span>
      </label>

      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-primary" onClick={cleanAll} disabled={busy || items.length === 0}>
          {`Remove metadata from ${items.length} photo${items.length === 1 ? "" : "s"}`}
        </button>
        {busy && (
          <button type="button" className="btn-secondary" onClick={cancel}>
            Cancel
          </button>
        )}
        {items.length > 0 && !busy && (
          <button type="button" className="btn-ghost" onClick={clearAll}>
            Clear all
          </button>
        )}
      </div>

      {busy && (
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${percent}%` }} />
        </div>
      )}

      <p role="status" aria-live="polite" className={mutedStyle}>
        {busy
          ? `${phase === "scan" ? "Scanning" : "Cleaning"} ${Math.min(finished + 1, total)} of ${total}. Nothing leaves this device.`
          : doneCount > 0
            ? `${doneCount} cleaned. ${formatBytes(beforeBytes)} became ${formatBytes(afterBytes)}.${
                leftoverTotal > 0 ? ` ${leftoverTotal} item(s) still detected, see the warnings below.` : " A second scan found no metadata left."
              }`
            : gpsCount > 0
              ? `${gpsCount} photo${gpsCount === 1 ? " contains" : "s contain"} GPS location data. Press the button to remove it.`
              : items.length > 0
                ? "Scan finished. Press the button to remove the metadata."
                : "No photos added yet."}
      </p>

      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {item.report && item.report.format !== "" ? item.report.format : "IMG"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {item.status === "done" ? item.name : item.file.name}
                  </p>
                  {item.status === "error" ? (
                    <p className="text-xs text-red-600 dark:text-red-400">{item.message}</p>
                  ) : (
                    <p className={mutedStyle}>{describeStatus(item)}</p>
                  )}
                  {item.report && item.status !== "error" && <FoundList report={item.report} done={item.status === "done"} />}
                  {item.status === "done" && (
                    <p
                      className={
                        item.leftover === 0
                          ? "mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400"
                          : "mt-2 text-xs font-medium text-amber-700 dark:text-amber-300"
                      }
                    >
                      {item.leftover === 0
                        ? "Checked again after cleaning: no metadata found."
                        : `Warning: ${item.leftover} metadata item(s) still detected in the cleaned file.`}
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
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className={mutedStyle}>
        The picture data is copied byte for byte, so quality does not change. Metadata cannot be restored afterwards, so keep your originals. Faces, signs and landmarks visible in the picture itself are not removed.
      </p>
    </div>
  );
}
