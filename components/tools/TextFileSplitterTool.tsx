"use client";

import { useEffect, useRef, useState } from "react";
import {
  MAX_BYTES,
  buildOptions,
  formatBytes,
  formatCount,
  partName,
  splitFile,
  splitName,
} from "@/lib/text-splitter-engine";

interface OutputItem {
  name: string;
  rows: number;
  bytes: number;
  url: string;
}

const MODES = [
  { id: "lines", label: "By lines" },
  { id: "size", label: "By size" },
  { id: "parts", label: "Into equal parts" },
] as const;

export function TextFileSplitterTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<string>("lines");
  const [linesText, setLinesText] = useState<string>("1000");
  const [sizeText, setSizeText] = useState<string>("10");
  const [unit, setUnit] = useState<string>("MB");
  const [partsText, setPartsText] = useState<string>("4");
  const [keepHeader, setKeepHeader] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [notice, setNotice] = useState<string>("");
  const [items, setItems] = useState<OutputItem[]>([]);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const cancelRef = useRef<boolean>(false);
  const runRef = useRef<number>(0);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      cancelRef.current = true;
      runRef.current += 1;
      for (const u of urlsRef.current) URL.revokeObjectURL(u);
    };
  }, []);

  const file = files.length > 0 ? files[0] : undefined;

  function clearOutputs() {
    for (const u of urlsRef.current) URL.revokeObjectURL(u);
    urlsRef.current = [];
    setItems([]);
  }

  function accept(f: File) {
    clearOutputs();
    setNotice("");
    setProgress(0);
    if (f.size > MAX_BYTES) {
      setFiles([]);
      setError("This file is " + formatBytes(f.size) + ". The limit is " + formatBytes(MAX_BYTES) + ".");
      return;
    }
    setError("");
    setFiles([f]);
  }

  function resetAll() {
    cancelRef.current = true;
    runRef.current += 1;
    clearOutputs();
    setFiles([]);
    setBusy(false);
    setProgress(0);
    setError("");
    setNotice("");
  }

  async function run() {
    if (file === undefined) return;
    const built = buildOptions(mode, linesText, sizeText, unit, partsText, keepHeader, file.size);
    if (built.error !== "") {
      setError(built.error);
      return;
    }
    clearOutputs();
    setError("");
    setNotice("");
    setProgress(0);
    setBusy(true);
    cancelRef.current = false;
    runRef.current += 1;
    const id = runRef.current;

    const outcome = await splitFile(
      file,
      built.options,
      (done, total) => {
        if (runRef.current === id) setProgress(total > 0 ? done / total : 0);
      },
      () => (cancelRef.current ? true : runRef.current !== id),
    );

    if (runRef.current !== id) return;
    setBusy(false);

    if (outcome.cancelled) {
      setNotice("Cancelled. Nothing was kept.");
      return;
    }
    if (outcome.error !== "") {
      setError(outcome.error);
      return;
    }
    if (outcome.parts.length === 0) {
      setError("The file is empty, so there is nothing to split.");
      return;
    }

    const names = splitName(file.name);
    const urls: string[] = [];
    const list: OutputItem[] = outcome.parts.map((p) => {
      const url = URL.createObjectURL(p.blob);
      urls.push(url);
      return { name: partName(names.base, names.ext, p.index), rows: p.rows, bytes: p.bytes, url };
    });
    urlsRef.current = urls;
    setItems(list);
    setProgress(1);
  }

  function cancel() {
    cancelRef.current = true;
    setNotice("Cancelling...");
  }

  async function downloadAll() {
    for (const item of items) {
      const a = document.createElement("a");
      a.href = item.url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 350);
      });
    }
  }

  let totalRows = 0;
  let totalBytes = 0;
  for (const item of items) {
    totalRows += item.rows;
    totalBytes += item.bytes;
  }

  const pct = Math.round(progress * 100);

  return (
    <div className="space-y-6">
      <div className="card p-5 sm:p-6">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (busy) return;
            const f = e.dataTransfer.files.item(0);
            if (f) accept(f);
          }}
          className={
            "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center focus-within:ring-2 focus-within:ring-slate-900 dark:focus-within:ring-white " +
            (dragOver ? "border-slate-900 dark:border-white" : "border-slate-300 dark:border-slate-600")
          }
        >
          <input
            type="file"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const list = e.target.files;
              if (list) {
                const f = list.item(0);
                if (f) accept(f);
              }
              e.target.value = "";
            }}
          />
          <span className="text-base font-semibold text-slate-900 dark:text-white">
            {file !== undefined ? file.name : "Drop a text file here, or tap to choose one"}
          </span>
          <span className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {file !== undefined
              ? formatBytes(file.size) + ". Tap to choose a different file."
              : "TXT, CSV, LOG, JSON, SQL and other UTF-8 text files, up to " + formatBytes(MAX_BYTES)}
          </span>
        </label>

        {file !== undefined && file.size > 200 * 1024 * 1024 ? (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            Large file. Keep this tab open, and make sure the device has free space for the parts, about as much as the original file.
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Split method">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={m.id === mode}
              disabled={busy}
              onClick={() => setMode(m.id)}
              className={"chip" + (m.id === mode ? " ring-2 ring-slate-900 dark:ring-white" : "")}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {mode === "lines" ? (
            <div>
              <label htmlFor="ts-lines" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Lines per file
              </label>
              <input
                id="ts-lines"
                className="input mt-2 w-full sm:w-64"
                inputMode="numeric"
                disabled={busy}
                value={linesText}
                onChange={(e) => setLinesText(e.target.value)}
              />
            </div>
          ) : null}
          {mode === "size" ? (
            <div>
              <label htmlFor="ts-size" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Maximum size per file
              </label>
              <div className="mt-2 flex gap-2 sm:w-64">
                <input
                  id="ts-size"
                  className="input w-full"
                  inputMode="decimal"
                  disabled={busy}
                  value={sizeText}
                  onChange={(e) => setSizeText(e.target.value)}
                />
                <select
                  aria-label="Size unit"
                  className="input"
                  disabled={busy}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  <option value="KB">KB</option>
                  <option value="MB">MB</option>
                </select>
              </div>
            </div>
          ) : null}
          {mode === "parts" ? (
            <div>
              <label htmlFor="ts-parts" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Number of parts (about)
              </label>
              <input
                id="ts-parts"
                className="input mt-2 w-full sm:w-64"
                inputMode="numeric"
                disabled={busy}
                value={partsText}
                onChange={(e) => setPartsText(e.target.value)}
              />
            </div>
          ) : null}
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {mode === "lines"
              ? "Every file gets this many lines, except the last one."
              : mode === "size"
                ? "Files are cut at the last full line that fits, so no line is ever broken in the middle."
                : "Parts are about equal in size. Because lines are never cut, you may get one part more or less."}
          </p>
        </div>

        <label className="mt-4 flex items-center gap-3 text-sm text-slate-800 dark:text-slate-200">
          <input type="checkbox" disabled={busy} checked={keepHeader} onChange={(e) => setKeepHeader(e.target.checked)} />
          The first line is a header (CSV). Repeat it at the top of every file.
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primary" disabled={busy ? true : file === undefined} onClick={() => void run()}>
            {busy ? "Splitting..." : "Split file"}
          </button>
          {busy ? (
            <button type="button" className="btn-secondary" onClick={cancel}>
              Cancel
            </button>
          ) : null}
          <button type="button" className="btn-ghost" disabled={busy} onClick={resetAll}>
            Clear
          </button>
          {notice ? <span className="text-sm text-slate-600 dark:text-slate-400">{notice}</span> : null}
        </div>

        {busy ? (
          <div className="mt-4" role="status">
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: pct + "%" }} />
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{pct}%</p>
          </div>
        ) : null}

        {error !== "" ? (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {items.length > 0 ? (
        <div className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {formatCount(items.length)} {items.length === 1 ? "file" : "files"} ready
            </h2>
            <button type="button" className="btn-primary" onClick={() => void downloadAll()}>
              Download all
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {formatCount(totalRows)} data lines, {formatBytes(totalBytes)} in total.
          </p>
          {items.length > 1 ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Your browser may ask permission to download several files at once. If it blocks them, use the buttons below one by one.
            </p>
          ) : null}
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => (
              <li key={item.name} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="break-all text-sm font-medium text-slate-900 dark:text-white">{item.name}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {formatCount(item.rows)} lines, {formatBytes(item.bytes)}
                  </div>
                </div>
                <a className="btn-secondary px-3 py-1 text-sm" href={item.url} download={item.name}>
                  Download
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Files are created in your browser and are removed when you leave this page or press Clear.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default TextFileSplitterTool;
