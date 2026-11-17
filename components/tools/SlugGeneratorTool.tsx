"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import {
  MAX_FILE_BYTES,
  MAX_INPUT_CHARS,
  MAX_LIMIT,
  MAX_LINES,
  MIN_LIMIT,
  slugifyBulk,
  slugifyDetailed,
  toCsv,
  type Separator,
  type SlugOptions,
} from "@/lib/tools/slug-core";
import {
  Checkbox,
  Segmented,
  buttonClass,
  cardClass,
  downloadBlob,
  formatBytes,
  primaryButtonClass,
  textareaClass,
  useCopy,
} from "@/components/tools/shared";

type Mode = "single" | "bulk";

const SEPARATORS: { value: Separator; label: string }[] = [
  { value: "-", label: "Hyphen ( - )" },
  { value: "_", label: "Underscore ( _ )" },
  { value: ".", label: "Dot ( . )" },
];

const SINGLE_SAMPLE = "Crème Brûlée & Köln: Über 10 Tipps für Москва! (Don’t miss it)";

const BULK_SAMPLE = [
  "10 Best Café Spots in Zürich",
  "How to Bake Sourdough Bread at Home",
  "A Guide to the Best Pizza in Naples",
  "How to Bake Sourdough Bread at Home",
  "Größte Städte in Österreich",
  "Привет, мир! Как дела?",
  "Ελληνικά νησιά: οδηγός",
  "Rock & Roll Legends — 1960–1975",
].join("\n");

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-inner placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

function clampLimit(text: string): number {
  const n = parseInt(text, 10);
  if (Number.isNaN(n)) return 60;
  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, n));
}

function DroppedNotice({ chars }: { chars: string[] }) {
  if (chars.length === 0) return null;
  return (
    <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
      These characters have no Latin equivalent and were removed:{" "}
      <span className="font-mono font-semibold">{chars.join(" ")}</span>. Turn off “Transliterate to ASCII” to keep
      them.
    </p>
  );
}

export function SlugGeneratorTool() {
  const [mode, setMode] = useState<Mode>("single");
  const [separator, setSeparator] = useState<Separator>("-");
  const [lowercase, setLowercase] = useState(true);
  const [ascii, setAscii] = useState(true);
  const [german, setGerman] = useState(false);
  const [ampersand, setAmpersand] = useState(true);
  const [stopWords, setStopWords] = useState(false);
  const [limitOn, setLimitOn] = useState(false);
  const [limitText, setLimitText] = useState("60");
  const [unique, setUnique] = useState(true);
  const [single, setSingle] = useState("");
  const [bulk, setBulk] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const depth = useRef(0);
  const loadRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { copied, copy } = useCopy();
  const deferredSingle = useDeferredValue(single);
  const deferredBulk = useDeferredValue(bulk);

  const maxLength = limitOn ? clampLimit(limitText) : 0;
  const effGerman = german && ascii;

  const opts = useMemo<SlugOptions>(
    () => ({ separator, lowercase, ascii, german: effGerman, stopWords, ampersand, maxLength }),
    [separator, lowercase, ascii, effGerman, stopWords, ampersand, maxLength],
  );

  const singleResult = useMemo(() => {
    if (deferredSingle.trim() === "") return null;
    return slugifyDetailed(deferredSingle.slice(0, 5000), opts);
  }, [deferredSingle, opts]);

  const bulkTooLarge = bulk.length > MAX_INPUT_CHARS;
  const bulkResult = useMemo(() => {
    if (mode !== "bulk" || deferredBulk.trim() === "" || deferredBulk.length > MAX_INPUT_CHARS) return null;
    return slugifyBulk(deferredBulk, opts, unique);
  }, [mode, deferredBulk, opts, unique]);

  const bulkText = useMemo(() => (bulkResult ? bulkResult.rows.map((r) => r.slug).join("\n") : ""), [bulkResult]);

  const loadFile = async (f: File) => {
    setFileError(null);
    if (f.size === 0) {
      setFileError(`“${f.name}” is empty.`);
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setFileError(`“${f.name}” is ${formatBytes(f.size)}. Bulk files are limited to ${formatBytes(MAX_FILE_BYTES)}.`);
      return;
    }
    const id = ++loadRef.current;
    try {
      let text = await f.text();
      if (loadRef.current !== id) return;
      if (text.includes("\u0000")) {
        setFileError(`“${f.name}” does not look like a plain-text file.`);
        return;
      }
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
      setBulk(text);
    } catch {
      if (loadRef.current === id) setFileError(`Could not read “${f.name}”.`);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    depth.current = 0;
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      void loadFile(f);
      return;
    }
    const t = e.dataTransfer.getData("text/plain");
    if (t) setBulk((prev) => (prev ? `${prev}\n${t}` : t));
  };

  const downloadSingle = () => {
    if (!singleResult?.slug) return;
    downloadBlob(new Blob([`${singleResult.slug}\n`], { type: "text/plain;charset=utf-8" }), "slug.txt");
  };

  const downloadTxt = () => {
    if (!bulkResult || bulkResult.rows.length === 0) return;
    downloadBlob(new Blob([`${bulkText}\n`], { type: "text/plain;charset=utf-8" }), "slugs.txt");
  };

  const downloadCsv = () => {
    if (!bulkResult || bulkResult.rows.length === 0) return;
    downloadBlob(new Blob([`\uFEFF${toCsv(bulkResult.rows)}`], { type: "text/csv;charset=utf-8" }), "slugs.csv");
  };

  const slug = singleResult?.slug ?? "";

  return (
    <div className="space-y-6">
      <section className={cardClass} aria-label="Slug settings">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label="Mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: "single", label: "Single title" },
              { value: "bulk", label: "Bulk (one per line)" },
            ]}
          />
          <Segmented label="Separator" value={separator} onChange={setSeparator} options={SEPARATORS} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Checkbox checked={lowercase} onChange={setLowercase}>
            Lowercase
          </Checkbox>
          <Checkbox checked={ascii} onChange={setAscii}>
            Transliterate to ASCII
          </Checkbox>
          <Checkbox checked={effGerman} onChange={setGerman} disabled={!ascii}>
            German umlauts (ä→ae)
          </Checkbox>
          <Checkbox checked={ampersand} onChange={setAmpersand}>
            {"“&” → “and”"}
          </Checkbox>
          <Checkbox checked={stopWords} onChange={setStopWords}>
            Remove stop words
          </Checkbox>
          <div className="inline-flex items-center gap-2">
            <Checkbox checked={limitOn} onChange={setLimitOn}>
              Limit length
            </Checkbox>
            <input
              type="number"
              inputMode="numeric"
              min={MIN_LIMIT}
              max={MAX_LIMIT}
              value={limitText}
              disabled={!limitOn}
              onChange={(e) => setLimitText(e.target.value)}
              onBlur={() => setLimitText(String(clampLimit(limitText)))}
              aria-label="Maximum slug length in characters"
              className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950"
            />
            <span className="text-sm text-slate-600 dark:text-slate-400">chars</span>
          </div>
          {mode === "bulk" && (
            <Checkbox checked={unique} onChange={setUnique}>
              Make duplicates unique (-2, -3…)
            </Checkbox>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Apostrophes are removed (don’t → dont). Length limits trim at a word boundary. Stop-word removal is English
          only.
        </p>
      </section>

      {mode === "single" ? (
        <section className="grid gap-4 lg:grid-cols-2" aria-label="Single slug">
          <div className={cardClass}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label htmlFor="slug-input" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Title or phrase
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-400">{single.length}/500</span>
            </div>
            <input
              id="slug-input"
              type="text"
              value={single}
              maxLength={500}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setSingle(e.target.value)}
              placeholder="e.g. 10 Best Café Spots in Zürich (2025 Guide)"
              className={inputClass}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={buttonClass} onClick={() => setSingle(SINGLE_SAMPLE)}>
                Load example
              </button>
              <button type="button" className={buttonClass} onClick={() => setSingle("")} disabled={!single}>
                Clear
              </button>
            </div>
          </div>

          <div className={`${cardClass} space-y-3`}>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Slug</h2>
            <div
              aria-live="polite"
              className="min-h-[3rem] break-all rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {slug ? slug : <span className="text-slate-400">Your slug appears here as you type…</span>}
            </div>

            {singleResult && !slug && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                Nothing is left after cleaning. The title may contain only symbols or characters that cannot be
                converted.
              </p>
            )}
            {singleResult && <DroppedNotice chars={singleResult.dropped} />}

            {slug && (
              <>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {Array.from(slug).length} characters
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {slug.split(separator).length} words
                  </span>
                </div>
                {Array.from(slug).length > 60 && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Longer than 60 characters. Search results may cut it off, so consider enabling the length limit.
                  </p>
                )}
                <p className="break-all text-xs text-slate-500 dark:text-slate-400">
                  Preview: https://example.com/blog/{slug}
                </p>
              </>
            )}

            <div className="flex flex-wrap gap-2">
              <button type="button" className={primaryButtonClass} disabled={!slug} onClick={() => void copy(slug)}>
                {copied ? "Copied!" : "Copy slug"}
              </button>
              <button type="button" className={buttonClass} disabled={!slug} onClick={downloadSingle}>
                Download .txt
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2" aria-label="Bulk slugs">
          <div className={cardClass}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label htmlFor="slug-bulk" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Titles (one per line)
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-400">{bulk.length.toLocaleString()} chars</span>
            </div>
            <div
              className={`relative rounded-xl ${dragging ? "ring-2 ring-indigo-500" : ""}`}
              onDragEnter={(e) => {
                e.preventDefault();
                depth.current += 1;
                setDragging(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={(e) => {
                e.preventDefault();
                depth.current = Math.max(0, depth.current - 1);
                if (depth.current === 0) setDragging(false);
              }}
              onDrop={handleDrop}
            >
              <textarea
                id="slug-bulk"
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
                spellCheck={false}
                placeholder={"Paste titles here, one per line…\nor drop a .txt / .csv file onto this box"}
                className={`${textareaClass} h-80 resize-y`}
              />
              {dragging && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-indigo-50/90 text-sm font-semibold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-200">
                  Release to load the file
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.csv,.tsv,text/plain,text/csv"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void loadFile(f);
                e.target.value = "";
              }}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={buttonClass} onClick={() => fileInputRef.current?.click()}>
                Load .txt / .csv file
              </button>
              <button type="button" className={buttonClass} onClick={() => setBulk(BULK_SAMPLE)}>
                Load example
              </button>
              <button type="button" className={buttonClass} onClick={() => setBulk("")} disabled={!bulk}>
                Clear
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Up to {MAX_LINES.toLocaleString()} lines · files up to {formatBytes(MAX_FILE_BYTES)} · each whole line
              is treated as one title.
            </p>
            {fileError && (
              <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
                {fileError}
              </p>
            )}
            {bulkTooLarge && (
              <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
                That is more than {MAX_INPUT_CHARS.toLocaleString()} characters. Split the list into smaller batches.
              </p>
            )}
          </div>

          <div className={`${cardClass} space-y-3`}>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Slugs</h2>

            {!bulkResult && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Paste or load some titles and the slugs appear here instantly.
              </p>
            )}

            {bulkResult && (
              <>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {bulkResult.rows.length.toLocaleString()} slugs
                  </span>
                  {unique && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {bulkResult.renamed.toLocaleString()} duplicates renamed
                    </span>
                  )}
                  {bulkResult.empty > 0 && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                      {bulkResult.empty.toLocaleString()} empty
                    </span>
                  )}
                </div>

                {bulkResult.truncated && (
                  <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    Only the first {MAX_LINES.toLocaleString()} non-empty lines were converted.
                  </p>
                )}
                <DroppedNotice chars={bulkResult.dropped} />

                <div className="max-h-80 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <tr>
                        <th scope="col" className="px-3 py-2 font-semibold">
                          #
                        </th>
                        <th scope="col" className="px-3 py-2 font-semibold">
                          Title
                        </th>
                        <th scope="col" className="px-3 py-2 font-semibold">
                          Slug
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {bulkResult.rows.slice(0, 200).map((r, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 text-slate-500">{i + 1}</td>
                          <td className="max-w-[14rem] truncate px-3 py-1.5 text-slate-700 dark:text-slate-300" title={r.title}>
                            {r.title}
                          </td>
                          <td className="break-all px-3 py-1.5 font-mono text-slate-900 dark:text-slate-100">
                            {r.slug || <em className="text-slate-400">(empty)</em>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {bulkResult.rows.length > 200 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Showing the first 200 of {bulkResult.rows.length.toLocaleString()} rows. Copy and download include
                    every row.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={primaryButtonClass}
                    disabled={bulkResult.rows.length === 0}
                    onClick={() => void copy(bulkText)}
                  >
                    {copied ? "Copied!" : "Copy all slugs"}
                  </button>
                  <button type="button" className={buttonClass} disabled={bulkResult.rows.length === 0} onClick={downloadTxt}>
                    Download .txt
                  </button>
                  <button type="button" className={buttonClass} disabled={bulkResult.rows.length === 0} onClick={downloadCsv}>
                    Download .csv
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default SlugGeneratorTool;
