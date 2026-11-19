"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LIMITS, countWords, generateLorem } from "@/lib/tools/lorem-core";
import type { LoremFormat, LoremUnit, ParagraphLength } from "@/lib/tools/lorem-core";

const UNITS: { value: LoremUnit; label: string }[] = [
  { value: "paragraphs", label: "Paragraphs" },
  { value: "sentences", label: "Sentences" },
  { value: "words", label: "Words" },
];

const FORMATS: { value: LoremFormat; label: string }[] = [
  { value: "plain", label: "Plain text" },
  { value: "html", label: "HTML paragraphs" },
  { value: "list", label: "HTML list" },
];

const LENGTHS: { value: ParagraphLength; label: string }[] = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
];

const PRESETS: Record<LoremUnit, number[]> = {
  paragraphs: [1, 3, 5, 10],
  sentences: [1, 3, 5, 10],
  words: [10, 25, 50, 100],
};

function saveText(text: string, name: string, mime: string): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export default function LoremIpsumGeneratorTool() {
  const [unit, setUnit] = useState<LoremUnit>("paragraphs");
  const [countText, setCountText] = useState("3");
  const [startWithLorem, setStartWithLorem] = useState(true);
  const [format, setFormat] = useState<LoremFormat>("plain");
  const [length, setLength] = useState<ParagraphLength>("medium");
  const [seed, setSeed] = useState(1);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const max = LIMITS[unit];
  const parsed = parseInt(countText, 10);
  const count = Number.isFinite(parsed) ? Math.min(max, Math.max(1, parsed)) : 1;

  const output = useMemo(
    () => generateLorem({ unit, count, startWithLorem, format, paragraphLength: length }, seed),
    [unit, count, startWithLorem, format, length, seed],
  );
  const stats = useMemo(
    () => ({ words: countWords(output), chars: output.length }),
    [output],
  );

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const changeUnit = (next: LoremUnit) => {
    setUnit(next);
    setCountText(String(Math.min(count, LIMITS[next])));
  };

  const regenerate = () => {
    setSeed(Math.floor(Math.random() * 2_147_483_647) + 1);
  };

  const copy = useCallback(async () => {
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
      setError("Copy failed. Select the text and copy it manually.");
      return;
    }
    setError(null);
    setCopied(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1800);
  }, [output]);

  const download = () => {
    if (format === "plain") saveText(output, "lorem-ipsum.txt", "text/plain");
    else saveText(output, "lorem-ipsum.html", "text/html");
  };

  return (
    <div className="space-y-6">
      <div className="card space-y-5 p-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Generate
            </p>
            <div role="group" aria-label="Unit" className="flex flex-wrap gap-2">
              {UNITS.map((u) => (
                <button
                  key={u.value}
                  type="button"
                  aria-pressed={unit === u.value}
                  onClick={() => changeUnit(u.value)}
                  className={unit === u.value ? "btn-primary" : "btn-secondary"}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="lorem-count"
              className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-100"
            >
              How many? (1 – {max.toLocaleString()})
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="lorem-count"
                type="number"
                inputMode="numeric"
                min={1}
                max={max}
                className="input w-28"
                value={countText}
                onChange={(e) => setCountText(e.target.value)}
                onBlur={() => setCountText(String(count))}
              />
              {PRESETS[unit].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="chip cursor-pointer"
                  onClick={() => setCountText(String(n))}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {unit === "paragraphs" && (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                Paragraph length
              </p>
              <div role="group" aria-label="Paragraph length" className="flex flex-wrap gap-2">
                {LENGTHS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    aria-pressed={length === l.value}
                    onClick={() => setLength(l.value)}
                    className={length === l.value ? "btn-primary" : "btn-secondary"}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Output format
            </p>
            <div role="group" aria-label="Output format" className="flex flex-wrap gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={format === f.value}
                  onClick={() => setFormat(f.value)}
                  className={format === f.value ? "btn-primary" : "btn-secondary"}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={startWithLorem}
            onChange={(e) => setStartWithLorem(e.target.checked)}
            className="h-4 w-4 accent-brand-600"
          />
          Start with “Lorem ipsum dolor sit amet…”
        </label>
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

      <div className="card space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="lorem-output"
            className="text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            Your placeholder text
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={copy}>
              {copied ? "Copied!" : "Copy"}
            </button>
            <button type="button" className="btn-secondary" onClick={regenerate}>
              Regenerate
            </button>
            <button type="button" className="btn-secondary" onClick={download}>
              Download .{format === "plain" ? "txt" : "html"}
            </button>
          </div>
        </div>
        <textarea
          id="lorem-output"
          className="input min-h-[320px] w-full text-sm"
          value={output}
          readOnly
          spellCheck={false}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
          {stats.words.toLocaleString()} words · {stats.chars.toLocaleString()} characters. Generated
          in your browser — nothing is sent anywhere.
        </p>
      </div>
    </div>
  );
}
