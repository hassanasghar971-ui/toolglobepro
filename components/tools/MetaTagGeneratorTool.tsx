"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_INPUT,
  LIMITS,
  OG_TYPES,
  SAMPLE_INPUT,
  TWITTER_CARDS,
  buildHtml,
  buildNextMetadata,
  checkInput,
  clean,
  displayUrl,
  htmlOpenTag,
  isHttpUrl,
  lengthLevel,
  truncate,
} from "@/lib/meta-tag-engine";
import type { MetaInput } from "@/lib/meta-tag-engine";

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  max?: number;
  rows?: number;
  hint?: string;
}

function Field({ id, label, value, onChange, placeholder, max, rows, hint }: FieldProps) {
  const limit = max ?? 0;
  const count = clean(value).length;
  const level = limit > 0 ? lengthLevel(count, limit) : "ok";
  const lines = rows ?? 1;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-slate-800 dark:text-slate-200">
          {label}
        </label>
        {limit > 0 ? (
          <span
            className={
              "text-xs tabular-nums " +
              (level === "over" ? "font-semibold text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400")
            }
          >
            {count} / {limit}
          </span>
        ) : null}
      </div>
      {lines > 1 ? (
        <textarea
          id={id}
          className="input mt-2 w-full resize-y"
          rows={lines}
          placeholder={placeholder ?? ""}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          className="input mt-2 w-full"
          placeholder={placeholder ?? ""}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}

interface CheckProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function Check({ id, label, checked, onChange }: CheckProps) {
  return (
    <label htmlFor={id} className="flex items-center gap-3 text-sm text-slate-800 dark:text-slate-200">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function MetaTagGeneratorTool() {
  const [input, setInput] = useState<MetaInput>(DEFAULT_INPUT);
  const [format, setFormat] = useState<string>("html");
  const [notice, setNotice] = useState<string>("");
  const [badImage, setBadImage] = useState<string>("");

  function update<K extends keyof MetaInput>(key: K, value: MetaInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  const html = useMemo(() => buildHtml(input), [input]);
  const nextCode = useMemo(() => buildNextMetadata(input), [input]);
  const issues = useMemo(() => checkInput(input), [input]);
  const output = format === "html" ? html : nextCode;

  const title = clean(input.title);
  const description = clean(input.description);
  const ogTitle = clean(input.ogTitle) !== "" ? clean(input.ogTitle) : title;
  const ogDescription = clean(input.ogDescription) !== "" ? clean(input.ogDescription) : description;
  const imageUrl = input.ogImage.trim();
  const showImage = isHttpUrl(imageUrl) && badImage !== imageUrl;

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output);
      setNotice("Copied");
    } catch {
      setNotice("Copy failed. Select the code and copy it manually.");
    }
    window.setTimeout(() => setNotice(""), 2200);
  }

  return (
    <div className="space-y-6">
      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Page basics</h2>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => setInput(SAMPLE_INPUT)}>
              Load example
            </button>
            <button type="button" className="btn-ghost" onClick={() => setInput(DEFAULT_INPUT)}>
              Reset
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <Field
            id="mt-title"
            label="Page title"
            value={input.title}
            max={LIMITS.title}
            placeholder="Handmade Soy Candles - Free Shipping Over $40"
            onChange={(v) => update("title", v)}
          />
          <Field
            id="mt-desc"
            label="Meta description"
            value={input.description}
            max={LIMITS.description}
            rows={3}
            placeholder="A clear summary of the page in one or two sentences."
            onChange={(v) => update("description", v)}
          />
          <Field
            id="mt-url"
            label="Page URL (canonical)"
            value={input.url}
            placeholder="https://www.example.com/page"
            hint="Use the full address of this exact page."
            onChange={(v) => update("url", v)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="mt-author" label="Author (optional)" value={input.author} onChange={(v) => update("author", v)} />
            <Field
              id="mt-theme"
              label="Theme color (optional)"
              value={input.themeColor}
              placeholder="#ffffff"
              onChange={(v) => update("themeColor", v)}
            />
            <Field
              id="mt-lang"
              label="Page language code"
              value={input.language}
              placeholder="en"
              onChange={(v) => update("language", v)}
            />
            <Field
              id="mt-keywords"
              label="Keywords (optional)"
              value={input.keywords}
              placeholder="soy candles, gift, handmade"
              hint="Google ignores the keywords tag. Leave it empty if unsure."
              onChange={(v) => update("keywords", v)}
            />
          </div>
          <div className="space-y-2">
            <Check id="mt-index" label="Allow search engines to index this page" checked={input.index} onChange={(v) => update("index", v)} />
            <Check id="mt-follow" label="Allow search engines to follow links on this page" checked={input.follow} onChange={(v) => update("follow", v)} />
            <Check id="mt-basics" label="Include charset and viewport tags" checked={input.basics} onChange={(v) => update("basics", v)} />
          </div>
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Open Graph (Facebook, LinkedIn, WhatsApp)</h2>
        <div className="mt-3">
          <Check id="mt-og" label="Create Open Graph tags" checked={input.ogEnabled} onChange={(v) => update("ogEnabled", v)} />
        </div>
        {input.ogEnabled ? (
          <div className="mt-4 space-y-4">
            <Field
              id="mt-ogtitle"
              label="Share title (optional)"
              value={input.ogTitle}
              max={LIMITS.ogTitle}
              placeholder="Uses the page title if empty"
              onChange={(v) => update("ogTitle", v)}
            />
            <Field
              id="mt-ogdesc"
              label="Share description (optional)"
              value={input.ogDescription}
              max={LIMITS.ogDescription}
              rows={2}
              placeholder="Uses the meta description if empty"
              onChange={(v) => update("ogDescription", v)}
            />
            <Field
              id="mt-ogimage"
              label="Share image URL"
              value={input.ogImage}
              placeholder="https://www.example.com/images/share.jpg"
              hint="Recommended size: 1200 x 630 pixels."
              onChange={(v) => update("ogImage", v)}
            />
            <Field
              id="mt-ogalt"
              label="Image description (alt text)"
              value={input.ogImageAlt}
              onChange={(v) => update("ogImageAlt", v)}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="mt-ogtype" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Content type
                </label>
                <select
                  id="mt-ogtype"
                  className="input mt-2 w-full"
                  value={input.ogType}
                  onChange={(e) => update("ogType", e.target.value)}
                >
                  {OG_TYPES.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <Field id="mt-site" label="Site name" value={input.siteName} onChange={(v) => update("siteName", v)} />
              <Field id="mt-locale" label="Locale" value={input.locale} placeholder="en_US" onChange={(v) => update("locale", v)} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="card p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">X (Twitter) card</h2>
        <div className="mt-3">
          <Check id="mt-tw" label="Create X (Twitter) card tags" checked={input.twitterEnabled} onChange={(v) => update("twitterEnabled", v)} />
        </div>
        {input.twitterEnabled ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="mt-twcard" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Card type
              </label>
              <select
                id="mt-twcard"
                className="input mt-2 w-full"
                value={input.twitterCard}
                onChange={(e) => update("twitterCard", e.target.value)}
              >
                {TWITTER_CARDS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <Field id="mt-twsite" label="Site account" value={input.twitterSite} placeholder="@yoursite" onChange={(v) => update("twitterSite", v)} />
            <Field id="mt-twcreator" label="Author account" value={input.twitterCreator} placeholder="@author" onChange={(v) => update("twitterCreator", v)} />
          </div>
        ) : null}
      </div>

      <div className="card p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Check and preview</h2>
        {issues.length > 0 ? (
          <ul className="mt-3 space-y-2" role="status">
            {issues.map((msg) => (
              <li key={msg} className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                {msg}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
            No problems found.
          </p>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Search result preview</div>
            <div className="mt-2 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="text-xs text-slate-600 dark:text-slate-400">{displayUrl(input.url)}</div>
              <div className="mt-1 break-words text-lg text-blue-700 dark:text-blue-400">
                {truncate(title !== "" ? title : "Your page title", LIMITS.title)}
              </div>
              <div className="mt-1 break-words text-sm text-slate-700 dark:text-slate-300">
                {truncate(description !== "" ? description : "Your meta description will appear here.", LIMITS.description)}
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              An approximation. Google decides the final look and may rewrite your title or description.
            </p>
          </div>

          <div>
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Social share preview</div>
            <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="w-full bg-slate-100 dark:bg-slate-800" style={{ aspectRatio: "1200 / 630" }}>
                {showImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                    onError={() => setBadImage(imageUrl)}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                    No image preview
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="text-xs uppercase text-slate-500 dark:text-slate-400">{displayUrl(input.url)}</div>
                <div className="mt-1 break-words font-semibold text-slate-900 dark:text-white">
                  {ogTitle !== "" ? ogTitle : "Your share title"}
                </div>
                <div className="mt-1 break-words text-sm text-slate-600 dark:text-slate-400">
                  {truncate(ogDescription !== "" ? ogDescription : "Your share description", 120)}
                </div>
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              The preview image is loaded directly from the address you typed. The tags themselves are built in your browser.
            </p>
          </div>
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Your code</h2>
          <div className="flex gap-2">
            <button
              type="button"
              className={"chip" + (format === "html" ? " ring-2 ring-slate-900 dark:ring-white" : "")}
              onClick={() => setFormat("html")}
            >
              HTML
            </button>
            <button
              type="button"
              className={"chip" + (format === "next" ? " ring-2 ring-slate-900 dark:ring-white" : "")}
              onClick={() => setFormat("next")}
            >
              Next.js
            </button>
          </div>
        </div>

        <pre className="mt-3 max-h-96 overflow-auto rounded-xl bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
          <code>{output}</code>
        </pre>

        {format === "html" ? (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Paste these tags inside the head element of your page. Set the language on your html tag: <code>{htmlOpenTag(input)}</code>
          </p>
        ) : (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Put this in your page.tsx or layout.tsx (Next.js App Router). Theme color is set separately in the viewport export.
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primary" onClick={() => void copyOutput()}>
            Copy code
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => downloadText(output, format === "html" ? "meta-tags.html" : "metadata.ts")}
          >
            Download file
          </button>
          {notice ? <span className="text-sm text-slate-600 dark:text-slate-400">{notice}</span> : null}
        </div>
      </div>
    </div>
  );
}

export default MetaTagGeneratorTool;
