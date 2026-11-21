"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import { escapeHtml, renderMarkdown } from "./markdown";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

type ViewMode = "split" | "edit" | "preview";

const SAMPLE = [
  "# Welcome to the Markdown Previewer",
  "",
  "Write on the left, see the **live preview** on the right. Everything runs *inside your browser*.",
  "",
  "## Features",
  "",
  "- Headings, **bold**, *italic*, ~~strikethrough~~ and `inline code`",
  "- Links like [ToolGlobe Pro](https://toolglobe.pro) and autolinks: [https://example.com](https://example.com)",
  "- Nested lists:",
  "  1. First item",
  "  2. Second item",
  "",
  "### Task list",
  "",
  "- [x] Write some Markdown",
  "- [ ] Export the HTML",
  "",
  "### Table",
  "",
  "| Tool | Category | Size limit |",
  "| :--- | :-----: | ---------: |",
  "| Markdown Previewer | Text | 5 MB |",
  "| CSV to JSON | Data | 600 MB |",
  "",
  "### Code",
  "",
  "```js",
  "const greet = (name) => `Hello, ${name}!`;",
  "console.log(greet('world'));",
  "```",
  "",
  "> Block quotes work too.",
  "",
  "---",
  "",
  "Raw HTML such as <script>alert(1)</script> is escaped for your safety.",
  "",
].join("\n");

const PREVIEW_CSS = `
.md-preview{line-height:1.65;overflow-wrap:anywhere}
.md-preview>*:first-child{margin-top:0}
.md-preview h1,.md-preview h2,.md-preview h3,.md-preview h4,.md-preview h5,.md-preview h6{font-weight:700;line-height:1.25;margin:1.4em 0 .5em}
.md-preview h1{font-size:1.9em;padding-bottom:.25em;border-bottom:1px solid color-mix(in srgb,currentColor 20%,transparent)}
.md-preview h2{font-size:1.5em;padding-bottom:.2em;border-bottom:1px solid color-mix(in srgb,currentColor 15%,transparent)}
.md-preview h3{font-size:1.25em}
.md-preview h4{font-size:1.1em}
.md-preview p,.md-preview ul,.md-preview ol,.md-preview pre,.md-preview blockquote,.md-preview .md-table-wrap{margin:.8em 0}
.md-preview ul{list-style:disc;padding-left:1.6em}
.md-preview ol{list-style:decimal;padding-left:1.6em}
.md-preview li>ul,.md-preview li>ol{margin:.2em 0}
.md-preview li.md-task{list-style:none;margin-left:-1.3em}
.md-preview li.md-task input{margin-right:.4em}
.md-preview a{text-decoration:underline;text-underline-offset:2px;color:#2563eb}
.md-preview code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.9em;padding:.15em .35em;border-radius:.3rem;background:color-mix(in srgb,currentColor 10%,transparent)}
.md-preview pre{overflow:auto;padding:.8rem 1rem;border-radius:.6rem;background:color-mix(in srgb,currentColor 8%,transparent)}
.md-preview pre code{padding:0;background:transparent;font-size:.875em}
.md-preview blockquote{padding:.1em 1em;border-left:4px solid color-mix(in srgb,currentColor 30%,transparent);opacity:.85}
.md-preview hr{border:0;border-top:1px solid color-mix(in srgb,currentColor 25%,transparent);margin:1.6em 0}
.md-preview img{max-width:100%;height:auto;border-radius:.4rem}
.md-preview .md-table-wrap{overflow-x:auto}
.md-preview table{border-collapse:collapse;min-width:50%}
.md-preview th,.md-preview td{border:1px solid color-mix(in srgb,currentColor 25%,transparent);padding:.4em .75em}
.md-preview th{font-weight:600;background:color-mix(in srgb,currentColor 7%,transparent)}
`;

function Svg({ paths, size = 16 }: { paths: readonly string[]; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

const ICON_UPLOAD = ["M12 16V4", "M7 9l5-5 5 5", "M4 20h16"];
const ICON_DOWNLOAD = ["M12 4v12", "M7 11l5 5 5-5", "M4 20h16"];
const ICON_COPY = ["M9 9h11v11H9z", "M5 15V5a1 1 0 0 1 1-1h10"];
const ICON_TRASH = ["M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 13h10l1-13", "M9 7V4h6v3"];

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function buildStandaloneHtml(source: string): string {
  const { html, headings } = renderMarkdown(source, { idPrefix: "" });
  const title = headings[0]?.text || "Markdown Document";
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${escapeHtml(title)}</title>`,
    `<style>body{max-width:48rem;margin:2rem auto;padding:0 1rem;font-family:system-ui,-apple-system,Segoe UI,sans-serif}${PREVIEW_CSS}</style>`,
    "</head>",
    "<body>",
    '<article class="md-preview">',
    html,
    "</article>",
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

export function MarkdownPreviewerTool() {
  const [source, setSource] = useState(SAMPLE);
  const [view, setView] = useState<ViewMode>("split");
  const [showHtml, setShowHtml] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState<"html" | "md" | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const deferred = useDeferredValue(source);
  const result = useMemo(() => renderMarkdown(deferred, { idPrefix: "md-" }), [deferred]);
  const pending = deferred !== source;

  function flash(kind: "html" | "md") {
    setCopied(kind);
    window.setTimeout(() => setCopied((current) => (current === kind ? null : current)), 1800);
  }

  function wrapSelection(before: string, after: string, placeholder: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = source.slice(start, end) || placeholder;
    setSource(source.slice(0, start) + before + selected + after + source.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  function prefixLines(prefix: string | ((index: number) => string), placeholder: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const lineStart = source.lastIndexOf("\n", start - 1) + 1;
    const nextBreak = source.indexOf("\n", end);
    const lineEnd = nextBreak === -1 ? source.length : nextBreak;
    const block = source.slice(lineStart, lineEnd) || placeholder;
    const changed = block
      .split("\n")
      .map((line, index) => (typeof prefix === "function" ? prefix(index) : prefix) + line)
      .join("\n");
    setSource(source.slice(0, lineStart) + changed + source.slice(lineEnd));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(lineStart, lineStart + changed.length);
    });
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setNotice(`"${file.name}" is larger than 5 MB. Please choose a smaller Markdown file.`);
      return;
    }
    try {
      setSource(await file.text());
      setNotice(null);
    } catch {
      setNotice("That file could not be read.");
    }
  }

  function onPreviewClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const anchor = target.closest("a");
    const href = anchor?.getAttribute("href");
    if (anchor && href && href.startsWith("#")) {
      event.preventDefault();
      scrollToHeading(href.slice(1));
    }
  }

  function scrollToHeading(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const showEditor = view !== "preview";
  const showPreview = view !== "edit";

  return (
    <div className="space-y-4">
      <style>{PREVIEW_CSS}</style>

      <div className="card space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Layout">
            {(["split", "edit", "preview"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={view === mode ? "btn-primary" : "btn-secondary"}
                aria-pressed={view === mode}
                onClick={() => setView(mode)}
              >
                {mode === "split" ? "Split" : mode === "edit" ? "Editor" : "Preview"}
              </button>
            ))}
          </div>

          <div className="ml-auto flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              className="hidden"
              onChange={onFile}
            />
            <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => fileRef.current?.click()}>
              <Svg paths="{ICON_UPLOAD}"/> Open file
            </button>
            <button type="button" className="btn-ghost" onClick={() => setSource(SAMPLE)}>
              Sample
            </button>
            <button
              type="button"
              className="btn-ghost inline-flex items-center gap-2"
              onClick={() => setSource("")}
              disabled={source.length === 0}
            >
              <Svg paths="{ICON_TRASH}"/> Clear
            </button>
          </div>
        </div>

        {showEditor && (
          <div className="flex flex-wrap gap-1" role="toolbar" aria-label="Formatting">
            <button type="button" className="chip" aria-label="Bold" onClick={() => wrapSelection("**", "**", "bold text")}>
              <strong>B</strong>
            </button>
            <button type="button" className="chip" aria-label="Italic" onClick={() => wrapSelection("*", "*", "italic text")}>
              <em>I</em>
            </button>
            <button type="button" className="chip" aria-label="Strikethrough" onClick={() => wrapSelection("~~", "~~", "text")}>
              <s>S</s>
            </button>
            <button type="button" className="chip" aria-label="Inline code" onClick={() => wrapSelection("`", "`", "code")}>
              {"</>"}
            </button>
            <button type="button" className="chip" aria-label="Link" onClick={() => wrapSelection("[", "](https://)", "link text")}>
              Link
            </button>
            <button type="button" className="chip" aria-label="Heading" onClick={() => prefixLines("## ", "Heading")}>
              H2
            </button>
            <button type="button" className="chip" aria-label="Bulleted list" onClick={() => prefixLines("- ", "List item")}>
              • List
            </button>
            <button type="button" className="chip" aria-label="Numbered list" onClick={() => prefixLines((i) => `${i + 1}. `, "List item")}>
              1. List
            </button>
            <button type="button" className="chip" aria-label="Task list" onClick={() => prefixLines("- [ ] ", "Task")}>
              ☐ Task
            </button>
            <button type="button" className="chip" aria-label="Quote" onClick={() => prefixLines("> ", "Quote")}>
              Quote
            </button>
            <button type="button" className="chip" aria-label="Code block" onClick={() => wrapSelection("\n```\n", "\n```\n", "code")}>
              Code block
            </button>
          </div>
        )}

        {notice && (
          <p role="alert" className="text-sm text-red-600">
            {notice}
          </p>
        )}
      </div>

      <div className={view === "split" ? "grid gap-4 lg:grid-cols-2" : "grid gap-4"}>
        {showEditor && (
          <div className="card flex flex-col gap-2">
            <label htmlFor="md-source" className="text-sm font-semibold">
              Markdown
            </label>
            <textarea
              id="md-source"
              ref={textareaRef}
              className="input min-h-[420px] w-full resize-y font-mono text-sm"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              spellCheck={false}
              placeholder="Type or paste Markdown here…"
            />
          </div>
        )}

        {showPreview && (
          <div className="card flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold">{showHtml ? "HTML output" : "Live preview"}</h2>
              {pending && <span className="text-xs opacity-60">updating…</span>}
              <div className="ml-auto flex gap-1">
                <button
                  type="button"
                  className={showHtml ? "btn-primary" : "btn-secondary"}
                  aria-pressed={showHtml}
                  onClick={() => setShowHtml((v) => !v)}
                >
                  {showHtml ? "Show preview" : "Show HTML"}
                </button>
              </div>
            </div>
            {showHtml ? (
              <pre className="max-h-[520px] min-h-[420px] overflow-auto rounded-lg border border-black/10 p-3 text-xs dark:border-white/10">
                <code>{result.html}</code>
              </pre>
            ) : (
              <div
                className="md-preview max-h-[520px] min-h-[420px] overflow-auto rounded-lg border border-black/10 p-4 dark:border-white/10"
                onClick={onPreviewClick}
                dangerouslySetInnerHTML={{
                  __html: result.html || '<p style="opacity:.6">Nothing to preview yet.</p>',
                }}
              />
            )}
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="chip">{result.words.toLocaleString()} words</span>
          <span className="chip">{result.characters.toLocaleString()} characters</span>
          <span className="chip">{result.readingMinutes} min read</span>
          <span className="chip">{result.headings.length} headings</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2"
            onClick={async () => {
              if (await copyText(renderMarkdown(source, { idPrefix: "" }).html)) flash("html");
            }}
          >
            <Svg paths={ICON_COPY} /> {copied === "html" ? "Copied HTML!" : "Copy HTML"}
          </button>
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2"
            onClick={async () => {
              if (await copyText(source)) flash("md");
            }}
          >
            <Svg paths={ICON_COPY} /> {copied === "md" ? "Copied Markdown!" : "Copy Markdown"}
          </button>
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2"
            onClick={() =>
              downloadBlob(new Blob([buildStandaloneHtml(source)], { type: "text/html" }), "document.html")
            }
          >
            <Svg paths={ICON_DOWNLOAD} /> Download .html
          </button>
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2"
            onClick={() => downloadBlob(new Blob([source], { type: "text/markdown" }), "document.md")}
          >
            <Svg paths={ICON_DOWNLOAD} /> Download .md
          </button>
        </div>

        {result.headings.length > 0 && (
          <details>
            <summary className="cursor-pointer text-sm font-semibold">Document outline</summary>
            <ul className="mt-2 space-y-1 text-sm">
              {result.headings.map((heading, index) => (
                <li key={`${heading.id}-${index}`} style={{ paddingLeft: `${(heading.level - 1) * 14}px` }}>
                  <button type="button" className="btn-ghost text-left" onClick={() => scrollToHeading(heading.id)}>
                    {heading.text}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}

        <p className="text-xs opacity-70">
          Private by design: your Markdown is rendered locally and never uploaded. Raw HTML is escaped and only safe
          link protocols are allowed.
        </p>
      </div>
    </div>
  );
}

export default MarkdownPreviewerTool;
