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
  toHex,
  type DigestFormat,
  type HashAlgo,
  type HashWorkerRequest,
  type HashWorkerResponse,
} from "@/lib/tools/hash-core";

type Mode = "text" | "file";

interface Row {
  id: HashAlgo;
  label: string;
  bits: number;
  collisionResistant: boolean;
  digest: Uint8Array;
}

interface FileResult {
  name: string;
  size: number;
  elapsedMs: number;
  digests: { algo: HashAlgo; digest: Uint8Array }[];
}

const DEFAULT_ALGOS: HashAlgo[] = ["md5", "sha1", "sha256", "sha512"];

const FORMATS: { id: DigestFormat; label: string }[] = [
  { id: "hex", label: "Hex (lowercase)" },
  { id: "HEX", label: "Hex (UPPERCASE)" },
  { id: "base64", label: "Base64" },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[unit]}`;
}

function downloadText(text: string, filename: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

export function HashGeneratorTool() {
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<HashAlgo[]>(DEFAULT_ALGOS);
  const [format, setFormat] = useState<DigestFormat>("hex");
  const [expected, setExpected] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileResult, setFileResult] = useState<FileResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [selfTestFailures, setSelfTestFailures] = useState<string[]>([]);

  const workerRef = useRef<Worker | null>(null);
  const runIdRef = useRef(0);
  const dragDepthRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const copyTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const result = selfTest();
    if (!result.ok) setSelfTestFailures(result.failures);
  }, []);

  useEffect(() => {
    return () => {
      runIdRef.current += 1;
      workerRef.current?.terminate();
      workerRef.current = null;
      window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  const stopWorker = useCallback(() => {
    runIdRef.current += 1;
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  const runFile = useCallback(
    (target: File, algos: HashAlgo[]) => {
      stopWorker();
      const runId = runIdRef.current;

      setError(null);
      setFileResult(null);
      setProgress(0);

      if (target.size > MAX_FILE_BYTES) {
        setBusy(false);
        setError(`That file is ${formatBytes(target.size)}. The limit is 600 MB.`);
        return;
      }
      if (algos.length === 0) {
        setBusy(false);
        setError("Select at least one algorithm.");
        return;
      }

      let worker: Worker;
      try {
        worker = new Worker(new URL("./workers/hash.worker.ts", import.meta.url), {
          type: "module",
        });
      } catch {
        setBusy(false);
        setError("Your browser could not start a background worker, so this file cannot be hashed.");
        return;
      }

      workerRef.current = worker;
      setBusy(true);

      worker.onmessage = (event: MessageEvent<HashWorkerResponse>) => {
        const message = event.data;
        if (runIdRef.current !== runId || workerRef.current !== worker) return;

        if (message.type === "progress") {
          setProgress(message.total > 0 ? Math.min(100, (message.processed / message.total) * 100) : 100);
        } else if (message.type === "done") {
          worker.terminate();
          workerRef.current = null;
          setFileResult({
            name: target.name,
            size: target.size,
            elapsedMs: message.elapsedMs,
            digests: message.results,
          });
          setProgress(100);
          setBusy(false);
        } else {
          worker.terminate();
          workerRef.current = null;
          setError(message.message);
          setBusy(false);
        }
      };

      worker.onerror = () => {
        if (runIdRef.current !== runId || workerRef.current !== worker) return;
        worker.terminate();
        workerRef.current = null;
        setError(
          "Hashing stopped unexpectedly. The file may be too large for this device's memory, or it could not be read.",
        );
        setBusy(false);
      };

      const request: HashWorkerRequest = { id: runId, file: target, algos };
      worker.postMessage(request);
    },
    [stopWorker],
  );

  const handleFile = useCallback(
    (picked: File | undefined) => {
      if (!picked) return;
      setFile(picked);
      runFile(picked, selected);
    },
    [runFile, selected],
  );

  const cancel = useCallback(() => {
    stopWorker();
    setBusy(false);
    setProgress(0);
    setError("Hashing was cancelled.");
  }, [stopWorker]);

  const toggleAlgo = (id: HashAlgo): void => {
    setSelected((previous) => {
      if (previous.includes(id)) {
        return previous.length > 1 ? previous.filter((item) => item !== id) : previous;
      }
      return [...previous, id];
    });
  };

  const orderedSelected = useMemo(
    () => ALGORITHMS.filter((info) => selected.includes(info.id)),
    [selected],
  );

  const deferredText = useDeferredValue(text);
  const textTooLong = text.length > MAX_TEXT_CHARS;

  const rows: Row[] = useMemo(() => {
    if (mode === "text") {
      if (deferredText.length === 0 || deferredText.length > MAX_TEXT_CHARS) return [];
      return orderedSelected.map((info) => ({
        id: info.id,
        label: info.label,
        bits: info.bits,
        collisionResistant: info.collisionResistant,
        digest: hashText(deferredText, info.id),
      }));
    }
    if (!fileResult) return [];
    const found: Row[] = [];
    for (const info of orderedSelected) {
      const match = fileResult.digests.find((item) => item.algo === info.id);
      if (match) {
        found.push({
          id: info.id,
          label: info.label,
          bits: info.bits,
          collisionResistant: info.collisionResistant,
          digest: match.digest,
        });
      }
    }
    return found;
  }, [mode, deferredText, orderedSelected, fileResult]);

  const missingForFile =
    mode === "file" && fileResult
      ? orderedSelected.filter((info) => !fileResult.digests.some((item) => item.algo === info.id))
      : [];

  const expectedTrimmed = expected.trim();
  const matchedRow = expectedTrimmed
    ? rows.find((row) => matchDigest(expectedTrimmed, row.digest))
    : undefined;
  const showCompare = expectedTrimmed.length > 0 && rows.length > 0;

  const copy = async (key: string, value: string): Promise<void> => {
    const ok = await copyText(value);
    if (!ok) return;
    setCopiedKey(key);
    window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopiedKey(null), 1500);
  };

  const downloadChecksums = (): void => {
    if (!fileResult) return;
    const lines: string[] = [];
    const entries = fileResult.digests;
    if (entries.length === 1) {
      lines.push(`${toHex(entries[0].digest)}  ${fileResult.name}`);
    } else {
      for (const entry of entries) {
        const info = ALGORITHMS.find((item) => item.id === entry.algo);
        lines.push(`# ${info ? info.label : entry.algo}`);
        lines.push(`${toHex(entry.digest)}  ${fileResult.name}`);
        lines.push("");
      }
    }
    downloadText(lines.join("\n").trimEnd() + "\n", `${fileResult.name}.checksums.txt`);
  };

  const dropClass = [
    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
    dragging
      ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40"
      : "border-slate-300 bg-slate-50 hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900/50",
    busy ? "cursor-not-allowed opacity-60" : "",
  ].join(" ");

  const tabClass = (active: boolean): string =>
    [
      "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
      active
        ? "bg-white text-brand-700 shadow-sm dark:bg-slate-800 dark:text-brand-300"
        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
    ].join(" ");

  return (
    <div className="space-y-5">
      {selfTestFailures.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          <p className="font-semibold">The built-in accuracy check failed in this browser.</p>
          <p className="mt-1">Do not rely on these results. Please report it to us. Details: {selfTestFailures.join("; ")}.</p>
        </div>
      )}

      <div className="card space-y-5 p-5 sm:p-6">
        <div
          role="group"
          aria-label="Input type"
          className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60"
        >
          <button type="button" aria-pressed={mode === "text"} onClick={() => setMode("text")} className={tabClass(mode === "text")}>
            Text
          </button>
          <button type="button" aria-pressed={mode === "file"} onClick={() => setMode("file")} className={tabClass(mode === "file")}>
            File
          </button>
        </div>

        {mode === "text" ? (
          <div>
            <label htmlFor="hash-text" className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">
              Text to hash
            </label>
            <textarea
              id="hash-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Type or paste text. Hashes update as you type."
              spellCheck={false}
              className="input min-h-40 font-mono"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>
                {text.length.toLocaleString()} characters, hashed as UTF-8
              </span>
              {text.length > 0 && (
                <button type="button" onClick={() => setText("")} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
                  Clear
                </button>
              )}
            </div>
            {textTooLong && (
              <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
                Text is limited to {MAX_TEXT_CHARS.toLocaleString()} characters here. Use the File tab for larger data.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div
              role="button"
              tabIndex={0}
              aria-label="Choose a file to hash, or drop one here"
              aria-disabled={busy}
              onClick={() => {
                if (!busy) inputRef.current?.click();
              }}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && !busy) {
                  event.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                dragDepthRef.current += 1;
                setDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                event.preventDefault();
                dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
                if (dragDepthRef.current === 0) setDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                dragDepthRef.current = 0;
                setDragging(false);
                if (!busy) handleFile(event.dataTransfer.files?.[0]);
              }}
              className={dropClass}
            >
              <span className="text-base font-semibold text-slate-800 dark:text-slate-100">
                Drop a file here, or click to choose
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Up to 600 MB. The file never leaves your device.
              </span>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(event) => {
                  handleFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </div>

            {file && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-semibold">{file.name}</span> ({formatBytes(file.size)})
              </p>
            )}

            {(busy || progress > 0) && (
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>{busy ? "Hashing…" : "Finished"}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress)}
                  className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
                >
                  <div
                    className="h-full rounded-full bg-brand-600 transition-[width] duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {busy && (
                <button type="button" onClick={cancel} className="btn-secondary">
                  Cancel
                </button>
              )}
              {!busy && file && (
                <button type="button" onClick={() => runFile(file, selected)} className="btn-secondary">
                  {fileResult ? "Recalculate" : "Hash file"}
                </button>
              )}
              {!busy && fileResult && (
                <button type="button" onClick={downloadChecksums} className="btn-secondary">
                  Download checksums (.txt)
                </button>
              )}
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>
        )}

        <div className="grid gap-5 border-t border-slate-200 pt-5 sm:grid-cols-2 dark:border-slate-800">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Algorithms</legend>
            <div className="space-y-2">
              {ALGORITHMS.map((info) => (
                <label key={info.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={selected.includes(info.id)}
                    onChange={() => toggleAlgo(info.id)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="font-medium">{info.label}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{info.note}</span>
                </label>
              ))}
            </div>
            {mode === "file" && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Each ticked algorithm reads the same data, so fewer ticks means a faster result on big files.
              </p>
            )}
          </fieldset>

          <div>
            <label htmlFor="hash-format" className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">
              Output format
            </label>
            <select
              id="hash-format"
              value={format}
              onChange={(event) => setFormat(event.target.value as DigestFormat)}
              className="input"
            >
              {FORMATS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card space-y-4 p-5 sm:p-6" aria-live="polite">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Results</h2>

        {rows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {mode === "text"
              ? "Type some text above to see its hashes."
              : busy
                ? "Working on it…"
                : "Add a file to see its hashes."}
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => {
              const value = formatDigest(row.digest, format);
              const isMatch = matchedRow?.id === row.id;
              return (
                <li
                  key={row.id}
                  className={[
                    "rounded-xl border p-3",
                    isMatch
                      ? "border-green-400 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
                      : "border-slate-200 dark:border-slate-800",
                  ].join(" ")}
                >
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{row.label}</span>
                      <span className="chip">{row.bits}-bit</span>
                      {!row.collisionResistant && <span className="chip">Not for security use</span>}
                      {isMatch && <span className="chip">Matches</span>}
                    </div>
                    <button type="button" onClick={() => copy(row.id, value)} className="btn-secondary min-h-8 px-3 py-1 text-xs">
                      {copiedKey === row.id ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <code className="block break-all font-mono text-xs leading-6 text-slate-800 dark:text-slate-200">
                    {value}
                  </code>
                </li>
              );
            })}
          </ul>
        )}

        {mode === "file" && fileResult && rows.length > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hashed {formatBytes(fileResult.size)} in {(fileResult.elapsedMs / 1000).toFixed(1)} s.
          </p>
        )}

        {missingForFile.length > 0 && (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {missingForFile.map((info) => info.label).join(", ")} {missingForFile.length === 1 ? "was" : "were"} not
            calculated for this file. Press Recalculate to include {missingForFile.length === 1 ? "it" : "them"}.
          </p>
        )}

        <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
          <label htmlFor="hash-expected" className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">
            Compare with an expected checksum
          </label>
          <input
            id="hash-expected"
            type="text"
            value={expected}
            onChange={(event) => setExpected(event.target.value)}
            placeholder="Paste the checksum you were given"
            spellCheck={false}
            autoComplete="off"
            className="input font-mono"
          />
          {showCompare && (
            <p
              role="status"
              className={[
                "mt-2 text-sm font-semibold",
                matchedRow ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400",
              ].join(" ")}
            >
              {matchedRow
                ? `Match. The checksum equals the ${matchedRow.label} digest.`
                : "No match. It does not equal any of the digests above. Check the algorithm and the pasted value, and download the file again if it still differs."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default HashGeneratorTool;
