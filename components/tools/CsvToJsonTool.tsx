"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import {
  DELIMITER_CHOICES,
  ENCODING_CHOICES,
  LIVE_LIMIT_CHARS,
  MAX_FILE_BYTES,
  OUTPUT_FORMATS,
  SMALL_FILE_BYTES,
  convertText,
  defaultOptions,
  delimiterLabel,
  emptySummary,
  outputExtension,
  outputMime,
} from "../../lib/csv-to-json-engine";
import type { ConvertSummary, CsvOptions, WorkerRequest, WorkerResponse } from "../../lib/csv-to-json-engine";

const DISPLAY_LIMIT_CHARS = 300000;
const SOFT_BG = "color-mix(in srgb, currentColor 8%, transparent)";

const SAMPLE = [
  "id,name,email,age,active,notes",
  '1,Ada Lovelace,ada@example.com,36,true,"Mathematician, writer"',
  '2,Grace Hopper,grace@example.com,85,true,"Said ""it is easier to ask forgiveness"""',
  '3,Linus Torvalds,linus@example.com,54,false,"First line\nsecond line"',
  "4,Margaret Hamilton,,87,true,",
].join("\n");

interface ResultView {
  ready: boolean;
  text: string;
  blob?: Blob;
  bytes: number;
  ms: number;
  format: string;
  summary: ConvertSummary;
}

const EMPTY_RESULT: ResultView = { ready: false, text: "", bytes: 0, ms: 0, format: "objects", summary: emptySummary() };

function formatBytes(n: number): string {
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  if (n < 1073741824) return (n / 1048576).toFixed(1) + " MB";
  return (n / 1073741824).toFixed(2) + " GB";
}

interface ToggleProps {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}

function Toggle(props: ToggleProps) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled === true}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      <span>{props.label}</span>
    </label>
  );
}

export default function CsvToJsonTool() {
  const [text, setText] = useState("");
  const [opts, setOpts] = useState<CsvOptions>(defaultOptions());
  const [result, setResult] = useState<ResultView>(EMPTY_RESULT);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [rowsSoFar, setRowsSoFar] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [fileMode, setFileMode] = useState(false);
  const [stale, setStale] = useState(false);
  const [largePending, setLargePending] = useState(false);

  const workerRef = useRef<{ w?: Worker }>({});
  const fileRef = useRef<{ f?: File }>({});
  const jobRef = useRef(0);
  const formatRef = useRef("objects");
  const inputRef = useRef<HTMLInputElement>(null);
  const urlsRef = useRef<string[]>([]);

  const stopWorker = useCallback(() => {
    const holder = workerRef.current;
    if (holder.w) {
      holder.w.terminate();
      holder.w = undefined;
    }
  }, []);

  const flash = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2500);
  }, []);

  const handleMessage = useCallback((event: MessageEvent<WorkerResponse>) => {
    const m = event.data;
    if (m.id !== jobRef.current) return;
    if (m.type === "progress") {
      const total = m.total ?? 0;
      setProgress(total > 0 ? Math.min(99, Math.round(((m.loaded ?? 0) / total) * 100)) : 0);
      setRowsSoFar(m.rows ?? 0);
    } else if (m.type === "done") {
      setResult({
        ready: true,
        text: m.text ?? "",
        blob: m.blob,
        bytes: m.bytes ?? 0,
        ms: m.ms ?? 0,
        format: formatRef.current,
        summary: m.summary ?? emptySummary(),
      });
      setBusy(false);
      setProgress(100);
      setStale(false);
    } else if (m.type === "error") {
      setError(m.message ?? "Conversion failed.");
      setBusy(false);
    }
  }, []);

  const ensureWorker = useCallback((): boolean => {
    if (workerRef.current.w) return true;
    try {
      const w = new Worker(new URL("./csv-to-json.worker.ts", import.meta.url));
      w.onmessage = handleMessage;
      w.onerror = () => {
        setError("The background worker stopped unexpectedly. Try a smaller file or fewer options.");
        setBusy(false);
      };
      workerRef.current.w = w;
      return true;
    } catch {
      setError("Web Workers are not available in this browser.");
      return false;
    }
  }, [handleMessage]);

  const prepare = useCallback(
    (options: CsvOptions): number => {
      jobRef.current += 1;
      stopWorker();
      if (!ensureWorker()) return 0;
      formatRef.current = options.format;
      setBusy(true);
      setProgress(0);
      setRowsSoFar(0);
      setError("");
      setNotice("");
      setStale(false);
      return jobRef.current;
    },
    [ensureWorker, stopWorker]
  );

  const runFile = useCallback(
    (file: File, options: CsvOptions) => {
      const id = prepare(options);
      if (id === 0) return;
      const req: WorkerRequest = { type: "convert-file", id, file, options };
      workerRef.current.w?.postMessage(req);
    },
    [prepare]
  );

  const runLargeText = useCallback(
    (value: string, options: CsvOptions) => {
      const id = prepare(options);
      if (id === 0) return;
      const req: WorkerRequest = { type: "convert-text", id, text: value, options };
      workerRef.current.w?.postMessage(req);
    },
    [prepare]
  );

  const readSmall = useCallback(async (file: File, encoding: string) => {
    try {
      const buffer = await file.arrayBuffer();
      let decoder = new TextDecoder("utf-8");
      try {
        decoder = new TextDecoder(encoding);
      } catch {
        decoder = new TextDecoder("utf-8");
      }
      setText(decoder.decode(buffer));
    } catch {
      setError("Could not read that file.");
    }
  }, []);

  const loadFile = useCallback(
    async (file: File) => {
      setError("");
      setNotice("");
      if (file.size > MAX_FILE_BYTES) {
        setError("That file is " + formatBytes(file.size) + ". The limit is 600 MB.");
        return;
      }
      fileRef.current.f = file;
      setFileName(file.name);
      setFileSize(file.size);
      if (file.size <= SMALL_FILE_BYTES) {
        setFileMode(false);
        await readSmall(file, opts.encoding);
        return;
      }
      setFileMode(true);
      setText("");
      setResult(EMPTY_RESULT);
      runFile(file, opts);
    },
    [opts, readSmall, runFile]
  );

  useEffect(() => {
    const f = fileRef.current.f;
    if (f && !fileMode) void readSmall(f, opts.encoding);
  }, [opts.encoding, fileMode, readSmall]);

  useEffect(() => {
    if (fileMode) return undefined;
    if (text === "") {
      setResult(EMPTY_RESULT);
      setError("");
      setLargePending(false);
      return undefined;
    }
    if (text.length > LIVE_LIMIT_CHARS) {
      setLargePending(true);
      return undefined;
    }
    setLargePending(false);
    const t = window.setTimeout(() => {
      jobRef.current += 1;
      stopWorker();
      setBusy(false);
      try {
        const started = Date.now();
        const r = convertText(text, opts);
        setResult({
          ready: true,
          text: r.text,
          bytes: r.text.length,
          ms: Date.now() - started,
          format: opts.format,
          summary: r.summary,
        });
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not convert this CSV.");
      }
    }, 200);
    return () => window.clearTimeout(t);
  }, [text, opts, fileMode, stopWorker]);

  useEffect(() => {
    const holder = workerRef.current;
    const urls = urlsRef.current;
    return () => {
      if (holder.w) {
        holder.w.terminate();
        holder.w = undefined;
      }
      for (const u of urls) URL.revokeObjectURL(u);
      urls.length = 0;
    };
  }, []);

  const update = (patch: Partial<CsvOptions>) => {
    setOpts((prev) => ({ ...prev, ...patch }));
    if (fileMode) setStale(true);
  };

  const convertAgain = () => {
    const f = fileRef.current.f;
    if (fileMode && f) runFile(f, opts);
    else runLargeText(text, opts);
  };

  const cancel = () => {
    jobRef.current += 1;
    stopWorker();
    setBusy(false);
    flash("Conversion cancelled.");
  };

  const clearAll = () => {
    jobRef.current += 1;
    stopWorker();
    fileRef.current.f = undefined;
    setText("");
    setResult(EMPTY_RESULT);
    setFileMode(false);
    setFileName("");
    setFileSize(0);
    setError("");
    setNotice("");
    setBusy(false);
    setProgress(0);
    setStale(false);
    setLargePending(false);
  };

  const loadSample = () => {
    jobRef.current += 1;
    stopWorker();
    fileRef.current.f = undefined;
    setFileMode(false);
    setFileName("");
    setFileSize(0);
    setError("");
    setText(SAMPLE);
  };

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(result.text);
      flash("JSON copied to clipboard");
    } catch {
      setError("Copy failed because the browser blocked clipboard access.");
    }
  };

  const downloadOutput = () => {
    const blob = result.blob ?? new Blob([result.text], { type: outputMime(result.format) });
    const url = URL.createObjectURL(blob);
    urlsRef.current.push(url);
    const base = fileName === "" ? "converted" : fileName.replace(/\.[^.]+$/, "");
    const a = document.createElement("a");
    a.href = url;
    a.download = base + "." + outputExtension(result.format);
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
      const idx = urlsRef.current.indexOf(url);
      if (idx >= 0) urlsRef.current.splice(idx, 1);
    }, 15000);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) void loadFile(f);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void loadFile(f);
    e.target.value = "";
  };

  const showFull = result.text !== "" && result.text.length <= DISPLAY_LIMIT_CHARS;
  const shownText = showFull ? result.text : result.summary.preview;
  const previewOnly = result.ready && !showFull;
  const hasInput = fileMode ? fileName !== "" : text !== "";

  return (
    <div
      className={dragging ? "space-y-4 rounded-xl ring-2 ring-offset-2" : "space-y-4"}
      onDragOver={onDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      aria-busy={busy}
    >
      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primary" onClick={() => inputRef.current?.click()}>
            Open CSV file
          </button>
          <button type="button" className="btn-secondary" onClick={loadSample}>
            Load sample
          </button>
          <button type="button" className="btn-ghost" onClick={clearAll} disabled={!hasInput && !result.ready}>
            Clear
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
            className="hidden"
            onChange={onPick}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-secondary" disabled={result.text === ""} onClick={() => void copyOutput()}>
            Copy JSON
          </button>
          <button type="button" className="btn-secondary" disabled={!result.ready} onClick={downloadOutput}>
            {"Download ." + outputExtension(result.ready ? result.format : opts.format)}
          </button>
          {fileMode || largePending ? (
            <button type="button" className="btn-primary" disabled={busy} onClick={convertAgain}>
              {result.ready ? "Convert again" : "Convert"}
            </button>
          ) : null}
        </div>
        <p className="text-xs opacity-70">
          Paste CSV, or drop a file anywhere on this tool. Files up to 600 MB are read in chunks inside your browser and never uploaded.
        </p>
      </div>

      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold">Delimiter</span>
          <select className="input w-full" value={opts.delimiter} onChange={(e) => update({ delimiter: e.target.value })}>
            {DELIMITER_CHOICES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold">Output format</span>
          <select className="input w-full" value={opts.format} onChange={(e) => update({ format: e.target.value })}>
            {OUTPUT_FORMATS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold">File encoding</span>
          <select className="input w-full" value={opts.encoding} onChange={(e) => update({ encoding: e.target.value })}>
            {ENCODING_CHOICES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <Toggle label="First row is the header" checked={opts.hasHeader} onChange={(v) => update({ hasHeader: v })} />
        <Toggle label="Trim whitespace around values" checked={opts.trim} onChange={(v) => update({ trim: v })} />
        <Toggle
          label="Convert numbers, true/false and empty cells"
          checked={opts.inferTypes}
          onChange={(v) => update({ inferTypes: v })}
        />
        <Toggle label="Skip empty lines" checked={opts.skipEmpty} onChange={(v) => update({ skipEmpty: v })} />
        <Toggle
          label="Pretty-print the JSON"
          checked={opts.pretty && opts.format !== "ndjson"}
          disabled={opts.format === "ndjson"}
          onChange={(v) => update({ pretty: v })}
        />
      </div>

      {error !== "" ? (
        <div role="alert" className="card p-3 text-sm" style={{ borderColor: "#dc2626" }}>
          {error}
        </div>
      ) : null}

      {stale ? (
        <div className="card p-3 text-sm">Options changed. Click Convert again to apply them to this file.</div>
      ) : null}

      {largePending && !busy && !result.ready ? (
        <div className="card p-3 text-sm">
          This text is large, so it is converted in the background. Click Convert to start.
        </div>
      ) : null}

      {busy ? (
        <div className="card p-3" role="status" aria-live="polite">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span>{"Converting (" + progress + "%), " + rowsSoFar.toLocaleString() + " rows so far"}</span>
            <button type="button" className="btn-ghost" onClick={cancel}>
              Cancel
            </button>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: SOFT_BG }}>
            <div
              className="h-full rounded-full"
              style={{ width: progress + "%", background: "currentColor", opacity: 0.6, transition: "width 150ms linear" }}
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2" aria-live="polite">
        <span className="chip">{result.summary.rows.toLocaleString() + " rows"}</span>
        <span className="chip">{result.summary.columns.toLocaleString() + " columns"}</span>
        {result.ready ? <span className="chip">{"Delimiter: " + delimiterLabel(result.summary.delimiter)}</span> : null}
        {result.ready ? <span className="chip">{"Output " + formatBytes(result.bytes)}</span> : null}
        {result.ready ? <span className="chip">{result.ms.toLocaleString() + " ms"}</span> : null}
        {fileName !== "" ? <span className="chip">{fileName + " (" + formatBytes(fileSize) + ")"}</span> : null}
        {notice !== "" ? <span className="text-sm font-medium">{notice}</span> : null}
      </div>

      {result.summary.headers.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold">Keys:</span>
          {result.summary.headers.slice(0, 16).map((h, idx) => (
            <span key={h + "-" + idx} className="chip">
              {h}
            </span>
          ))}
          {result.summary.columns > 16 ? <span className="text-xs opacity-70">{"and " + (result.summary.columns - 16) + " more"}</span> : null}
        </div>
      ) : null}

      {result.summary.warnings.length > 0 ? (
        <div className="card space-y-1 p-3 text-sm">
          {result.summary.warnings.map((w, idx) => (
            <p key={idx}>{w}</p>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card min-w-0 p-3">
          <label htmlFor="csv-input" className="mb-2 block text-sm font-semibold">
            CSV input
          </label>
          <textarea
            id="csv-input"
            className="input w-full font-mono text-sm"
            style={{ minHeight: "50vh", resize: "vertical" }}
            value={text}
            disabled={fileMode}
            spellCheck={false}
            placeholder="Paste CSV here, or open a file."
            onChange={(e) => {
              fileRef.current.f = undefined;
              setText(e.target.value);
            }}
          />
          {fileMode ? (
            <p className="mt-2 text-xs opacity-70">
              Large files are streamed straight from disk and are not loaded into the editor. Click Clear to paste text again.
            </p>
          ) : null}
        </div>
        <div className="card min-w-0 p-3">
          <label htmlFor="json-output" className="mb-2 block text-sm font-semibold">
            JSON output
          </label>
          <textarea
            id="json-output"
            className="input w-full font-mono text-sm"
            style={{ minHeight: "50vh", resize: "vertical" }}
            value={shownText}
            readOnly
            spellCheck={false}
            placeholder="Your JSON appears here."
          />
          {previewOnly ? (
            <p className="mt-2 text-xs opacity-70">
              {"Showing the first " + Math.min(25, result.summary.rows) + " rows only. Use Download to get the full result" +
                (result.text !== "" ? " or Copy JSON." : ".")}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
