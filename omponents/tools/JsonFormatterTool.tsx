"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  FULL_PARSE_LIMIT,
  INDENT_STRINGS,
  INLINE_TEXT_LIMIT,
  MAX_FILE_BYTES,
  MAX_TEXT_CHARS,
  TREE_LIMIT,
  indexFromLineCol,
  processJsonText,
  stripBom,
  type IndentKey,
  type JsonErrorInfo,
  type JsonMode,
  type JsonStats,
  type JsonWorkerRequest,
  type JsonWorkerResponse,
} from "@/lib/tools/json-core";
import {
  Checkbox,
  Dropzone,
  ProgressBar,
  Segmented,
  buttonClass,
  cardClass,
  downloadBlob,
  formatBytes,
  primaryButtonClass,
  textareaClass,
  useCopy,
} from "@/components/tools/shared";

interface FileResult {
  blob: Blob | null;
  size: number;
  stats: JsonStats;
  strategy: "stream" | "full";
  text: string | null;
  preview: string;
  previewTruncated: boolean;
}

interface Run {
  key: string;
  status: "running" | "done" | "invalid" | "error" | "cancelled";
  message?: string;
  error?: JsonErrorInfo;
  result?: FileResult;
}

const SAMPLE = `{"name":"ToolGlobe Pro","version":2,"features":["format","minify","validate"],"nested":{"ok":true,"ratio":0.75,"tags":[],"owner":null},"bigId":12345678901234567890}`;

const ACTIONS: { value: JsonMode; label: string }[] = [
  { value: "format", label: "Format" },
  { value: "minify", label: "Minify" },
  { value: "validate", label: "Validate" },
];

const INDENTS: { value: IndentKey; label: string }[] = [
  { value: "2", label: "2 spaces" },
  { value: "4", label: "4 spaces" },
  { value: "tab", label: "Tab" },
];

const PAGE = 200;

function Primitive({ value }: { value: unknown }) {
  if (typeof value === "string") {
    const s = value.length > 300 ? `${value.slice(0, 300)}…` : value;
    return <span className="text-emerald-600 dark:text-emerald-400">{JSON.stringify(s)}</span>;
  }
  if (typeof value === "number") return <span className="text-amber-600 dark:text-amber-400">{String(value)}</span>;
  return <span className="text-fuchsia-600 dark:text-fuchsia-400">{String(value)}</span>;
}

function TreeNode({
  label,
  value,
  depth,
  openDepth,
}: {
  label?: string;
  value: unknown;
  depth: number;
  openDepth: number;
}) {
  const isObject = value !== null && typeof value === "object";
  const isArray = Array.isArray(value);
  const [open, setOpen] = useState(depth < openDepth);
  const [limit, setLimit] = useState(PAGE);

  const entries = useMemo<[string, unknown][]>(() => {
    if (!isObject) return [];
    if (isArray) return (value as unknown[]).map((v, i) => [String(i), v]);
    return Object.entries(value as Record<string, unknown>);
  }, [value, isObject, isArray]);

  const labelEl =
    label !== undefined ? (
      <>
        <span className="text-indigo-600 dark:text-indigo-300">{isArray || depth === 0 ? label : JSON.stringify(label)}</span>
        <span className="text-slate-500">: </span>
      </>
    ) : null;

  if (!isObject) {
    return (
      <div className="break-all py-0.5 pl-5">
        {labelEl}
        <Primitive value={value} />
      </div>
    );
  }

  const open_ = isArray ? "[" : "{";
  const close_ = isArray ? "]" : "}";
  const summary = entries.length === 0 ? `${open_}${close_}` : `${open_} ${entries.length} ${isArray ? "items" : "keys"} ${close_}`;

  return (
    <div className="py-0.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 rounded text-left hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:bg-slate-800"
      >
        <span aria-hidden="true" className="w-4 text-slate-500">
          {entries.length === 0 ? "" : open ? "▾" : "▸"}
        </span>
        {labelEl}
        <span className="text-slate-500 dark:text-slate-400">{summary}</span>
      </button>
      {open && entries.length > 0 && (
        <div className="ml-2 border-l border-slate-200 pl-3 dark:border-slate-700">
          {entries.slice(0, limit).map(([k, v]) => (
            <TreeNode key={k} label={isArray ? k : k} value={v} depth={depth + 1} openDepth={openDepth} />
          ))}
          {entries.length > limit && (
            <button
              type="button"
              onClick={() => setLimit(limit + PAGE)}
              className="mt-1 rounded-lg border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Show {Math.min(PAGE, entries.length - limit)} more ({entries.length - limit} hidden)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatsBar({ stats, extra }: { stats: JsonStats; extra?: string }) {
  const chips = [
    `${stats.values.toLocaleString()} values`,
    `${stats.objects.toLocaleString()} objects`,
    `${stats.arrays.toLocaleString()} arrays`,
    `${stats.keys.toLocaleString()} keys`,
    `depth ${stats.maxDepth}`,
    formatBytes(stats.bytes),
  ];
  return (
    <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">✓ Valid JSON{extra ? ` · ${extra}` : ""}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {chips.map((c) => (
          <span key={c} className="rounded-full bg-white px-2.5 py-0.5 text-xs text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-300">
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function ErrorBox({ error, onGo }: { error: JsonErrorInfo; onGo?: () => void }) {
  const located = error.line > 0;
  const first = error.after.slice(0, 1);
  return (
    <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
      <p className="text-sm font-semibold text-red-800 dark:text-red-300">
        Invalid JSON{located ? ` at line ${error.line}, column ${error.column}` : ""}
      </p>
      <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error.message}</p>
      {located && (
        <p className="mt-2 overflow-x-auto whitespace-pre rounded-lg bg-white p-2 font-mono text-xs text-slate-800 dark:bg-slate-950 dark:text-slate-200">
          {error.before}
          <mark className="rounded bg-red-200 px-0.5 text-red-900 dark:bg-red-800 dark:text-red-100">{first || "␃"}</mark>
          {error.after.slice(1)}
        </p>
      )}
      {located && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Byte offset {error.offset.toLocaleString()}</p>
      )}
      {onGo && located && (
        <button type="button" onClick={onGo} className={`${buttonClass} mt-2`}>
          Go to error
        </button>
      )}
    </div>
  );
}

export function JsonFormatterTool() {
  const [tab, setTab] = useState<"text" | "file">("text");
  const [action, setAction] = useState<JsonMode>("format");
  const [indentKey, setIndentKey] = useState<IndentKey>("2");
  const [sortKeys, setSortKeys] = useState(false);
  const [input, setInput] = useState("");
  const [view, setView] = useState<"text" | "tree">("text");
  const [openDepth, setOpenDepth] = useState(2);
  const [treeGen, setTreeGen] = useState(0);

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [progress, setProgress] = useState<{ processed: number; total: number; phase: string } | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const runIdRef = useRef(0);
  const { copied, copy } = useCopy();
  const deferred = useDeferredValue(input);
  const indent = INDENT_STRINGS[indentKey];

  const tooLarge = input.length > MAX_TEXT_CHARS;
  const textResult = useMemo(() => {
    if (tab !== "text" || deferred.trim() === "" || deferred.length > MAX_TEXT_CHARS) return null;
    return processJsonText(deferred, { mode: action, indent, sortKeys });
  }, [tab, deferred, action, indent, sortKeys]);

  const fileSort = sortKeys && !!file && file.size <= FULL_PARSE_LIMIT && action !== "validate";
  const settingsKey = `${action}|${indentKey}|${fileSort}|${file?.name}|${file?.size}|${file?.lastModified}`;
  const active = run && (run.status === "running" || run.key === settingsKey) ? run : null;
  const running = run?.status === "running";
  const fr = active?.result;

  const stopWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      if (workerRef.current) workerRef.current.terminate();
    },
    [],
  );

  const handleFile = (f: File) => {
    if (f.size > MAX_FILE_BYTES) {
      setFileError(`“${f.name}” is ${formatBytes(f.size)}. The limit is 600 MB.`);
      return;
    }
    if (f.size === 0) {
      setFileError(`“${f.name}” is empty.`);
      return;
    }
    setFileError(null);
    setFile(f);
    setRun(null);
    setProgress(null);
  };

  const startFile = () => {
    if (!file) return;
    stopWorker();
    const id = ++runIdRef.current;
    const key = settingsKey;
    setRun({ key, status: "running" });
    setProgress({ processed: 0, total: file.size, phase: "Starting" });

    let worker: Worker;
    try {
      worker = new Worker(new URL("./workers/json.worker.ts", import.meta.url), { type: "module" });
    } catch {
      setRun({ key, status: "error", message: "Your browser could not start a background worker." });
      setProgress(null);
      return;
    }
    workerRef.current = worker;

    const finishWith = (next: Run) => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
      setProgress(null);
      setRun(next);
    };

    worker.onmessage = (event: MessageEvent<JsonWorkerResponse>) => {
      if (workerRef.current !== worker || runIdRef.current !== id) return;
      const m = event.data;
      if (m.id !== id) return;
      if (m.type === "progress") {
        setProgress({ processed: m.processed, total: m.total, phase: m.phase });
      } else if (m.type === "invalid") {
        finishWith({ key, status: "invalid", error: m.error });
      } else if (m.type === "error") {
        finishWith({ key, status: "error", message: m.message });
      } else {
        worker.terminate();
        workerRef.current = null;
        void (async () => {
          let text: string | null = null;
          if (m.blob && m.size <= INLINE_TEXT_LIMIT) {
            try {
              text = await m.blob.text();
            } catch {
              text = null;
            }
          }
          if (runIdRef.current !== id) return;
          setProgress(null);
          setRun({
            key,
            status: "done",
            result: {
              blob: m.blob,
              size: m.size,
              stats: m.stats,
              strategy: m.strategy,
              text,
              preview: m.preview,
              previewTruncated: m.previewTruncated,
            },
          });
        })();
      }
    };

    worker.onerror = (ev) => {
      if (workerRef.current !== worker || runIdRef.current !== id) return;
      ev.preventDefault();
      finishWith({
        key,
        status: "error",
        message:
          "The background worker stopped unexpectedly. The file is probably too large for this device's memory — try Validate or Minify, or a smaller file.",
      });
    };

    const request: JsonWorkerRequest = { type: "start", id, mode: action, indent, sortKeys: fileSort, file };
    worker.postMessage(request);
  };

  const cancel = () => {
    runIdRef.current++;
    stopWorker();
    setProgress(null);
    setRun({ key: settingsKey, status: "cancelled" });
  };

  const clearFile = () => {
    runIdRef.current++;
    stopWorker();
    setFile(null);
    setRun(null);
    setProgress(null);
    setFileError(null);
  };

  const goToError = () => {
    if (!textResult || textResult.ok) return;
    const el = inputRef.current;
    if (!el) return;
    const idx = indexFromLineCol(input, textResult.error.line, textResult.error.column);
    el.focus();
    el.setSelectionRange(idx, Math.min(input.length, idx + 1));
    const lineHeight = 20;
    el.scrollTop = Math.max(0, (textResult.error.line - 4) * lineHeight);
  };

  const outText =
    tab === "text"
      ? textResult && textResult.ok
        ? textResult.output
        : ""
      : fr
        ? (fr.text ?? fr.preview)
        : "";
  const outTruncated = tab === "file" && !!fr && fr.text === null && fr.previewTruncated;
  const stats = tab === "text" ? (textResult && textResult.ok ? textResult.stats : null) : (fr?.stats ?? null);
  const errorInfo = tab === "text" ? (textResult && !textResult.ok ? textResult.error : null) : active?.status === "invalid" ? (active.error ?? null) : null;

  const treeSource =
    action === "validate"
      ? null
      : tab === "text"
        ? textResult && textResult.ok
          ? textResult.output
          : null
        : (fr?.text ?? null);
  const canTree = !!treeSource && treeSource.length <= TREE_LIMIT;
  const treeValue = useMemo<{ value: unknown } | null>(() => {
    if (view !== "tree" || !canTree || !treeSource) return null;
    try {
      return { value: JSON.parse(stripBom(treeSource)) as unknown };
    } catch {
      return null;
    }
  }, [view, canTree, treeSource]);
  const showTree = view === "tree" && canTree && treeValue !== null;

  const baseName = file ? file.name.replace(/\.[^.]+$/, "") || "data" : "data";
  const suffix = action === "minify" ? "min" : "formatted";

  const downloadOutput = () => {
    if (tab === "text") {
      if (outText) {
        downloadBlob(new Blob([outText], { type: "application/json" }), `${suffix === "min" ? "minified" : "formatted"}.json`);
      }
    } else if (fr?.blob) {
      downloadBlob(fr.blob, `${baseName}.${suffix}.json`);
    }
  };

  const canCopy = tab === "text" ? !!outText : !!fr?.text;
  const canDownload = tab === "text" ? !!outText : !!fr?.blob;
  const pct = progress && progress.total > 0 ? (progress.processed / progress.total) * 100 : 0;
  const sortWarn = sortKeys && action !== "validate" && /\d{16,}/.test(tab === "text" ? input : "");

  return (
    <div className="space-y-6">
      <section className={cardClass} aria-label="JSON settings">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label="Input type"
            value={tab}
            onChange={setTab}
            options={[
              { value: "text", label: "Text" },
              { value: "file", label: "File (up to 600 MB)" },
            ]}
          />
          <Segmented label="Action" value={action} onChange={setAction} options={ACTIONS} />
          <Segmented
            label="Indentation"
            value={indentKey}
            onChange={setIndentKey}
            options={INDENTS}
            disabled={action !== "format"}
          />
          <Checkbox checked={sortKeys} onChange={setSortKeys} disabled={action === "validate"}>
            Sort keys A→Z
          </Checkbox>
        </div>
        {sortKeys && action !== "validate" && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Sorting uses the browser&apos;s JSON parser: duplicate keys collapse and integers above 2^53 may be rounded.
            Files over 40 MB skip sorting and keep their original key order.
            {sortWarn ? " Your text contains very long numbers that could be affected." : ""}
          </p>
        )}
      </section>

      {tab === "file" && (
        <section className={`${cardClass} space-y-4`} aria-label="File processing">
          <Dropzone
            file={file}
            onFile={handleFile}
            disabled={running}
            hint="JSON, NDJSON-style or any text file · up to 600 MB · streamed in a background worker"
          />
          {fileError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {fileError}
            </p>
          )}
          {file && (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Strategy:{" "}
              {fileSort
                ? "full parse in memory (needed for sorting keys)"
                : "streaming — the file is checked and rewritten slice by slice and never fully parsed"}
              .
              {file.size > FULL_PARSE_LIMIT && sortKeys && action !== "validate"
                ? " Key sorting is skipped because this file is over 40 MB."
                : ""}
            </p>
          )}
          {file && action === "format" && file.size > 150 * 1024 * 1024 && !running && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Pretty-printing can make a file several times larger and the result must fit in browser memory. For
              very large files, Validate or Minify is safer.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primaryButtonClass} onClick={startFile} disabled={!file || running}>
              {action === "format" ? "Format file" : action === "minify" ? "Minify file" : "Validate file"}
            </button>
            {running && (
              <button type="button" className={buttonClass} onClick={cancel}>
                Cancel
              </button>
            )}
            {file && !running && (
              <button type="button" className={buttonClass} onClick={clearFile}>
                Clear
              </button>
            )}
          </div>
          {running && progress && (
            <div aria-live="polite">
              <ProgressBar
                value={progress.phase === "Parsing" || progress.phase === "Sorting keys" ? null : pct}
                label={`${progress.phase}… ${formatBytes(progress.processed)} of ${formatBytes(progress.total)}`}
              />
            </div>
          )}
          {active?.status === "cancelled" && (
            <p className="text-sm text-slate-600 dark:text-slate-400">Cancelled. Nothing was kept in memory.</p>
          )}
          {active?.status === "error" && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {active.message}
            </p>
          )}
        </section>
      )}

      <section className={`grid gap-4 ${tab === "text" ? "lg:grid-cols-2" : ""}`} aria-label="JSON workspace">
        {tab === "text" && (
          <div className={cardClass}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label htmlFor="json-input" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                JSON input
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-400">{input.length.toLocaleString()} chars</span>
            </div>
            <textarea
              id="json-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              placeholder='Paste JSON here, e.g. {"hello":"world"}'
              className={`${textareaClass} h-96 resize-y leading-5`}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={buttonClass} onClick={() => setInput(SAMPLE)}>
                Load sample
              </button>
              <button type="button" className={buttonClass} onClick={() => setInput("")} disabled={!input}>
                Clear
              </button>
            </div>
            {tooLarge && (
              <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
                That is more than {MAX_TEXT_CHARS.toLocaleString()} characters. Save it as a file and use file mode,
                which streams in a background worker.
              </p>
            )}
          </div>
        )}

        <div className={`${cardClass} space-y-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {action === "validate" ? "Validation" : "Result"}
            </h2>
            {action !== "validate" && (
              <div className="flex flex-wrap items-center gap-2">
                <Segmented
                  label="Result view"
                  value={showTree ? "tree" : "text"}
                  onChange={setView}
                  options={[
                    { value: "text", label: "Text" },
                    { value: "tree", label: "Tree" },
                  ]}
                  disabled={!canTree}
                />
                {showTree && (
                  <>
                    <button
                      type="button"
                      className={buttonClass}
                      onClick={() => {
                        setOpenDepth(Infinity);
                        setTreeGen((g) => g + 1);
                      }}
                    >
                      Expand all
                    </button>
                    <button
                      type="button"
                      className={buttonClass}
                      onClick={() => {
                        setOpenDepth(1);
                        setTreeGen((g) => g + 1);
                      }}
                    >
                      Collapse all
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {errorInfo && <ErrorBox error={errorInfo} onGo={tab === "text" ? goToError : undefined} />}
          {!errorInfo && stats && (
            <StatsBar
              stats={stats}
              extra={
                tab === "file" && fr
                  ? fr.strategy === "full"
                    ? "full parse"
                    : "streamed"
                  : textResult && textResult.ok && textResult.sorted
                    ? "keys sorted"
                    : undefined
              }
            />
          )}
          {!errorInfo && !stats && !running && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {tab === "text"
                ? "Paste JSON on the left — the result and any error location appear instantly."
                : "Choose a file and press the action button. Nothing leaves your device."}
            </p>
          )}

          {action !== "validate" && !errorInfo && stats && (
            <>
              {showTree && treeValue ? (
                <div className="max-h-[28rem] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-950">
                  <TreeNode key={treeGen} value={treeValue.value} depth={0} openDepth={openDepth} label="root" />
                </div>
              ) : (
                <>
                  <label htmlFor="json-output" className="sr-only">
                    Formatted output
                  </label>
                  <textarea
                    id="json-output"
                    readOnly
                    value={outText}
                    spellCheck={false}
                    className={`${textareaClass} h-96 resize-y leading-5`}
                  />
                </>
              )}
              {!canTree && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tree view is available when the result is under 1 MB.
                </p>
              )}
              {outTruncated && fr && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Showing the first 20,000 characters only. The full {formatBytes(fr.size)} result is ready to download.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" className={primaryButtonClass} disabled={!canDownload} onClick={downloadOutput}>
                  Download{tab === "file" && fr?.blob ? ` (${formatBytes(fr.size)})` : ""}
                </button>
                <button
                  type="button"
                  className={buttonClass}
                  disabled={!canCopy}
                  title={!canCopy && tab === "file" ? "Results above 5 MB can only be downloaded" : undefined}
                  onClick={() => void copy(tab === "text" ? outText : (fr?.text ?? ""))}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default JsonFormatterTool;
