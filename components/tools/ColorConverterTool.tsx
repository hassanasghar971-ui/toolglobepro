"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import {
  MAX_BULK_BYTES,
  contrastRatio,
  convertBulk,
  formatColor,
  harmonies,
  nameOf,
  parseColor,
  roundColor,
  tintsAndShades,
  toHex,
  wcag,
} from "@/lib/tools/color-core";
import type { FormatId, RGBA } from "@/lib/tools/color-core";

const FORMATS: { id: FormatId; label: string }[] = [
  { id: "hex", label: "HEX" },
  { id: "rgb", label: "RGB" },
  { id: "hsl", label: "HSL" },
  { id: "hsv", label: "HSV" },
  { id: "hwb", label: "HWB" },
  { id: "cmyk", label: "CMYK" },
  { id: "oklch", label: "OKLCH" },
];

const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 1 };
const BLACK: RGBA = { r: 0, g: 0, b: 0, a: 1 };
const DEFAULT_TEXT = "#4f46e5";
const SAMPLE_BULK = "#4f46e5\nrgb(34, 197, 94)\nhsl(199 89% 48%)\ncolor: #f59e0b;";

const CHECKER: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg,#cbd5e1 25%,transparent 25%),linear-gradient(-45deg,#cbd5e1 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#cbd5e1 75%),linear-gradient(-45deg,transparent 75%,#cbd5e1 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
};

interface EyeDropperLike {
  open(): Promise<{ sRGBHex: string }>;
}
interface EyeDropperCtor {
  new (): EyeDropperLike;
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

function rgbaCss(c: RGBA): string {
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${c.a})`;
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
        ok
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
          : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"
      }`}
    >
      {label}: {ok ? "Pass" : "Fail"}
    </span>
  );
}

function Swatch({ color, onPick }: { color: RGBA; onPick: (c: RGBA) => void }) {
  const hex = toHex(color, false, false);
  return (
    <button
      type="button"
      onClick={() => onPick(color)}
      title={`Use ${hex}`}
      aria-label={`Use colour ${hex}`}
      className="group flex flex-col items-center gap-1"
    >
      <span
        className="block h-12 w-12 rounded-lg border border-slate-300 shadow-sm transition-transform group-hover:scale-105 dark:border-slate-600"
        style={{ backgroundColor: hex }}
      />
      <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{hex}</span>
    </button>
  );
}

export default function ColorConverterTool() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [color, setColor] = useState<RGBA>(
    () => parseColor(DEFAULT_TEXT) ?? { r: 79, g: 70, b: 229, a: 1 },
  );
  const [upper, setUpper] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [eyeOk, setEyeOk] = useState(false);

  const [bulkText, setBulkText] = useState(SAMPLE_BULK);
  const [bulkFormat, setBulkFormat] = useState<FormatId>("rgb");
  const [bulkDrag, setBulkDrag] = useState(false);
  const bulkDepth = useRef(0);
  const bulkFileRef = useRef<HTMLInputElement>(null);
  const copyTimer = useRef<number | null>(null);

  useEffect(() => {
    setEyeOk("EyeDropper" in window);
    return () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    };
  }, []);

  const invalid = useMemo(() => text.trim() !== "" && parseColor(text) === null, [text]);

  const applyColor = useCallback(
    (next: RGBA) => {
      const snapped = roundColor(next);
      setColor(snapped);
      setText(toHex(snapped, upper));
      setMessage(null);
    },
    [upper],
  );

  const onTextChange = (value: string) => {
    setText(value);
    const parsed = parseColor(value);
    if (parsed) setColor(parsed);
  };

  const onPicker = (value: string) => {
    const parsed = parseColor(value);
    if (parsed) applyColor({ ...parsed, a: color.a });
  };

  const onAlpha = (percent: number) => {
    applyColor({ ...color, a: percent / 100 });
  };

  const pickFromScreen = async () => {
    const Ctor = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;
    if (!Ctor) return;
    try {
      const picked = await new Ctor().open();
      const parsed = parseColor(picked.sRGBHex);
      if (parsed) applyColor({ ...parsed, a: color.a });
    } catch {
      /* the user cancelled the picker */
    }
  };

  const copy = useCallback(async (id: string, value: string) => {
    const ok = await copyText(value);
    if (!ok) {
      setMessage("Copy failed. Select the value and copy it manually.");
      return;
    }
    setMessage(null);
    setCopiedId(id);
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopiedId(null), 1500);
  }, []);

  const name = useMemo(() => nameOf(color), [color]);
  const whiteRatio = useMemo(() => contrastRatio(color, WHITE), [color]);
  const blackRatio = useMemo(() => contrastRatio(color, BLACK), [color]);
  const shades = useMemo(() => tintsAndShades(color), [color]);
  const schemes = useMemo(() => harmonies(color), [color]);

  const deferredBulk = useDeferredValue(bulkText);
  const bulk = useMemo(
    () => convertBulk(deferredBulk, bulkFormat, upper),
    [deferredBulk, bulkFormat, upper],
  );

  const loadBulkFile = useCallback(async (file: File) => {
    setMessage(null);
    if (file.size > MAX_BULK_BYTES) {
      setMessage(`${file.name} is larger than ${Math.round(MAX_BULK_BYTES / 1048576)} MB.`);
      return;
    }
    try {
      const content = await file.text();
      if (content.slice(0, 2000).includes("\u0000")) {
        setMessage(`${file.name} looks like a binary file, not plain text.`);
        return;
      }
      setBulkText(content);
    } catch {
      setMessage(`Could not read ${file.name}.`);
    }
  }, []);

  const onBulkEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    bulkDepth.current += 1;
    setBulkDrag(true);
  };
  const onBulkOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  const onBulkLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    bulkDepth.current = Math.max(0, bulkDepth.current - 1);
    if (bulkDepth.current === 0) setBulkDrag(false);
  };
  const onBulkDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    bulkDepth.current = 0;
    setBulkDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void loadBulkFile(file);
  };

  return (
    <div className="space-y-6">
      <div className="card space-y-5 p-5">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div>
            <div
              className="h-40 w-full overflow-hidden rounded-xl border border-slate-300 dark:border-slate-600"
              style={CHECKER}
            >
              <div className="h-full w-full" style={{ backgroundColor: rgbaCss(color) }} />
            </div>
            {name && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                CSS name: <span className="font-semibold">{name}</span>
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="color-input"
                className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-100"
              >
                Enter any colour
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  aria-label="Colour picker"
                  value={toHex(color, false, false)}
                  onChange={(e) => onPicker(e.target.value)}
                  className="h-11 w-14 cursor-pointer rounded border border-slate-300 bg-transparent dark:border-slate-600"
                />
                <input
                  id="color-input"
                  type="text"
                  className="input font-mono"
                  value={text}
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="#4f46e5, rgb(79 70 229), hsl(243 75% 59%), oklch(…), tomato"
                  onChange={(e) => onTextChange(e.target.value)}
                  aria-invalid={invalid}
                />
              </div>
              {invalid && (
                <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
                  That is not a colour we can read. Try HEX, rgb(), hsl(), hwb(), oklch() or a CSS
                  name.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="color-alpha"
                className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-slate-100"
              >
                <span>Opacity</span>
                <span className="chip">{Math.round(color.a * 100)}%</span>
              </label>
              <input
                id="color-alpha"
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(color.a * 100)}
                onChange={(e) => onAlpha(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {eyeOk && (
                <button type="button" className="btn-secondary" onClick={pickFromScreen}>
                  Pick from screen
                </button>
              )}
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={upper}
                  onChange={(e) => setUpper(e.target.checked)}
                  className="h-4 w-4 accent-brand-600"
                />
                Uppercase HEX
              </label>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          <p>{message}</p>
          <button type="button" className="btn-ghost" onClick={() => setMessage(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="card space-y-2 p-5">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Converted values</p>
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {FORMATS.map((f) => {
            const value = formatColor(color, f.id, upper);
            return (
              <li key={f.id} className="flex items-center justify-between gap-3 py-2">
                <span className="w-16 shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {f.label}
                </span>
                <code className="min-w-0 flex-1 truncate font-mono text-sm text-slate-900 dark:text-slate-100">
                  {value}
                </code>
                <button
                  type="button"
                  className="btn-secondary shrink-0"
                  onClick={() => copy(f.id, value)}
                  aria-label={`Copy ${f.label} value`}
                >
                  {copiedId === f.id ? "Copied!" : "Copy"}
                </button>
              </li>
            );
          })}
        </ul>
        {(color.a < 1) && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            HSV and CMYK cannot store transparency, so they show the colour without opacity.
          </p>
        )}
      </div>

      <div className="card space-y-4 p-5">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Contrast (WCAG) — opacity is ignored
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { label: "White text on this colour", text: "#ffffff", ratio: whiteRatio },
            { label: "Black text on this colour", text: "#000000", ratio: blackRatio },
          ].map((item) => {
            const grade = wcag(item.ratio);
            return (
              <div key={item.label} className="space-y-2">
                <div
                  className="rounded-xl border border-slate-300 p-4 dark:border-slate-600"
                  style={{ backgroundColor: toHex(color, false, false), color: item.text }}
                >
                  <p className="text-lg font-bold">Aa — The quick brown fox</p>
                  <p className="text-sm">Small body text sample for readability.</p>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {item.label}:{" "}
                  <span className="font-semibold">{item.ratio.toFixed(2)} : 1</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge ok={grade.aa} label="AA normal" />
                  <Badge ok={grade.aaLarge} label="AA large" />
                  <Badge ok={grade.aaa} label="AAA normal" />
                  <Badge ok={grade.aaaLarge} label="AAA large" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card space-y-5 p-5">
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Tints and shades — click one to use it
          </p>
          <div className="flex flex-wrap gap-3">
            {shades.map((c, i) => (
              <Swatch key={i} color={c} onPick={applyColor} />
            ))}
          </div>
        </div>
        {schemes.map((scheme) => (
          <div key={scheme.name}>
            <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {scheme.name}
            </p>
            <div className="flex flex-wrap gap-3">
              {scheme.colors.map((c, i) => (
                <Swatch key={i} color={c} onPick={applyColor} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        className={`card space-y-3 p-5 ${bulkDrag ? "ring-2 ring-brand-500" : ""}`}
        onDragEnter={onBulkEnter}
        onDragOver={onBulkOver}
        onDragLeave={onBulkLeave}
        onDrop={onBulkDrop}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="bulk-input"
            className="text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            Bulk converter — one colour per line, or paste CSS
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Convert to"
              className="input w-auto"
              value={bulkFormat}
              onChange={(e) => setBulkFormat(e.target.value as FormatId)}
            >
              {FORMATS.map((f) => (
                <option key={f.id} value={f.id}>
                  Convert to {f.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => bulkFileRef.current?.click()}
            >
              Open file
            </button>
            <button type="button" className="btn-ghost" onClick={() => setBulkText("")}>
              Clear
            </button>
          </div>
        </div>
        <input
          ref={bulkFileRef}
          type="file"
          className="hidden"
          accept=".txt,.css,.scss,.sass,.less,.json,.csv,.md,.html,.svg,text/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void loadBulkFile(file);
            e.target.value = "";
          }}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <textarea
            id="bulk-input"
            className="input min-h-[200px] w-full font-mono text-sm"
            value={bulkText}
            spellCheck={false}
            placeholder="Paste colours or CSS here, or drop a text/CSS file…"
            onChange={(e) => setBulkText(e.target.value)}
          />
          <textarea
            aria-label="Converted output"
            className="input min-h-[200px] w-full font-mono text-sm"
            value={bulk.output}
            readOnly
            spellCheck={false}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
            {bulk.converted.toLocaleString()} line{bulk.converted === 1 ? "" : "s"} converted
            {bulk.invalid > 0 ? ` · ${bulk.invalid.toLocaleString()} not recognised` : ""}
            {bulk.truncated ? " · only the first 50,000 lines were processed" : ""}. Named colours
            inside CSS lines are left unchanged.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={bulk.output === ""}
              onClick={() => copy("bulk", bulk.output)}
            >
              {copiedId === "bulk" ? "Copied!" : "Copy"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={bulk.output === ""}
              onClick={() => saveText(bulk.output, "converted-colors.txt")}
            >
              Download .txt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
