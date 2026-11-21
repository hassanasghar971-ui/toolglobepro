"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { MAX_CSV_BYTES } from "./csv-parser";
import type {
  CsvConvertOptions,
  DelimiterChoice,
  OutputFormat,
  WorkerRequest,
  WorkerResponse,
} from "./csv-parser";

const COPY_LIMIT_BYTES = 5 * 1024 * 1024;

const SAMPLE_CSV = [
  "id,name,email,age,active,city",
  '1,"Ada Lovelace",ada@example.com,36,true,London',
  '2,"Grace ""Amazing"" Hopper",grace@example.com,85,false,"New York, NY"',
  '3,Linus Torvalds,linus@example.com,54,true,Portland',
  '4,"Multi-line',
  'Note",note@example.com,,true,Nowhere',
  "",
].join("\n");

const DEFAULT_OPTIONS: CsvConvertOptions = {
  delimiter: "auto",
  hasHeader: true,
  format: "objects",
  inferTypes: true,
  trimFields: false,
  pretty: true,
};

interface ResultState {
  blob: Blob;
  rows: number;
  columns: number;
  delimiter: string;
  inputBytes: number;
  outputBytes: number;
  preview: string;
  previewTruncated: boolean;
  warnings: string[];
  elapsedMs: number;
  format: OutputFormat;
}

type Status = "idle" | "running" | "done" | "error";

function Svg({ paths, size = 16 }: { paths: readonly string[]; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

const ICON_UPLOAD = ["M12 16V4", "M7 9l5-5 5 5", "M4 20h16"];
const ICON_DOWNLOAD = ["M12 4v12", "M7 11l5 5 5-5", "M4 20h16"];
const ICON_COPY = ["M9 9h11v11H9z", "M5 15V5a1 1 0 0 1 1-1h10"];
const ICON_STOP = ["M6 6h12v12H6z"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[unit]}`;
}

function formatDuration(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
}

function delimiterName(delimiter: string): string {
  switch (delimiter) {
    case ",":
      return "comma";
    case ";":
      return "semicolon";
    case "\t":
      return "tab";
    case "|":
      return "pipe";
    default:
      return JSON.stringify(delimiter);
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function CsvToJsonTool() {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState<CsvConvertOptions>(DEFAULT_OPTIONS);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState({ bytes: 0, total: 0, rows: 0 });
  const [result, setResult] = useState<ResultState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const update = <K extends keyof CsvConvertOptions>(key: K, value: CsvConvertOptions[K]) =>
    setOptions((current) => ({ ...current, [key]: value }));

  const chooseFile = useCallback((picked: File | null) => {
    if (!picked) return;
    if (picked.size > MAX_CSV_BYTES) {
      setError(
        `"${picked.name}" is ${formatBytes(picked.size)}. The maximum supported size is ${formatBytes(MAX_CSV_BYTES)}.`,
      );
      return;
    }
    setError(null);
    setResult(null);
    setStatus("idle");
    setFile(picked);
  }, []);

  function onFileInput(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0] ?? null);
  }

  function stopWorker() {
    workerRef.current?.terminate();
    workerRef.current = null;
  }

  const convert = useCallback(() => {
    setError(null);
    setResult(null);
    setCopied(false);

    const source: Blob | null = file ?? (text.trim().length > 0 ? new Blob([text], { type: "text/csv" }) : null);
    if (!source) {
      setError("Paste some CSV text or choose a file first.");
      setStatus("error");
      return;
    }
    if (source.size > MAX_CSV_BYTES) {
      setError(`Input is larger than ${formatBytes(MAX_CSV_BYTES)}.`);
      setStatus("error");
      return;
    }
    if (typeof Worker === "undefined") {
      setError("Your browser does not support Web Workers, which this tool needs for large files.");
      setStatus("error");
      return;
    }

    stopWorker();
    const worker = new Worker(new URL("./csv.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    setStatus("running");
    setProgress({ bytes: 0, total: source.size, rows: 0 });

    const finishWorker = () => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.type === "progress") {
        setProgress({ bytes: message.bytes, total: message.total, rows: message.rows });
      } else if (message.type === "done") {
        setResult({
          blob: message.blob,
          rows: message.rows,
          columns: message.columns,
          delimiter: message.delimiter,
          inputBytes: message.inputBytes,
          outputBytes: message.outputBytes,
          preview: message.preview,
          previewTruncated: message.previewTruncated,
          warnings: message.warnings,
          elapsedMs: message.elapsedMs,
          format: options.format,
        });
        setStatus("done");
        finishWorker();
      } else {
        setError(message.message);
        setStatus("error");
        finishWorker();
      }
    };

    worker.onerror = (event) => {
      setError(
        event.message ||
          "The background worker stopped unexpectedly. The file may be too large for this device's memory.",
      );
      setStatus("error");
      finishWorker();
    };

    const request: WorkerRequest = { type: "start", blob: source, options };
    worker.postMessage(request);
  }, [file, text, options]);

  function cancel() {
    stopWorker();
    setStatus("idle");
    setError("Conversion cancelled.");
  }

  function download() {
    if (!result) return;
    const base = file ? file.name.replace(/\.[^.]+$/, "") : "data";
    const extension = result.format === "ndjson" ? "ndjson" : "json";
    downloadBlob(result.blob, `${base || "data"}.${extension}`);
  }

  async function copyOutput() {
    if (!result || result.outputBytes > COPY_LIMIT_BYTES) return;
    const ok = await copyText(await result.blob.text());
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } else {
      setError("Copying to the clipboard was blocked by the browser. Use Download instead.");
    }
  }

  function reset() {
    stopWorker();
    setText("");
    setFile(null);
    setResult(null);
    setError(null);
    setStatus("idle");
  }

  const running = status === "running";
  const percent = progress.total > 0 ? Math.min(100, Math.round((progress.bytes / progress.total) * 100)) : 0;

  return (
    <div className="space-y-4">
      <div className="card space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold">1. Add your CSV</h2>
          <span className="chip">Up to {formatBytes(MAX_CSV_BYTES)}</span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setFile(null);
                setText(SAMPLE_CSV);
                setResult(null);
                setError(null);
                setStatus("idle");
              }}
              disabled={running}
            >
              Sample
            </button>
            <button type="button" className="btn-ghost" onClick={reset}>
              Reset
            </button>
          </div>
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`rounded-xl border-2 border-dashed p-4 text-center text-sm transition ${
            dragging ? "border-blue-500 bg-blue-500/10" : "border-black/20 dark:border-white/20"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
            className="hidden"
            onChange={onFileInput}
          />
          {file ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="font-medium">{file.name}</span>
              <span className="chip">{formatBytes(file.size)}</span>
              <button type="button" className="btn-ghost" onClick={() => setFile(null)} disabled={running}>
                Remove file
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span>Drag &amp; drop a CSV / TSV file here, or</span>
              <button
                type="button"
                className="btn-secondary inline-flex items-center gap-2"
                onClick={() => fileRef.current?.click()}
                disabled={running}
              >
                <Svg paths={ICON_UPLOAD} /> Choose file
              </button>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="csv-text" className="mb-1 block text-sm font-semibold">
            …or paste CSV text
          </label>
          <textarea
            id="csv-text"
            className="input min-h-[170px] w-full resize-y font-mono text-sm"
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={running || file !== null}
            spellCheck={false}
            placeholder={file ? "A file is selected; remove it to paste text." : "id,name,email\n1,Ada,ada@example.com"}
          />
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="text-base font-semibold">2. Options</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Delimiter</span>
            <select
              className="input w-full"
              value={options.delimiter}
              onChange={(event) => update("delimiter", event.target.value as DelimiterChoice)}
              disabled={running}
            >
              <option value="auto">Auto-detect</option>
              <option value=",">Comma ( , )</option>
              <option value=";">Semicolon ( ; )</option>
              <option value={"\t"}>Tab</option>
              <option value="|">Pipe ( | )</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Output format</span>
            <select
              className="input w-full"
              value={options.format}
              onChange={(event) => update("format", event.target.value as OutputFormat)}
              disabled={running}
            >
              <option value="objects">Array of objects</option>
              <option value="arrays">Array of arrays</option>
              <option value="ndjson">NDJSON (one object per line)</option>
            </select>
          </label>

          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={options.hasHeader}
                onChange={(event) => update("hasHeader", event.target.checked)}
                disabled={running || options.format === "arrays"}
              />
              First row is a header
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={options.inferTypes}
                onChange={(event) => update("inferTypes", event.target.checked)}
                disabled={running}
              />
              Infer numbers, booleans &amp; nulls
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={options.trimFields}
                onChange={(event) => update("trimFields", event.target.checked)}
                disabled={running}
              />
              Trim whitespace in cells
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={options.pretty}
                onChange={(event) => update("pretty", event.target.checked)}
                disabled={running || options.format === "ndjson"}
              />
              Pretty-print output
            </label>
          </div>
        </div>
        {options.format === "arrays" && (
          <p className="text-xs opacity-70">In array-of-arrays mode the header row is kept as the first array.</p>
        )}
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold">3. Convert</h2>
          <div className="ml-auto flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={convert} disabled={running}>
              {running ? "Converting…" : "Convert to JSON"}
            </button>
            {running && (
              <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={cancel}>
                <Svg paths={ICON_STOP} /> Cancel
              </button>
            )}
          </div>
        </div>

        <div aria-live="polite">
          {running && (
            <div className="space-y-1">
              <div
                className="h-3 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
              >
                <div className="h-full rounded-full bg-blue-600 transition-[width]" style={{ width: `${percent}%` }} />
              </div>
              <p className="text-xs opacity-70">
                {percent}% · {formatBytes(progress.bytes)} of {formatBytes(progress.total)} ·{" "}
                {progress.rows.toLocaleString()} rows
              </p>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        {result && status === "done" && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="chip">{result.rows.toLocaleString()} rows</span>
              <span className="chip">{result.columns.toLocaleString()} columns</span>
              <span className="chip">delimiter: {delimiterName(result.delimiter)}</span>
              <span className="chip">
                {formatBytes(result.inputBytes)} → {formatBytes(result.outputBytes)}
              </span>
              <span className="chip">{formatDuration(result.elapsedMs)}</span>
            </div>

            {result.warnings.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-sm text-amber-700 dark:text-amber-400">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={download}>
                <Svg paths={ICON_DOWNLOAD} /> Download {result.format === "ndjson" ? ".ndjson" : ".json"}
              </button>
              <button
                type="button"
                className="btn-secondary inline-flex items-center gap-2"
                onClick={copyOutput}
                disabled={result.outputBytes > COPY_LIMIT_BYTES}
                title={
                  result.outputBytes > COPY_LIMIT_BYTES
                    ? "Output is larger than 5 MB. Use Download."
                    : "Copy JSON to clipboard"
                }
              >
                <Svg paths={ICON_COPY} /> {copied ? "Copied!" : "Copy JSON"}
              </button>
            </div>

            <div>
              <h3 className="mb-1 text-sm font-semibold">
                Preview{result.previewTruncated ? " (first rows only)" : ""}
              </h3>
              <pre className="max-h-[420px] overflow-auto rounded-lg border border-black/10 p-3 text-xs dark:border-white/10">
                <code>{result.preview || "(no rows)"}</code>
              </pre>
            </div>
          </div>
        )}

        <p className="text-xs opacity-70">
          Private &amp; serverless: files are streamed in 8 MB slices inside a background worker. Nothing is uploaded.
          Very large outputs depend on your device&apos;s available memory and disk space.
        </p>
      </div>
    </div>
  );
}

export default CsvToJsonTool;
