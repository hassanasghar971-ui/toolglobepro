"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import {
  DECODE_MODES,
  ENCODE_MODES,
  LIVE_LIMIT_CHARS,
  MAX_FILE_BYTES,
  PREVIEW_CHARS,
  SMALL_FILE_BYTES,
  defaultUrlOptions,
  inspectUrl,
  looksDoubleEncoded,
  transformText,
} from "../../lib/url-encoder-decoder-engine";
import type { UrlOptions, WorkerRequest, WorkerResponse } from "../../lib/url-encoder-decoder-engine";

const SOFT_BG = "color-mix(in srgb, currentColor 8%, transparent)";
const SOFT_BORDER = "color-mix(in srgb, currentColor 22%, transparent)";
const VIEWS = ["encode", "decode", "inspect"];
const VIEW_LABELS: Record<string, string> = { encode: "Encode", decode: "Decode", inspect: "Inspect URL" };

const SAMPLE_ENCODE = "https://example.com/search?q=caf\u00e9 & croissants&sort=price asc&note=100% fresh";
const SAMPLE_DECODE = "https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dcaf%C3%A9%20%26%20croissants%26note%3D100%25%20fresh";

interface ResultView {
  ready: boolean;
  text: string;
  preview: string;
  blob?: Blob;
  bytes: number;
  stray: number;
  invalid: number;
  ms: number;
}

const EMPTY_RESULT: ResultView = { ready: false, text: "", preview: "", bytes: 0, stray: 0, invalid: 0, ms: 0 };

function formatBytes(n: number): string {
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  if (n < 1073741824) return (n / 1048576).toFixed(1) + " MB";
  return (n / 1073741824).toFixed(2) + " GB";
}

export default function UrlEncoderDecoderTool() {
  const [text, setText] = useState("");
  const [view, setView] = useState("encode");
  const [opts, setOpts] = useState<UrlOptions>(defaultUrlOptions());
  const [bigResult, setBigResult] = useState<ResultView>(EMPTY_RESULT);
  const [fileMode, setFileMode] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dragging, setDragging] = useState(false);

  const workerRef = useRef<{ w?: Worker }>({});
  const fileRef = useRef<{ f?: Blob }>({});
  const jobRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlsRef = useRef<string[]>([]);

  const action = view === "decode" ? "decode" : "encode";
  const options: UrlOptions = useMemo(() => ({ ...opts, action }), [opts, action]);
  const useBig = fileMode ? true : text.length > LIVE_LIMIT_CHARS;
  const modes = action === "decode" ? DECODE_MODES : ENCODE_MODES;
  const currentMode = action === "decode" ? opts.decodeMode : opts.encodeMode;
  const modeHint = modes.find((m) => m.key === currentMode)?.hint ?? "";

  const live = useMemo((): ResultView => {
    if (useBig) return EMPTY_RESULT;
    if (view === "inspect") return EMPTY_RESULT;
    if (text === "") return EMPTY_RESULT;
    const r = transformText(text, options);
    return {
      ready: true,
      text: r.text,
      preview: r.text.slice(0, PREVIEW_CHARS),
      bytes: r.text.length,
      stray: r.stray,
      invalid: r.invalid,
      ms: 0,
    };
  }, [text, options, view, useBig]);

  const result = useBig ? bigResult : live;
  const inspected = useMemo(() => (view === "inspect" ? inspectUrl(text) : inspectUrl("")), [text, view]);

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
    } else if (m.type === "done") {
      setBigResult({
        ready: true,
        text: m.text ?? "",
        preview: m.preview ?? "",
        blob: m.blob,
        bytes: m.bytes ?? 0,
        stray: m.stray ?? 0,
        invalid: m.invalid ?? 0,
        ms: m.ms ?? 0,
      });
      setBusy(false);
      setProgress(100);
      setStale(false);
    } else if (m.type === "error") {
      setError(m.message ?? "Processing failed.");
      setBusy(false);
    }
  }, []);

  const ensureWorker = useCallback((): boolean => {
    if (workerRef.current.w) return true;
    try {
      const w = new Worker(new URL("./url-encoder-decoder.worker.ts", import.meta.url));
      w.onmessage = handleMessage;
      w.onerror = () => {
        setError("The background worker stopped unexpectedly. Try a smaller input.");
        setBusy(false);
      };
      workerRef.current.w = w;
      return true;
    } catch {
      setError("Web Workers are not available in this browser.");
      return false;
    }
  }, [handleMessage]);

  const runBig = useCallback(
    (source: Blob, runOptions: UrlOptions) => {
      jobRef.current += 1;
      const id = jobRef.current;
      stopWorker();
      if (!ensureWorker()) return;
      setBusy(true);
      setProgress(0);
      setError("");
      setStale(false);
      const req: WorkerRequest = { type: "process", id, options: runOptions, file: source };
      workerRef.current.w?.postMessage(req);
    },
    [ensureWorker, stopWorker]
  );

  const loadFile = useCallback(
    async (file: File) => {
      setError("");
      setNotice("");
      if (file.size > MAX_FILE_BYTES) {
        setError("That file is " + formatBytes(file.size) + ". The limit is 600 MB.");
        return;
      }
      setFileName(file.name);
      setFileSize(file.size);
      if (file.size <= SMALL_FILE_BYTES) {
        try {
          setFileMode(false);
          fileRef.current.f = undefined;
          setText(await file.text());
        } catch {
          setError("Could not read that file.");
        }
        return;
      }
      fileRef.current.f = file;
      setFileMode(true);
      setText("");
      setBigResult(EMPTY_RESULT);
      if (view === "inspect") setView("encode");
      runBig(file, { ...opts, action: view === "decode" ? "decode" : "encode" });
    },
    [opts, runBig, view]
  );

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

  const update = (patch: Partial<UrlOptions>) => {
    setOpts((prev) => ({ ...prev, ...patch }));
    if (useBig) setStale(true);
  };

  const changeView = (next: string) => {
    setView(next);
    if (useBig) setStale(true);
  };

  const processBig = () => {
    const f = fileRef.current.f;
    if (fileMode && f) runBig(f, options);
    else runBig(new Blob([text]), options);
  };

  const cancel = () => {
    jobRef.current += 1;
    stopWorker();
    setBusy(false);
    flash("Processing cancelled.");
  };

  const clearAll = () => {
    jobRef.current += 1;
    stopWorker();
    fileRef.current.f = undefined;
    setText("");
    setBigResult(EMPTY_RESULT);
    setFileMode(false);
    setFileName("");
    setFileSize(0);
    setError("");
    setNotice("");
    setBusy(false);
    setProgress(0);
    setStale(false);
  };

  const loadSample = () => {
    clearAll();
    setText(view === "decode" ? SAMPLE_DECODE : SAMPLE_ENCODE);
  };

  const swap = () => {
    if (result.text === "") return;
    const next = result.text;
    setView(action === "encode" ? "decode" : "encode");
    setText(next);
  };

  const decodeAgain = () => {
    if (result.text !== "") setText(result.text);
  };

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      flash(label + " copied to clipboard");
    } catch {
      setError("Copy failed because the browser blocked clipboard access.");
    }
  };

  const download = () => {
    const blob = result.blob ?? new Blob([result.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    urlsRef.current.push(url);
    const a = document.createElement("a");
    a.href = url;
    a.download = "url-" + action + "d.txt";
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

  const showFull = result.text !== "" && result.text.length <= PREVIEW_CHARS * 10;
  const shownText = showFull ? result.text : result.preview;
  const previewOnly = result.ready && !showFull;
  const canProcessBig = useBig && !busy && (fileMode ? true : text !== "");

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
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              className={view === v ? "btn-primary" : "btn-secondary"}
              aria-pressed={view === v}
              onClick={() => changeView(v)}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()}>
            Open text file
          </button>
          <button type="button" className="btn-secondary" onClick={loadSample}>
            Load sample
          </button>
          <button type="button" className="btn-ghost" onClick={clearAll} disabled={text === "" && !result.ready}>
            Clear
          </button>
          {view !== "inspect" ? (
            <>
              <button type="button" className="btn-secondary" disabled={result.text === ""} onClick={() => void copy(result.text, "Result")}>
                Copy result
              </button>
              <button type="button" className="btn-secondary" disabled={!result.ready} onClick={download}>
                Download .txt
              </button>
              <button type="button" className="btn-secondary" disabled={result.text === ""} onClick={swap}>
                Use result as input
              </button>
            </>
          ) : null}
          {canProcessBig && view !== "inspect" ? (
            <button type="button" className="btn-primary" onClick={processBig}>
              {result.ready ? "Process again" : "Process in background"}
            </button>
          ) : null}
          <input ref={inputRef} type="file" accept=".txt,.csv,.log,.tsv,text/plain" className="hidden" onChange={onPick} />
        </div>
        <p className="text-xs opacity-70">
          Everything runs in your browser. Drop a text file anywhere on this tool. Files up to 600 MB are processed in chunks and never uploaded.
        </p>
      </div>

      {view !== "inspect" ? (
        <div className="card grid gap-3 p-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">{action === "decode" ? "Decode mode" : "Encode mode"}</span>
            <select
              className="input w-full"
              value={currentMode}
              onChange={(e) => update(action === "decode" ? { decodeMode: e.target.value } : { encodeMode: e.target.value })}
            >
              {modes.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs opacity-70">{modeHint}</span>
          </label>
          <div className="space-y-2 text-sm">
            {action === "encode" ? (
              <>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={opts.lines} onChange={(e) => update({ lines: e.target.checked })} />
                  <span>Encode each line separately (keeps line breaks)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={opts.keepEscapes} onChange={(e) => update({ keepEscapes: e.target.checked })} />
                  <span>Keep existing %XX sequences (avoid double encoding)</span>
                </label>
              </>
            ) : (
              <p className="text-xs opacity-70">
                Malformed sequences such as a lone percent sign are left as they are instead of causing an error.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {error !== "" ? (
        <div role="alert" className="card p-3 text-sm" style={{ borderColor: "#dc2626" }}>
          {error}
        </div>
      ) : null}

      {stale ? <div className="card p-3 text-sm">Settings changed. Click Process again to apply them.</div> : null}

      {useBig && !busy && !result.ready && view !== "inspect" ? (
        <div className="card p-3 text-sm">This input is large, so it is processed in the background. Click Process in background to start.</div>
      ) : null}

      {busy ? (
        <div className="card p-3" role="status" aria-live="polite">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span>{"Processing (" + progress + "%)"}</span>
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
        {view !== "inspect" ? <span className="chip">{text.length.toLocaleString() + " characters in"}</span> : null}
        {result.ready ? <span className="chip">{result.bytes.toLocaleString() + (fileMode ? " bytes out" : " characters out")}</span> : null}
        {fileName !== "" ? <span className="chip">{fileName + " (" + formatBytes(fileSize) + ")"}</span> : null}
        {result.ready && result.ms > 0 ? <span className="chip">{result.ms.toLocaleString() + " ms"}</span> : null}
        {notice !== "" ? <span className="text-sm font-medium">{notice}</span> : null}
      </div>

      {result.ready && result.stray > 0 ? (
        <div className="card p-3 text-sm">
          {result.stray.toLocaleString() + " percent sign(s) were not followed by two hex digits and were left unchanged."}
        </div>
      ) : null}
      {result.ready && result.invalid > 0 ? (
        <div className="card p-3 text-sm">
          {result.invalid.toLocaleString() + " unpaired surrogate character(s) were replaced with the Unicode replacement character before encoding."}
        </div>
      ) : null}
      {view === "decode" && result.text !== "" && looksDoubleEncoded(result.text) ? (
        <div className="card flex flex-wrap items-center gap-3 p-3 text-sm">
          <span>The result still contains encoded sequences such as %25XX. It may have been encoded twice.</span>
          <button type="button" className="btn-secondary" onClick={decodeAgain}>
            Decode again
          </button>
        </div>
      ) : null}

      {view !== "inspect" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card min-w-0 p-3">
            <label htmlFor="url-input" className="mb-2 block text-sm font-semibold">
              {action === "decode" ? "Encoded text or URL" : "Text or URL to encode"}
            </label>
            <textarea
              id="url-input"
              className="input w-full font-mono text-sm"
              style={{ minHeight: "40vh", resize: "vertical" }}
              value={text}
              disabled={fileMode}
              spellCheck={false}
              placeholder="Type or paste here, or open a file."
              onChange={(e) => {
                fileRef.current.f = undefined;
                setText(e.target.value);
              }}
            />
            {fileMode ? (
              <p className="mt-2 text-xs opacity-70">Large files are streamed from disk and are not shown here. Click Clear to type again.</p>
            ) : null}
          </div>
          <div className="card min-w-0 p-3">
            <label htmlFor="url-output" className="mb-2 block text-sm font-semibold">
              Result
            </label>
            <textarea
              id="url-output"
              className="input w-full font-mono text-sm"
              style={{ minHeight: "40vh", resize: "vertical" }}
              value={shownText}
              readOnly
              spellCheck={false}
              placeholder="The result appears here."
            />
            {previewOnly ? (
              <p className="mt-2 text-xs opacity-70">
                {"Showing the first " + shownText.length.toLocaleString() + " characters. Use Download for the complete result" +
                  (result.text !== "" ? " or Copy result." : ".")}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card min-w-0 p-3">
            <label htmlFor="url-inspect" className="mb-2 block text-sm font-semibold">
              URL to inspect
            </label>
            <textarea
              id="url-inspect"
              className="input w-full font-mono text-sm"
              style={{ minHeight: "8rem", resize: "vertical" }}
              value={text}
              spellCheck={false}
              placeholder="https://user@example.com:8080/path/page?id=7&tag=a%20b#section"
              onChange={(e) => {
                fileRef.current.f = undefined;
                setFileMode(false);
                setText(e.target.value);
              }}
            />
          </div>
          {text.trim() !== "" && !inspected.ok ? (
            <div role="alert" className="card p-3 text-sm" style={{ borderColor: "#dc2626" }}>
              {inspected.message}
            </div>
          ) : null}
          {inspected.ok ? (
            <>
              {inspected.assumed ? (
                <div className="card p-3 text-sm">No scheme was found, so https:// was assumed to break the URL into parts.</div>
              ) : null}
              <div className="card overflow-x-auto p-3">
                <h2 className="mb-2 text-sm font-semibold">URL parts</h2>
                <table className="min-w-full border-collapse text-sm">
                  <tbody>
                    {inspected.parts.map((p) => (
                      <tr key={p.label}>
                        <th className="border px-3 py-2 text-left font-semibold" style={{ borderColor: SOFT_BORDER, background: SOFT_BG }}>
                          {p.label}
                        </th>
                        <td className="break-all border px-3 py-2 font-mono" style={{ borderColor: SOFT_BORDER }}>
                          {p.value}
                          {p.decoded !== "" ? <div className="mt-1 text-xs opacity-70">{"Decoded: " + p.decoded}</div> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card overflow-x-auto p-3">
                <h2 className="mb-2 text-sm font-semibold">{"Query parameters (" + inspected.params.length + ")"}</h2>
                {inspected.params.length === 0 ? (
                  <p className="text-sm opacity-70">This URL has no query parameters.</p>
                ) : (
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="border px-3 py-2 text-left font-semibold" style={{ borderColor: SOFT_BORDER, background: SOFT_BG }}>
                          Name
                        </th>
                        <th className="border px-3 py-2 text-left font-semibold" style={{ borderColor: SOFT_BORDER, background: SOFT_BG }}>
                          Decoded value
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspected.params.map((p, idx) => (
                        <tr key={p.key + "-" + idx}>
                          <td className="break-all border px-3 py-2 font-mono" style={{ borderColor: SOFT_BORDER }}>
                            {p.key}
                          </td>
                          <td className="break-all border px-3 py-2 font-mono" style={{ borderColor: SOFT_BORDER }}>
                            {p.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
