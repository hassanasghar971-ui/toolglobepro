"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { MAX_TEXT_BYTES, runDiff, toUnifiedDiff } from "@/lib/tools/diff-core";
import type {
  DiffMode,
  DiffOptions,
  DiffResult,
  DiffWorkerRequest,
  DiffWorkerResponse,
  LineRow,
} from "@/lib/tools/diff-core";

interface Side {
  text: string;
  fileName: string | null;
  big: boolean;
}

interface DisplayRow {
  kind: "row";
  row: LineRow;
  index: number;
}
interface DisplayGap {
  kind: "gap";
  start: number;
  count: number;
}
type DisplayItem = DisplayRow | DisplayGap;

type SplitItem =
  | { kind: "gap"; start: number; count: number }
  | { kind: "pair"; left: LineRow | null; right: LineRow | null; key: number };

const EMPTY: Side = { text: "", fileName: null, big: false };
const BIG_FILE_CHARS = 1_000_000;
const MAX_RENDER_ITEMS = 2500;
const MAX_RENDER_SEGMENTS = 20000;

const MODES: { value: DiffMode; label: string; hint: string }[] = [
  { value: "lines", label: "Lines", hint: "Best for code, logs and data" },
  { value: "words", label: "Words", hint: "Best for prose" },
  { value: "chars", label: "Characters", hint: "Best for IDs, URLs and typos" },
];

const CONTEXTS: { value: number; label: string }[] = [
  { value: 0, label: "Changes only" },
  { value: 3, label: "3 lines of context" },
  { value: 10, label: "10 lines of context" },
  { value: -1, label: "Show everything" },
];

function saveText(text: string, name: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function rowBackground(type: LineRow["type"]): string {
  if (type === "insert") return "bg-emerald-50 dark:bg-emerald-950/40";
  if (type === "delete") return "bg-red-50 dark:bg-red-950/40";
  return "";
}

function rowSign(type: LineRow["type"]): string {
  if (type === "insert") return "+";
  if (type === "delete") return "−";
  return " ";
}

function RowText({ row }: { row: LineRow }) {
  if (row.inline) {
    return (
      <>
        {row.inline.map((seg, i) =>
          seg.type === "equal" ? (
            <span key={i}>{seg.text}</span>
          ) : (
            <mark
              key={i}
              className={
                seg.type === "delete"
                  ? "rounded-sm bg-red-300/70 text-inherit dark:bg-red-700/60"
                  : "rounded-sm bg-emerald-300/70 text-inherit dark:bg-emerald-700/60"
              }
            >
              {seg.text}
            </mark>
          ),
        )}
      </>
    );
  }
  return <>{row.text === "" ? "\u00a0" : row.text}</>;
}

function pairItems(items: DisplayItem[]): SplitItem[] {
  const out: SplitItem[] = [];
  let i = 0;
  while (i < items.length) {
    const item = items[i];
    if (item.kind === "gap") {
      out.push({ kind: "gap", start: item.start, count: item.count });
      i += 1;
      continue;
    }
    if (item.row.type === "equal") {
      out.push({ kind: "pair", left: item.row, right: item.row, key: item.index });
      i += 1;
      continue;
    }
    const dels: DisplayRow[] = [];
    const ins: DisplayRow[] = [];
    while (i < items.length) {
      const x = items[i];
      if (x.kind === "row" && x.row.type === "delete") {
        dels.push(x);
        i += 1;
      } else break;
    }
    while (i < items.length) {
      const x = items[i];
      if (x.kind === "row" && x.row.type === "insert") {
        ins.push(x);
        i += 1;
      } else break;
    }
    const len = Math.max(dels.length, ins.length);
    for (let p = 0; p < len; p++) {
      const l = p < dels.length ? dels[p] : null;
      const r = p < ins.length ? ins[p] : null;
      const base = l ?? r;
      if (!base) continue;
      out.push({
        kind: "pair",
        left: l ? l.row : null,
        right: r ? r.row : null,
        key: base.index,
      });
    }
  }
  return out;
}

interface SidePanelProps {
  id: string;
  label: string;
  side: Side;
  onChange: (side: Side) => void;
  onError: (message: string | null) => void;
}

function SidePanel({ id, label, side, onChange, onError }: SidePanelProps) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const text = side.text;
    if (text === "") return { chars: 0, lines: 0 };
    let newlines = 0;
    for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) newlines += 1;
    return { chars: text.length, lines: newlines + (text.endsWith("\n") ? 0 : 1) };
  }, [side.text]);

  const loadFile = useCallback(
    async (file: File) => {
      onError(null);
      if (file.size > MAX_TEXT_BYTES) {
        onError(
          `${file.name} is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${Math.round(
            MAX_TEXT_BYTES / 1048576,
          )} MB per side.`,
        );
        return;
      }
      try {
        const text = await file.text();
        if (text.slice(0, 2000).includes("\u0000")) {
          onError(`${file.name} looks like a binary file, not plain text.`);
          return;
        }
        onChange({ text, fileName: file.name, big: text.length > BIG_FILE_CHARS });
      } catch {
        onError(`Could not read ${file.name}.`);
      }
    },
    [onChange, onError],
  );

  const onDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    depth.current += 1;
    setDragging(true);
  };
  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDragging(false);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    depth.current = 0;
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void loadFile(file);
  };

  return (
    <div
      className={`card space-y-3 p-5 ${dragging ? "ring-2 ring-brand-500" : ""}`}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {label}
        </label>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()}>
            Open file
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={side.text === ""}
            onClick={() => onChange(EMPTY)}
          >
            Clear
          </button>
        </div>
      </div>
      <textarea
        id={id}
        className="input min-h-[220px] w-full font-mono text-sm"
        value={side.big ? "" : side.text}
        readOnly={side.big}
        spellCheck={false}
        placeholder={
          side.big
            ? `Large file loaded: ${side.fileName ?? "file"}. It is compared without being shown here. Press Clear to type instead.`
            : "Paste text here, or drop a text file onto this box…"
        }
        onChange={(e) => onChange({ text: e.target.value, fileName: null, big: false })}
      />
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".txt,.md,.csv,.json,.html,.xml,.log,.js,.ts,.tsx,.jsx,.css,.yml,.yaml,.ini,.env,.sql,.py,.java,.c,.cpp,.go,.rs,text/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void loadFile(file);
          e.target.value = "";
        }}
      />
      <p className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
        {stats.chars.toLocaleString()} characters · {stats.lines.toLocaleString()} lines
        {side.fileName ? ` · ${side.fileName}` : ""}
      </p>
    </div>
  );
}

export default function TextDiffCheckerTool() {
  const [a, setA] = useState<Side>(EMPTY);
  const [b, setB] = useState<Side>(EMPTY);
  const [mode, setMode] = useState<DiffMode>("lines");
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [view, setView] = useState<"unified" | "split">("unified");
  const [context, setContext] = useState(3);
  const [result, setResult] = useState<DiffResult | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [copied, setCopied] = useState(false);

  const runRef = useRef(0);
  const workerRef = useRef<Worker | null>(null);
  const copyTimer = useRef<number | null>(null);

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  const startDiff = useCallback(
    (aText: string, bText: string, options: DiffOptions, run: number) => {
      terminateWorker();
      setRunning(true);
      setError(null);
      setProgress(0.03);
      setStage("Preparing");

      const finish = (res: DiffResult | null, message: string | null) => {
        if (runRef.current !== run) return;
        setRunning(false);
        setProgress(0);
        if (res) {
          setResult(res);
          setExpanded(new Set());
          setError(null);
        } else {
          setResult(null);
          setError(message ?? "The comparison failed.");
        }
      };

      let worker: Worker | null = null;
      try {
        worker = new Worker(new URL("./workers/diff.worker.ts", import.meta.url), {
          type: "module",
        });
      } catch {
        worker = null;
      }

      if (!worker) {
        window.setTimeout(() => {
          if (runRef.current !== run) return;
          try {
            finish(runDiff(aText, bText, options), null);
          } catch (err) {
            finish(null, err instanceof Error ? err.message : "The comparison failed.");
          }
        }, 20);
        return;
      }

      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<DiffWorkerResponse>) => {
        const msg = event.data;
        if (msg.id !== run || runRef.current !== run) return;
        if (msg.type === "progress") {
          setStage(msg.stage);
          setProgress(msg.fraction);
          return;
        }
        terminateWorker();
        if (msg.type === "done") finish(msg.result, null);
        else finish(null, msg.message);
      };
      worker.onerror = (event: ErrorEvent) => {
        event.preventDefault();
        if (runRef.current !== run) return;
        terminateWorker();
        finish(
          null,
          "The comparison worker crashed. The files are probably too large for this device's memory.",
        );
      };
      const request: DiffWorkerRequest = { id: run, a: aText, b: bText, options };
      try {
        worker.postMessage(request);
      } catch {
        terminateWorker();
        finish(null, "Could not start the comparison worker.");
      }
    },
    [terminateWorker],
  );

  useEffect(() => {
    runRef.current += 1;
    const run = runRef.current;
    terminateWorker();

    if (a.text === "" && b.text === "") {
      setResult(null);
      setRunning(false);
      setError(null);
      return;
    }

    const options: DiffOptions = { mode, ignoreCase, ignoreWhitespace };
    const delay = a.text.length + b.text.length > 200_000 ? 600 : 250;
    const timer = window.setTimeout(() => startDiff(a.text, b.text, options, run), delay);
    return () => {
      window.clearTimeout(timer);
    };
  }, [a.text, b.text, mode, ignoreCase, ignoreWhitespace, startDiff, terminateWorker]);

  useEffect(() => {
    return () => {
      runRef.current += 1;
      terminateWorker();
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    };
  }, [terminateWorker]);

  const items = useMemo<DisplayItem[]>(() => {
    if (!result || result.mode !== "lines") return [];
    const rows = result.rows;
    const n = rows.length;
    if (context < 0) {
      return rows.map((row, index): DisplayItem => ({ kind: "row", row, index }));
    }
    const visible = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      if (rows[i].type === "equal") continue;
      const s = Math.max(0, i - context);
      const e = Math.min(n - 1, i + context);
      for (let j = s; j <= e; j++) visible[j] = 1;
    }
    const out: DisplayItem[] = [];
    let i = 0;
    while (i < n) {
      if (visible[i]) {
        out.push({ kind: "row", row: rows[i], index: i });
        i += 1;
        continue;
      }
      let j = i;
      while (j < n && !visible[j]) j += 1;
      if (expanded.has(i)) {
        for (let k = i; k < j; k++) out.push({ kind: "row", row: rows[k], index: k });
      } else {
        out.push({ kind: "gap", start: i, count: j - i });
      }
      i = j;
    }
    return out;
  }, [result, context, expanded]);

  const shown = useMemo(() => items.slice(0, MAX_RENDER_ITEMS), [items]);
  const truncated = items.length > MAX_RENDER_ITEMS;
  const splitItems = useMemo(
    () => (view === "split" ? pairItems(shown) : []),
    [view, shown],
  );

  const expandGap = (start: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.add(start);
      return next;
    });
  };

  const patchNames = useMemo(
    () => ({ a: a.fileName ?? "original.txt", b: b.fileName ?? "modified.txt" }),
    [a.fileName, b.fileName],
  );

  const copyPatch = useCallback(async () => {
    if (!result || result.mode !== "lines" || result.identical) return;
    const patch = toUnifiedDiff(result.rows, `a/${patchNames.a}`, `b/${patchNames.b}`, 3);
    const ok = await copyText(patch);
    if (!ok) {
      setError("Copy failed. Use Download .diff instead.");
      return;
    }
    setCopied(true);
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
  }, [result, patchNames]);

  const downloadPatch = useCallback(() => {
    if (!result || result.mode !== "lines" || result.identical) return;
    saveText(toUnifiedDiff(result.rows, `a/${patchNames.a}`, `b/${patchNames.b}`, 3), "changes.diff");
  }, [result, patchNames]);

  const swapSides = () => {
    setA(b);
    setB(a);
  };

  const clearAll = () => {
    setA(EMPTY);
    setB(EMPTY);
    setError(null);
  };

  const canPatch = result !== null && result.mode === "lines" && !result.identical;
  const unitLabel = result ? result.stats.unit : "lines";

  return (
    <div className="space-y-6">
      <div className="card space-y-4 p-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Compare by
            </p>
            <div role="group" aria-label="Comparison mode" className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={mode === m.value}
                  title={m.hint}
                  onClick={() => setMode(m.value)}
                  className={mode === m.value ? "btn-primary" : "btn-secondary"}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {MODES.find((m) => m.value === mode)?.hint}
            </p>
          </div>

          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={ignoreCase}
                onChange={(e) => setIgnoreCase(e.target.checked)}
                className="h-4 w-4 accent-brand-600"
              />
              Ignore upper/lower case
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={ignoreWhitespace}
                onChange={(e) => setIgnoreWhitespace(e.target.checked)}
                className="h-4 w-4 accent-brand-600"
              />
              Ignore extra spaces and indentation
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={swapSides}>
            Swap sides
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={a.text === "" && b.text === ""}
            onClick={clearAll}
          >
            Clear both
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          <p>{error}</p>
          <button type="button" className="btn-ghost" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <SidePanel
          id="diff-a"
          label="Original text"
          side={a}
          onChange={setA}
          onError={setError}
        />
        <SidePanel
          id="diff-b"
          label="Changed text"
          side={b}
          onChange={setB}
          onError={setError}
        />
      </div>

      {running && (
        <div className="card space-y-2 p-4">
          <p className="text-sm text-slate-700 dark:text-slate-300" aria-live="polite">
            {stage || "Working"}…
          </p>
          <div
            role="progressbar"
            aria-label="Comparison progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
          >
            <div
              className="h-full rounded-full bg-brand-600 transition-[width] duration-200"
              style={{ width: `${Math.max(3, Math.round(progress * 100))}%` }}
            />
          </div>
        </div>
      )}

      {result && !running && (
        <div className="card space-y-4 p-5">
          {result.identical ? (
            <p className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              No differences found with the current settings.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-sm" aria-live="polite">
                  <span className="chip">
                    +{result.stats.added.toLocaleString()} added {unitLabel}
                  </span>
                  <span className="chip">
                    −{result.stats.removed.toLocaleString()} removed {unitLabel}
                  </span>
                  <span className="chip">
                    {result.stats.unchanged.toLocaleString()} unchanged
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.mode === "lines" && (
                    <>
                      <div role="group" aria-label="View" className="flex gap-2">
                        <button
                          type="button"
                          aria-pressed={view === "unified"}
                          className={view === "unified" ? "btn-primary" : "btn-secondary"}
                          onClick={() => setView("unified")}
                        >
                          Unified
                        </button>
                        <button
                          type="button"
                          aria-pressed={view === "split"}
                          className={view === "split" ? "btn-primary" : "btn-secondary"}
                          onClick={() => setView("split")}
                        >
                          Side by side
                        </button>
                      </div>
                      <select
                        aria-label="Unchanged lines to show"
                        className="input w-auto"
                        value={context}
                        onChange={(e) => setContext(Number(e.target.value))}
                      >
                        {CONTEXTS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={!canPatch}
                    onClick={copyPatch}
                  >
                    {copied ? "Copied!" : "Copy diff"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={!canPatch}
                    onClick={downloadPatch}
                  >
                    Download .diff
                  </button>
                </div>
              </div>

              {result.approximate && (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  These texts are very different, so part of the comparison is shown as one replaced
                  block instead of a fine-grained diff. Compare smaller sections for detail.
                </p>
              )}

              {result.mode !== "lines" && (
                <div className="max-h-[560px] overflow-auto rounded-xl border border-slate-200 p-4 font-mono text-sm leading-6 whitespace-pre-wrap break-words dark:border-slate-700">
                  {result.segments.slice(0, MAX_RENDER_SEGMENTS).map((seg, i) =>
                    seg.type === "equal" ? (
                      <span key={i}>{seg.text}</span>
                    ) : seg.type === "delete" ? (
                      <del
                        key={i}
                        className="rounded-sm bg-red-200 text-red-900 dark:bg-red-900/60 dark:text-red-100"
                      >
                        {seg.text}
                      </del>
                    ) : (
                      <ins
                        key={i}
                        className="rounded-sm bg-emerald-200 text-emerald-900 no-underline dark:bg-emerald-900/60 dark:text-emerald-100"
                      >
                        {seg.text}
                      </ins>
                    ),
                  )}
                  {result.segments.length > MAX_RENDER_SEGMENTS && (
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      Showing the first {MAX_RENDER_SEGMENTS.toLocaleString()} segments. Use line
                      mode for the full comparison.
                    </p>
                  )}
                </div>
              )}

              {result.mode === "lines" && view === "unified" && (
                <div className="max-h-[640px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  {shown.map((item) =>
                    item.kind === "gap" ? (
                      <button
                        key={`gap-${item.start}`}
                        type="button"
                        onClick={() => expandGap(item.start)}
                        className="block w-full bg-slate-100 px-3 py-1 text-left text-xs text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        ▸ Show {item.count.toLocaleString()} unchanged line
                        {item.count === 1 ? "" : "s"}
                      </button>
                    ) : (
                      <div
                        key={item.index}
                        className={`flex font-mono text-xs leading-5 ${rowBackground(item.row.type)}`}
                      >
                        <span className="w-12 shrink-0 select-none px-2 text-right text-slate-400">
                          {item.row.aNo ?? ""}
                        </span>
                        <span className="w-12 shrink-0 select-none px-2 text-right text-slate-400">
                          {item.row.bNo ?? ""}
                        </span>
                        <span className="w-5 shrink-0 select-none text-center text-slate-500">
                          {rowSign(item.row.type)}
                        </span>
                        <span className="min-w-0 flex-1 pr-2 whitespace-pre-wrap break-words">
                          <RowText row={item.row} />
                        </span>
                      </div>
                    ),
                  )}
                </div>
              )}

              {result.mode === "lines" && view === "split" && (
                <div className="max-h-[640px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  {splitItems.map((item) =>
                    item.kind === "gap" ? (
                      <button
                        key={`gap-${item.start}`}
                        type="button"
                        onClick={() => expandGap(item.start)}
                        className="block w-full bg-slate-100 px-3 py-1 text-left text-xs text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        ▸ Show {item.count.toLocaleString()} unchanged line
                        {item.count === 1 ? "" : "s"}
                      </button>
                    ) : (
                      <div key={item.key} className="grid grid-cols-2 font-mono text-xs leading-5">
                        <div
                          className={`flex border-r border-slate-200 dark:border-slate-700 ${
                            item.left ? rowBackground(item.left.type) : "bg-slate-50 dark:bg-slate-900"
                          }`}
                        >
                          <span className="w-10 shrink-0 select-none px-2 text-right text-slate-400">
                            {item.left?.aNo ?? ""}
                          </span>
                          <span className="min-w-0 flex-1 pr-2 whitespace-pre-wrap break-words">
                            {item.left ? <RowText row={item.left} /> : "\u00a0"}
                          </span>
                        </div>
                        <div
                          className={`flex ${
                            item.right ? rowBackground(item.right.type) : "bg-slate-50 dark:bg-slate-900"
                          }`}
                        >
                          <span className="w-10 shrink-0 select-none px-2 text-right text-slate-400">
                            {item.right?.bNo ?? ""}
                          </span>
                          <span className="min-w-0 flex-1 pr-2 whitespace-pre-wrap break-words">
                            {item.right ? <RowText row={item.right} /> : "\u00a0"}
                          </span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}

              {result.mode === "lines" && truncated && (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Showing the first {MAX_RENDER_ITEMS.toLocaleString()} blocks. Download the .diff
                  file to see every change.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
