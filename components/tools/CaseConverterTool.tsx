"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import {
  CASE_MODES,
  CHUNK_CHARS,
  MAX_TEXT_BYTES,
  convertText,
  countStats,
} from "@/lib/tools/case-core";
import type { CaseMode, CaseOptions } from "@/lib/tools/case-core";

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

function formatMB(bytes: number): string {
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function CaseConverterTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<CaseMode>("sentence");
  const [keepAcronyms, setKeepAcronyms] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);

  const runRef = useRef(0);
  const dragDepth = useRef(0);
  const copyTimer = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const options = useMemo<CaseOptions>(() => ({ keepAcronyms }), [keepAcronyms]);

  useEffect(() => {
    const run = runRef.current + 1;
    runRef.current = run;

    if (input === "") {
      setOutput("");
      setProgress(null);
      return;
    }

    const timer = window.setTimeout(
      async () => {
        try {
          const result = await convertText(
            mode,
            input,
            options,
            (fraction) => {
              if (runRef.current === run) setProgress(fraction);
            },
            () => runRef.current !== run,
          );
          if (runRef.current !== run || result === null) return;
          setOutput(result);
          setProgress(null);
          setError(null);
        } catch (err) {
          if (runRef.current !== run) return;
          setProgress(null);
          setError(err instanceof Error ? err.message : "Conversion failed.");
        }
      },
      input.length > CHUNK_CHARS ? 200 : 0,
    );

    return () => {
      window.clearTimeout(timer);
      runRef.current += 1;
    };
  }, [input, mode, options]);

  useEffect(() => {
    return () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    };
  }, []);

  const loadFile = useCallback(async (file: File) => {
    setError(null);
    if (file.size > MAX_TEXT_BYTES) {
      setError(
        `${file.name} is ${formatMB(file.size)}. The limit is ${formatMB(MAX_TEXT_BYTES)} for text files.`,
      );
      return;
    }
    try {
      const text = await file.text();
      if (text.slice(0, 2000).includes("\u0000")) {
        setError(`${file.name} looks like a binary file, not plain text.`);
        return;
      }
      setInput(text);
      setFileName(file.name);
    } catch {
      setError(`Could not read ${file.name}.`);
    }
  }, []);

  const onDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  };
  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void loadFile(file);
  };

  const copyOutput = useCallback(async () => {
    if (output === "") return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(output);
      ok = true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = output;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        ta.remove();
      } catch {
        ok = false;
      }
    }
    if (!ok) {
      setError("Copy failed. Select the output text and copy it manually.");
      return;
    }
    setCopied(true);
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
  }, [output]);

  const downloadOutput = useCallback(() => {
    if (output === "") return;
    const base = fileName ? fileName.replace(/\.[^.]+$/, "") : "converted";
    saveText(output, `${base}-${mode}.txt`);
  }, [output, fileName, mode]);

  const useOutputAsInput = useCallback(() => {
    if (output === "") return;
    setInput(output);
  }, [output]);

  const clearAll = useCallback(() => {
    setInput("");
    setOutput("");
    setFileName(null);
    setError(null);
    setProgress(null);
  }, []);

  const inStats = useMemo(() => countStats(input), [input]);
  const showAcronymOption = mode === "title" || mode === "capitalize";

  const renderModes = (group: "writing" | "developer") => (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {CASE_MODES.filter((m) => m.group === group).map((m) => {
        const active = m.mode === mode;
        return (
          <button
            key={m.mode}
            type="button"
            aria-pressed={active}
            onClick={() => setMode(m.mode)}
            className={`rounded-xl border px-3 py-2 text-left transition-colors ${
              active
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-200 bg-white text-slate-800 hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            }`}
          >
            <span className="block text-sm font-semibold">{m.label}</span>
            <span
              className={`block truncate text-xs ${
                active ? "text-brand-100" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {m.example}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="card space-y-4 p-5">
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Writing cases
          </p>
          {renderModes("writing")}
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Developer cases (each line converted separately)
          </p>
          {renderModes("developer")}
        </div>
        {showAcronymOption && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={keepAcronyms}
              onChange={(e) => setKeepAcronyms(e.target.checked)}
              className="h-4 w-4 accent-brand-600"
            />
            Keep acronyms and mixed-case words as typed (NASA, iPhone)
          </label>
        )}
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
        <div
          className={`card relative space-y-3 p-5 ${
            dragging ? "ring-2 ring-brand-500" : ""
          }`}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="case-input"
              className="text-sm font-semibold text-slate-900 dark:text-slate-100"
            >
              Your text
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                Open .txt file
              </button>
              <button type="button" className="btn-ghost" onClick={clearAll}>
                Clear
              </button>
            </div>
          </div>
          <textarea
            id="case-input"
            className="input min-h-[260px] w-full font-mono text-sm"
            placeholder="Type or paste text here, or drop a text file onto this box…"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setFileName(null);
            }}
            spellCheck={false}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.csv,.json,.html,.xml,.log,.js,.ts,.css,text/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void loadFile(file);
              e.target.value = "";
            }}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
            {inStats.chars.toLocaleString()} characters · {inStats.words.toLocaleString()} words ·{" "}
            {inStats.lines.toLocaleString()} lines
            {fileName ? ` · loaded ${fileName}` : ""}
          </p>
        </div>

        <div className="card space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="case-output"
              className="text-sm font-semibold text-slate-900 dark:text-slate-100"
            >
              Result
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                disabled={output === ""}
                onClick={copyOutput}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={output === ""}
                onClick={downloadOutput}
              >
                Download .txt
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={output === ""}
                onClick={useOutputAsInput}
              >
                Use as input
              </button>
            </div>
          </div>
          <textarea
            id="case-output"
            className="input min-h-[260px] w-full font-mono text-sm"
            value={output}
            readOnly
            placeholder="Your converted text appears here instantly."
            spellCheck={false}
          />
          {progress !== null && (
            <div
              role="progressbar"
              aria-label="Conversion progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
            >
              <div
                className="h-full rounded-full bg-brand-600 transition-[width] duration-200"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {output.length.toLocaleString()} characters in the result. Text never leaves your
            browser.
          </p>
        </div>
      </div>
    </div>
  );
}
