"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_OPTIONS, MAX_CSV_BYTES } from "@/lib/tools/csv-core";
import type { CsvOptions, CsvResult, CsvWorkerResponse } from "@/lib/tools/csv-core";

const SAMPLE = [
  "id,name,email,city,age,active,zip",
  '1,"Ada Lovelace",ada@example.com,London,36,true,01234',
  '2,"Grace ""Amazing"" Hopper",grace@example.com,"New York, NY",85,true,10001',
  "3,Alan Turing,alan@example.com,Manchester,41,false,",
  '4,"Line\nBreak",lb@example.com,Paris,29,true,75001',
].join("\n");

const COPY_LIMIT_BYTES = 25 * 1024 * 1024;

function Ico({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const ICON_COPY = "M9 9h11v11H9z M5 15V4h11";
const ICON_DOWNLOAD = "M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3";
const ICON_UPLOAD = "M12 15V3m0 0l-4 4m4-4l4 4M4 17v3h16v-3";
const ICON_X = "M6 6l12 12M18 6L6 18";
const ICON_ZAP = "M13 2L4 14h7l-1 8 9-12h-7z";

function formatBytes(n: number): string {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + " MB";
  return (n / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

function delimiterLabel(d: string): string {
  if (d === "\t") return "Tab";
  if (d === ",") return "Comma";
  if (d === ";") return "Semicolon";
  if (d === "|") return "Pipe";
  return d;
}

interface Progress {
  processed: number;
  total: number;
  rows: number;
}

export default function CsvToJsonTool() {
  const [mode, setMode] = useState<"paste" | "file">("paste");
  const [text, setText] = useState<string>(SAMPLE);
  const [file, setFile] = useState<File | null>(null);
  const [opts, setOpts] = useState<CsvOptions>(DEFAULT_OPTIONS);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress>({ processed: 0, total: 0, rows: 0 });
  const [result, setResult] = useState<CsvResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const runId = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (workerRef.current) workerRef.current.terminate();
    };
  }, []);

  const setOpt = useCallback(<K extends keyof CsvOptions>(key: K, value: CsvOptions[K]) => {
    setOpts((prev) => ({ ...prev, [key]: value }));
  }, []);

  const flash = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 1800);
  }, []);

  const pickFile = useCallback((f: File | undefined | null) => {
    if (!f) return;
    if (f.size > MAX_CSV_BYTES) {
      setError("That file is " + formatBytes(f.size) + ". The limit is 600 MB.");
      return;
    }
    setError(null);
    setFile(f);
    setMode("file");
    setResult(null);
  }, []);

  const cancel = useCallback(() => {
    runId.current++;
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setBusy(false);
  }, []);

  const convert = useCallback(() => {
    setError(null);
    setResult(null);
    if (mode === "file" && !file) {
      setError("Choose a CSV file first.");
      return;
    }
    if (mode === "paste" && text.trim() === "") {
      setError("Paste some CSV text first.");
      return;
    }

    if (workerRef.current) workerRef.current.terminate();
    const id = ++runId.current;
    let worker: Worker;
    try {
      worker = new Worker(new URL("./workers/csv.worker.ts", import.meta.url), { type: "module" });
    } catch {
      setError("Your browser could not start a background worker.");
      return;
    }
    workerRef.current = worker;
    setBusy(true);
    setProgress({ processed: 0, total: mode === "file" && file ? file.size : text.length, rows: 0 });

    worker.onmessage = (event: MessageEvent<CsvWorkerResponse>) => {
      const msg = event.data;
      if (msg.id !== id) return;
      if (msg.type === "progress") {
        setProgress({ processed: msg.processed, total: msg.total, rows: msg.rows });
      } else if (msg.type === "done") {
        setResult(msg.result);
        setBusy(false);
        worker.terminate();
        if (workerRef.current === worker) workerRef.current = null;
      } else {
        setError(msg.message);
        setBusy(false);
        worker.terminate();
        if (workerRef.current === worker) workerRef.current = null;
      }
    };

    worker.onerror = () => {
      if (runId.current !== id) return;
      setError("The converter stopped unexpectedly. Try a smaller file or different options.");
      setBusy(false);
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };

    if (mode === "file" && file) {
      worker.postMessage({ type: "convert", id, options: opts, file });
    } else {
      worker.postMessage({ type: "convert", id, options: opts, text });
    }
  }, [mode, file, text, opts]);

  const baseName = file ? file.name.replace(/\.[^.]+$/, "") || "converted" : "converted";
  const extension = opts.format === "ndjson" ? ".ndjson" : ".json";

  const download = useCallback(() => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = baseName + extension;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, [result, baseName, extension]);

  const copy = useCallback(async () => {
    if (!result) return;
    if (result.blob.size > COPY_LIMIT_BYTES) {
      setError("The output is " + formatBytes(result.blob.size) + ", which is too large to copy. Use Download instead.");
      return;
    }
    try {
      const content = await result.blob.text();
      await navigator.clipboard.writeText(content);
      flash("JSON copied");
    } catch {
      setError("Copy failed. Use Download instead.");
    }
  }, [result, flash]);

  const pct = progress.total > 0 ? Math.min(100, Math.round((progress.processed / progress.total) * 100)) : 0;

  return (
    <div className="space-y-4">
      <div className="card p-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={mode === "paste" ? "btn-primary" : "btn-secondary"}
          aria-pressed={mode === "paste"}
          onClick={() => setMode("paste")}
        >
          Paste CSV
        </button>
        <button
          type="button"
          className={mode === "file" ? "btn-primary" : "btn-secondary"}
          aria-pressed={mode === "file"}
          onClick={() => setMode("file")}
        >
          Upload file
        </button>
        <span className="ml-auto text-sm opacity-80" role="status" aria-live="polite">
          {notice}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-3 lg:col-span-2 space-y-3" aria-label="Input">
          {mode === "paste" ? (
            <>
              <textarea
                className="input font-mono text-sm w-full"
                style={{ minHeight: 320, resize: "vertical" }}
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck={false}
                placeholder="Paste CSV text here..."
                aria-label="CSV text"
              />
              <div className="flex flex-wrap gap-2">
                <span className="chip">{text.length.toLocaleString()} characters</span>
                <button type="button" className="btn-ghost" onClick={() => setText(SAMPLE)}>
                  Load sample
                </button>
                <button type="button" className="btn-ghost" onClick={() => setText("")}>
                  Clear
                </button>
              </div>
            </>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pickFile(e.dataTransfer.files && e.dataTransfer.files[0]);
              }}
              className="rounded-xl flex flex-col items-center justify-center gap-3 text-center p-8"
              style={{
                minHeight: 320,
                border: "2px dashed " + (dragging ? "currentColor" : "rgba(127,127,127,.5)"),
              }}
            >
              <Ico d={ICON_UPLOAD} size={32} />
              {file ? (
                <p className="text-sm">
                  <strong>{file.name}</strong>
                  <br />
                  {formatBytes(file.size)}
                </p>
              ) : (
                <p className="text-sm opacity-80">Drop a .csv, .tsv or .txt file here (up to 600 MB)</p>
              )}
              <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
                Choose file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
                className="hidden"
                onChange={(e) => {
                  pickFile(e.target.files && e.target.files[0]);
                  e.target.value = "";
                }}
              />
            </div>
          )}
        </section>

        <section className="card p-3 space-y-3" aria-label="Options">
          <label className="block text-sm">
            <span className="block mb-1 font-medium">Delimiter</span>
            <select
              className="input w-full"
              value={opts.delimiter}
              onChange={(e) => setOpt("delimiter", e.target.value)}
            >
              <option value="auto">Auto detect</option>
              <option value=",">Comma (,)</option>
              <option value=";">Semicolon (;)</option>
              <option value={"\t"}>Tab</option>
              <option value="|">Pipe (|)</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="block mb-1 font-medium">Output format</span>
            <select
              className="input w-full"
              value={opts.format}
              onChange={(e) => setOpt("format", e.target.value as CsvOptions["format"])}
            >
              <option value="objects">Array of objects</option>
              <option value="arrays">Array of arrays (keeps header row)</option>
              <option value="ndjson">NDJSON (one object per line)</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="block mb-1 font-medium">Layout</span>
            <select
              className="input w-full"
              value={opts.style}
              onChange={(e) => setOpt("style", e.target.value as CsvOptions["style"])}
              disabled={opts.format === "ndjson"}
            >
              <option value="pretty">Pretty printed</option>
              <option value="lines">One row per line</option>
              <option value="minified">Minified</option>
            </select>
          </label>

          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={opts.hasHeader}
                onChange={(e) => setOpt("hasHeader", e.target.checked)}
              />
              First row is a header
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={opts.trim} onChange={(e) => setOpt("trim", e.target.checked)} />
              Trim whitespace
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={opts.dynamicTyping}
                onChange={(e) => setOpt("dynamicTyping", e.target.checked)}
              />
              Detect numbers, booleans, null
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={opts.emptyAsNull}
                onChange={(e) => setOpt("emptyAsNull", e.target.checked)}
              />
              Empty cells become null
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={opts.skipEmpty}
                onChange={(e) => setOpt("skipEmpty", e.target.checked)}
              />
              Skip empty lines
            </label>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              className="btn-primary inline-flex items-center gap-2 flex-1 justify-center"
              onClick={convert}
              disabled={busy}
            >
              <Ico d={ICON_ZAP} /> {busy ? "Converting..." : "Convert"}
            </button>
            {busy && (
              <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={cancel}>
                <Ico d={ICON_X} /> Cancel
              </button>
            )}
          </div>
        </section>
      </div>

      {busy && (
        <div className="card p-3 space-y-2" role="status" aria-live="polite">
          <div className="flex justify-between text-sm">
            <span>Converting... {pct}%</span>
            <span>{progress.rows.toLocaleString()} rows so far</span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              background: "rgba(127,127,127,.25)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: pct + "%",
                height: "100%",
                background: "currentColor",
                transition: "width .15s",
              }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="card p-3 text-sm" role="alert">
          {error}
        </div>
      )}

      {result && (
        <section className="card p-3 space-y-3" aria-label="Result">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">{result.stats.rows.toLocaleString()} rows</span>
            <span className="chip">{result.stats.columns.toLocaleString()} columns</span>
            <span className="chip">{delimiterLabel(result.stats.delimiter)} delimiter</span>
            <span className="chip">{formatBytes(result.stats.outputBytes)} output</span>
            <span className="chip">{(result.stats.elapsedMs / 1000).toFixed(2)} s</span>
            <div className="ml-auto flex gap-2">
              <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => void copy()}>
                <Ico d={ICON_COPY} /> Copy
              </button>
              <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={download}>
                <Ico d={ICON_DOWNLOAD} /> Download {extension}
              </button>
            </div>
          </div>

          {result.stats.warnings.length > 0 && (
            <ul className="text-sm list-disc pl-5 space-y-1">
              {result.stats.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
              {result.stats.mismatched > result.stats.warnings.length && (
                <li>{result.stats.mismatched.toLocaleString()} records in total had a different number of fields.</li>
              )}
            </ul>
          )}

          <pre
            className="input font-mono text-xs"
            style={{ maxHeight: 420, overflow: "auto", whiteSpace: "pre", margin: 0 }}
            aria-label="JSON preview"
          >
            {result.preview}
            {result.previewTruncated ? "\n... preview truncated, download the file for the full output" : ""}
          </pre>
        </section>
      )}
    </div>
  );
}
