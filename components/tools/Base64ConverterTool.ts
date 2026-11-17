"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  MAX_FILE_BYTES,
  MAX_TEXT_CHARS,
  decodeBase64Text,
  encodeBytesToString,
  type Base64WorkerRequest,
  type Base64WorkerResponse,
} from "@/lib/tools/base64-core";
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

type Mode = "text" | "file";
type Op = "encode" | "decode";

interface FileResult {
  blob: Blob;
  size: number;
  mime: string;
  preview: string;
  previewIsText: boolean;
  previewTruncated: boolean;
}

interface Run {
  key: string;
  status: "running" | "done" | "error" | "cancelled";
  error?: string;
  result?: FileResult;
}

type TextResult =
  | { ok: true; text: string; bytes: Uint8Array | null; warning?: string }
  | { ok: false; error: string };

const encoder = new TextEncoder();
const COPY_LIMIT = 5 * 1024 * 1024;

const EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "application/pdf": ".pdf",
  "application/zip": ".zip",
  "application/json": ".json",
  "text/plain": ".txt",
  "text/html": ".html",
};

function convertText(
  input: string,
  op: Op,
  urlSafe: boolean,
  padding: boolean,
  wrap: number,
  dataUri: boolean,
): TextResult {
  try {
    if (op === "encode") {
      const b64 = encodeBytesToString(encoder.encode(input), { urlSafe, padding, wrap });
      return { ok: true, text: dataUri ? `data:text/plain;charset=utf-8;base64,${b64}` : b64, bytes: null };
    }
    const { bytes } = decodeBase64Text(input);
    try {
      return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), bytes };
    } catch {
      return {
        ok: true,
        text: new TextDecoder("utf-8").decode(bytes),
        bytes,
        warning:
          "The decoded bytes are not valid UTF-8 text, so they are probably a binary file. Use “Download” to save the exact bytes, or switch to file mode.",
      };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Conversion failed." };
  }
}

function outputName(fileName: string, op: Op, mime: string, isText: boolean): string {
  if (op === "encode") return `${fileName}.b64.txt`;
  const stripped = fileName.replace(/\.(b64|base64|txt)$/i, "");
  if (stripped && stripped !== fileName) return stripped;
  const base = fileName.replace(/\.[^.]+$/, "") || "decoded";
  const m = mime.split(";")[0].trim().toLowerCase();
  return `${base}-decoded${EXT[m] ?? (isText ? ".txt" : ".bin")}`;
}

export function Base64ConverterTool() {
  const [mode, setMode] = useState<Mode>("text");
  const [op, setOp] = useState<Op>("encode");
  const [urlSafe, setUrlSafe] = useState(false);
  const [padding, setPadding] = useState(true);
  const [wrap, setWrap] = useState(0);
  const [dataUri, setDataUri] = useState(false);
  const [input, setInput] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const runIdRef = useRef(0);
  const { copied, copy } = useCopy();
  const deferred = useDeferredValue(input);

  const effUrlSafe = urlSafe && !dataUri;
  const effWrap = dataUri ? 0 : wrap;
  const tooLarge = input.length > MAX_TEXT_CHARS;

  const textResult = useMemo<TextResult | null>(() => {
    if (mode !== "text" || deferred === "" || deferred.length > MAX_TEXT_CHARS) return null;
    return convertText(deferred, op, effUrlSafe, padding, effWrap, op === "encode" && dataUri);
  }, [mode, deferred, op, effUrlSafe, padding, effWrap, dataUri]);

  const settingsKey = `${op}|${effUrlSafe}|${padding}|${effWrap}|${op === "encode" && dataUri}|${file?.name}|${file?.size}|${file?.lastModified}`;
  const active = run && (run.status === "running" || run.key === settingsKey) ? run : null;
  const running = run?.status === "running";

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
    setProgress({ processed: 0, total: file.size });

    let worker: Worker;
    try {
      worker = new Worker(new URL("./workers/base64.worker.ts", import.meta.url), { type: "module" });
    } catch {
      setRun({ key, status: "error", error: "Your browser could not start a background worker." });
      setProgress(null);
      return;
    }
    workerRef.current = worker;

    const fail = (message: string) => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
      setProgress(null);
      setRun({ key, status: "error", error: message });
    };

    worker.onmessage = (event: MessageEvent<Base64WorkerResponse>) => {
      if (workerRef.current !== worker || runIdRef.current !== id) return;
      const m = event.data;
      if (m.id !== id) return;
      if (m.type === "progress") {
        setProgress({ processed: m.processed, total: m.total });
      } else if (m.type === "done") {
        worker.terminate();
        workerRef.current = null;
        setProgress(null);
        setRun({
          key,
          status: "done",
          result: {
            blob: m.blob,
            size: m.size,
            mime: m.mime,
            preview: m.preview,
            previewIsText: m.previewIsText,
            previewTruncated: m.previewTruncated,
          },
        });
      } else {
        fail(m.message);
      }
    };

    worker.onerror = (ev) => {
      if (workerRef.current !== worker || runIdRef.current !== id) return;
      ev.preventDefault();
      fail(
        "The background worker stopped unexpectedly. The file is probably too large for this device's available memory — try a smaller file or a desktop browser.",
      );
    };

    const request: Base64WorkerRequest = {
      type: "start",
      id,
      op,
      file,
      urlSafe: effUrlSafe,
      padding,
      wrap: effWrap,
      dataUri: op === "encode" && dataUri,
    };
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

  const downloadText = () => {
    if (!textResult || !textResult.ok) return;
    if (op === "encode") {
      downloadBlob(new Blob([textResult.text], { type: "text/plain" }), "encoded.b64.txt");
    } else if (textResult.bytes) {
      downloadBlob(
        new Blob([textResult.bytes as BlobPart]),
        textResult.warning ? "decoded.bin" : "decoded.txt",
      );
    }
  };

  const swap = () => {
    if (!textResult || !textResult.ok || textResult.warning) return;
    setInput(textResult.text);
    setOp(op === "encode" ? "decode" : "encode");
  };

  const fr = active?.result;
  const pct = progress && progress.total > 0 ? (progress.processed / progress.total) * 100 : 0;

  return (
    <div className="space-y-6">
      <section className={cardClass} aria-label="Base64 settings">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label="Input type"
            value={mode}
            onChange={setMode}
            options={[
              { value: "text", label: "Text" },
              { value: "file", label: "File (up to 600 MB)" },
            ]}
          />
          <Segmented
            label="Direction"
            value={op}
            onChange={setOp}
            options={[
              { value: "encode", label: "Encode" },
              { value: "decode", label: "Decode" },
            ]}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Checkbox checked={effUrlSafe} onChange={setUrlSafe} disabled={dataUri && op === "encode"}>
            URL-safe (- and _)
          </Checkbox>
          <Checkbox checked={padding} onChange={setPadding}>
            Include “=” padding
          </Checkbox>
          <Checkbox checked={op === "encode" && dataUri} onChange={setDataUri} disabled={op === "decode"}>
            Data URI prefix
          </Checkbox>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            Line wrap
            <select
              value={effWrap}
              disabled={op === "decode" || (dataUri && op === "encode")}
              onChange={(e) => setWrap(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value={0}>None</option>
              <option value={64}>64 characters</option>
              <option value={76}>76 characters (MIME)</option>
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Decoding accepts both alphabets, ignores whitespace and line breaks, tolerates missing padding and strips a
          data URI header automatically.
        </p>
      </section>

      {mode === "text" ? (
        <section className="grid gap-4 lg:grid-cols-2" aria-label="Text conversion">
          <div className={cardClass}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label htmlFor="b64-input" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {op === "encode" ? "Text to encode" : "Base64 to decode"}
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-400">{input.length.toLocaleString()} chars</span>
            </div>
            <textarea
              id="b64-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              rows={12}
              placeholder={op === "encode" ? "Type or paste text — emoji and any language are fine…" : "Paste Base64 or a data URI…"}
              className={`${textareaClass} h-72 resize-y`}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={buttonClass} onClick={() => setInput("")} disabled={!input}>
                Clear
              </button>
              <button
                type="button"
                className={buttonClass}
                onClick={swap}
                disabled={!textResult || !textResult.ok || !!textResult.warning}
              >
                Use output as input &amp; flip
              </button>
            </div>
            {tooLarge && (
              <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
                That is more than {MAX_TEXT_CHARS.toLocaleString()} characters. Save it as a file and use file mode,
                which streams in a background worker.
              </p>
            )}
          </div>

          <div className={cardClass}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label htmlFor="b64-output" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Result
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {textResult && textResult.ok ? `${textResult.text.length.toLocaleString()} chars` : "—"}
              </span>
            </div>
            <textarea
              id="b64-output"
              readOnly
              value={textResult && textResult.ok ? textResult.text : ""}
              rows={12}
              placeholder="The converted result appears here instantly."
              className={`${textareaClass} h-72 resize-y`}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={primaryButtonClass}
                disabled={!textResult || !textResult.ok}
                onClick={() => textResult && textResult.ok && void copy(textResult.text)}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <button type="button" className={buttonClass} disabled={!textResult || !textResult.ok} onClick={downloadText}>
                Download
              </button>
            </div>
            {textResult && !textResult.ok && (
              <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
                {textResult.error}
              </p>
            )}
            {textResult && textResult.ok && textResult.warning && (
              <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">{textResult.warning}</p>
            )}
          </div>
        </section>
      ) : (
        <section className={`${cardClass} space-y-4`} aria-label="File conversion">
          <Dropzone
            file={file}
            onFile={handleFile}
            disabled={running}
            hint="Any file type · up to 600 MB · processed locally in a background worker"
          />
          {fileError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {fileError}
            </p>
          )}
          {file && file.size > 200 * 1024 * 1024 && !running && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Large file: the result must fit in your browser&apos;s memory. If the worker stops, try a desktop browser
              with more RAM.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" className={primaryButtonClass} onClick={startFile} disabled={!file || running}>
              {op === "encode" ? "Encode file" : "Decode file"}
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
                label={`${op === "encode" ? "Encoding" : "Decoding"}… ${formatBytes(progress.processed)} of ${formatBytes(progress.total)}`}
              />
            </div>
          )}

          {active?.status === "cancelled" && (
            <p className="text-sm text-slate-600 dark:text-slate-400">Cancelled. Nothing was kept in memory.</p>
          )}
          {active?.status === "error" && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {active.error}
            </p>
          )}

          {active?.status === "done" && fr && file && (
            <div className="space-y-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Done — {formatBytes(file.size)} → {formatBytes(fr.size)}
                {fr.mime && op === "decode" ? ` · ${fr.mime}` : ""}
              </p>
              <label htmlFor="b64-preview" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                Preview{fr.previewTruncated ? " (start of result)" : ""}
              </label>
              <textarea
                id="b64-preview"
                readOnly
                rows={6}
                value={fr.preview}
                className={`${textareaClass} h-36 resize-y`}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={primaryButtonClass}
                  onClick={() => downloadBlob(fr.blob, outputName(file.name, op, fr.mime, fr.previewIsText))}
                >
                  Download result ({formatBytes(fr.size)})
                </button>
                <button
                  type="button"
                  className={buttonClass}
                  disabled={fr.size > COPY_LIMIT}
                  title={fr.size > COPY_LIMIT ? "Results above 5 MB can only be downloaded" : undefined}
                  onClick={async () => void copy(await fr.blob.text())}
                >
                  {copied ? "Copied!" : "Copy to clipboard"}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default Base64ConverterTool;
