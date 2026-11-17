"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  ALGORITHMS,
  MAX_FILE_BYTES,
  MAX_TEXT_CHARS,
  formatDigest,
  hashText,
  matchDigest,
  selfTest,
  type DigestFormat,
  type HashAlgo,
  type HashWorkerRequest,
  type HashWorkerResponse,
} from "@/lib/tools/hash-core";
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

interface Run {
  key: string;
  status: "running" | "done" | "error" | "cancelled";
  error?: string;
  hashes?: Partial<Record<HashAlgo, string>>;
  bytes?: number;
  ms?: number;
}

const ALL: HashAlgo[] = ALGORITHMS.map((a) => a.value);

const FORMATS: { value: DigestFormat; label: string }[] = [
  { value: "hex", label: "hex" },
  { value: "HEX", label: "HEX" },
  { value: "base64", label: "Base64" },
];

export function HashGeneratorTool() {
  const [tab, setTab] = useState<"text" | "file">("text");
  const [algos, setAlgos] = useState<HashAlgo[]>(ALL);
  const [format, setFormat] = useState<DigestFormat>("hex");
  const [input, setInput] = useState("");
  const [expected, setExpected] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [progress, setProgress] = useState<{ processed: number; total: number; elapsed: number } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selfOk, setSelfOk] = useState<boolean | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const runIdRef = useRef(0);
  const startedRef = useRef(0);
  const { copied, copy } = useCopy();
  const deferred = useDeferredValue(input);

  useEffect(() => {
    setSelfOk(selfTest());
  }, []);

  const tooLarge = input.length > MAX_TEXT_CHARS;

  const textHashes = useMemo(() => {
    if (tab !== "text" || deferred === "" || deferred.length > MAX_TEXT_CHARS) return null;
    return hashText(algos, deferred);
  }, [tab, deferred, algos]);

  const settingsKey = `${algos.join(",")}|${file?.name}|${file?.size}|${file?.lastModified}`;
  const active = run && (run.status === "running" || run.key === settingsKey) ? run : null;
  const running = run?.status === "running";

  const hashes = tab === "text" ? textHashes : active?.status === "done" ? (active.hashes ?? null) : null;

  const rows = useMemo(
    () =>
      hashes
        ? ALGORITHMS.filter((a) => algos.includes(a.value) && hashes[a.value]).map((a) => ({
            algo: a,
            hex: hashes[a.value] as string,
          }))
        : [],
    [hashes, algos],
  );

  const matched = useMemo(
    () => (expected.trim() && rows.length > 0 ? matchDigest(expected, rows.map((r) => ({ algo: r.algo.value, hex: r.hex }))) : undefined),
    [expected, rows],
  );

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

  const toggleAlgo = (a: HashAlgo, on: boolean) => {
    setAlgos((prev) => (on ? ALL.filter((v) => v === a || prev.includes(v)) : prev.filter((v) => v !== a)));
  };

  const handleFile = (f: File) => {
    if (f.size > MAX_FILE_BYTES) {
      setFileError(`“${f.name}” is ${formatBytes(f.size)}. The limit is 600 MB.`);
      return;
    }
    setFileError(null);
    setFile(f);
    setRun(null);
    setProgress(null);
  };

  const startFile = () => {
    if (!file || algos.length === 0) return;
    stopWorker();
    const id = ++runIdRef.current;
    const key = settingsKey;
    setRun({ key, status: "running" });
    setProgress({ processed: 0, total: file.size, elapsed: 0 });
    startedRef.current = performance.now();

    let worker: Worker;
    try {
      worker = new Worker(new URL("./workers/hash.worker.ts", import.meta.url), { type: "module" });
    } catch {
      setRun({ key, status: "error", error: "Your browser could not start a background worker." });
      setProgress(null);
      return;
    }
    workerRef.current = worker;

    const finish = (next: Run) => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
      setProgress(null);
      setRun(next);
    };

    worker.onmessage = (event: MessageEvent<HashWorkerResponse>) => {
      if (workerRef.current !== worker || runIdRef.current !== id) return;
      const m = event.data;
      if (m.id !== id) return;
      if (m.type === "progress") {
        setProgress({ processed: m.processed, total: m.total, elapsed: performance.now() - startedRef.current });
      } else if (m.type === "done") {
        finish({ key, status: "done", hashes: m.hashes, bytes: m.bytes, ms: m.ms });
      } else {
        finish({ key, status: "error", error: m.message });
      }
    };

    worker.onerror = (ev) => {
      if (workerRef.current !== worker || runIdRef.current !== id) return;
      ev.preventDefault();
      finish({
        key,
        status: "error",
        error: "The background worker stopped unexpectedly. Try a smaller file or fewer algorithms.",
      });
    };

    const request: HashWorkerRequest = { type: "start", id, algos, file };
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

  const downloadChecksums = () => {
    if (rows.length === 0) return;
    const name = tab === "file" && file ? file.name : "text input";
    const lines = rows.map((r) => `${r.algo.label.replace("-", "")} (${name}) = ${formatDigest(r.hex, format)}`);
    downloadBlob(
      new Blob([`${lines.join("\n")}\n`], { type: "text/plain;charset=utf-8" }),
      tab === "file" && file ? `${file.name}.checksums.txt` : "hashes.txt",
    );
  };

  const copyAll = () => {
    const lines = rows.map((r) => `${r.algo.label}: ${formatDigest(r.hex, format)}`);
    void copy(lines.join("\n")).then((ok) => {
      if (ok) setCopiedKey("all");
    });
  };

  const pct = progress && progress.total > 0 ? (progress.processed / progress.total) * 100 : 0;
  const speed =
    progress && progress.elapsed > 500 ? `${formatBytes((progress.processed / progress.elapsed) * 1000)}/s` : "";

  return (
    <div className="space-y-6">
      {selfOk === false && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          The built-in self-test failed in this browser, so results may be wrong. Please try a current version of
          Chrome, Edge, Firefox or Safari.
        </p>
      )}

      <section className={cardClass} aria-label="Hash settings">
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
          <Segmented label="Output format" value={format} onChange={setFormat} options={FORMATS} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          {ALGORITHMS.map((a) => (
            <Checkbox
              key={a.value}
              checked={algos.includes(a.value)}
              onChange={(on) => toggleAlgo(a.value, on)}
              disabled={running}
            >
              {a.label}
              {a.weak ? <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">(not for security)</span> : null}
            </Checkbox>
          ))}
        </div>
        {algos.length === 0 && (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">Select at least one algorithm.</p>
        )}
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Fewer algorithms means faster hashing of big files. Text is hashed as UTF-8.
        </p>
      </section>

      {tab === "text" ? (
        <section className={cardClass} aria-label="Text input">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label htmlFor="hash-input" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Text to hash
            </label>
            <span className="text-xs text-slate-500 dark:text-slate-400">{input.length.toLocaleString()} chars</span>
          </div>
          <textarea
            id="hash-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder="Type or paste text — hashes update instantly…"
            className={`${textareaClass} h-40 resize-y`}
          />
          <div className="mt-3 flex flex-wrap gap-2">
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
        </section>
      ) : (
        <section className={`${cardClass} space-y-4`} aria-label="File input">
          <Dropzone
            file={file}
            onFile={handleFile}
            disabled={running}
            hint="Any file type · up to 600 MB · hashed locally in a background worker"
          />
          {fileError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {fileError}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryButtonClass}
              onClick={startFile}
              disabled={!file || running || algos.length === 0}
            >
              Calculate hashes
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
                value={pct}
                label={`Hashing… ${formatBytes(progress.processed)} of ${formatBytes(progress.total)}${speed ? ` · ${speed}` : ""}`}
              />
            </div>
          )}
          {active?.status === "cancelled" && (
            <p className="text-sm text-slate-600 dark:text-slate-400">Cancelled.</p>
          )}
          {active?.status === "error" && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {active.error}
            </p>
          )}
          {active?.status === "done" && active.bytes !== undefined && active.ms !== undefined && (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Hashed {formatBytes(active.bytes)} in {(active.ms / 1000).toFixed(1)} s.
            </p>
          )}
        </section>
      )}

      <section className={`${cardClass} space-y-4`} aria-label="Hash results">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Results</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {tab === "text"
              ? "Type some text above and the hashes appear here."
              : "Choose a file and press “Calculate hashes”. Nothing leaves your device."}
          </p>
        ) : (
          <>
            <ul className="space-y-3">
              {rows.map((r) => {
                const value = formatDigest(r.hex, format);
                return (
                  <li
                    key={r.algo.value}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {r.algo.label} <span className="font-normal text-slate-500">· {r.algo.bits} bits</span>
                      </span>
                      <button
                        type="button"
                        className={buttonClass}
                        onClick={async () => {
                          if (await copy(value)) setCopiedKey(r.algo.value);
                        }}
                      >
                        {copied && copiedKey === r.algo.value ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <code className="block break-all font-mono text-sm text-slate-900 dark:text-slate-100">{value}</code>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap gap-2">
              <button type="button" className={primaryButtonClass} onClick={copyAll}>
                {copied && copiedKey === "all" ? "Copied!" : "Copy all"}
              </button>
              <button type="button" className={buttonClass} onClick={downloadChecksums}>
                Download .txt
              </button>
            </div>

            <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
              <label htmlFor="hash-expected" className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-100">
                Compare with an expected hash
              </label>
              <input
                id="hash-expected"
                type="text"
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                placeholder="Paste the published checksum (hex or Base64)"
                className="w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              {expected.trim() !== "" &&
                (matched ? (
                  <p
                    role="status"
                    className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                  >
                    ✓ Match — identical to the {ALGORITHMS.find((a) => a.value === matched)?.label} hash.
                  </p>
                ) : (
                  <p role="status" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                    ✗ No match. The value differs from every hash calculated above. If it is a download, fetch it again
                    from the official source.
                  </p>
                ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default HashGeneratorTool;
