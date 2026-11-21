"use client";

import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import {
  MARKDOWN_CSS,
  MAX_MARKDOWN_CHARS,
  buildHtmlDocument,
  renderMarkdown,
} from "@/lib/tools/markdown-core";

const SAMPLE = [
  "# Meet the Markdown Previewer",
  "",
  "Write on the left, read on the right. **Bold**, *italic*, ~~strikethrough~~ and `inline code` all work.",
  "",
  "## A quick checklist",
  "",
  "- [x] Type some Markdown",
  "- [x] Watch the preview update",
  "- [ ] Copy the HTML or download a page",
  "",
  "## Nested lists",
  "",
  "1. Plan",
  "   - Outline the page",
  "   - Collect the links",
  "2. Write",
  "3. Publish",
  "",
  "## A table",
  "",
  "| Tool | Category | Runs in browser |",
  "| :--- | :------: | --------------: |",
  "| Markdown Previewer | Developer | Yes |",
  "| CSV to JSON | Developer | Yes |",
  "",
  "## Code",
  "",
  "```js",
  "function greet(name) {",
  "  return 'Hello, ' + name + '!';",
  "}",
  "```",
  "",
  "> Raw HTML such as <script>alert(1)</script> is shown as plain text, never executed.",
  "",
  "Visit [ToolGlobe Pro](https://example.com) or read the docs at https://example.org/docs.",
  "",
  "---",
  "",
  "Happy writing!",
].join("\n");

function Ico({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const ICON_COPY = "M9 9h11v11H9z M5 15V4h11";
const ICON_DOWNLOAD = "M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3";
const ICON_UPLOAD = "M12 15V3m0 0l-4 4m4-4l4 4M4 17v3h16v-3";
const ICON_TRASH = "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3";
const ICON_SPARK = "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z";

function triggerDownload(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function extractTitle(markdown: string): string {
  const m = /^#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/m.exec(markdown);
  if (!m) return "Document";
  return m[1].replace(/[`*_~]/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").trim() || "Document";
}

function fileSlug(title: string): string {
  const s = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "document";
}

export default function MarkdownPreviewerTool() {
  const [text, setText] = useState<string>(SAMPLE);
  const [tab, setTab] = useState<"preview" | "html">("preview");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const deferred = useDeferredValue(text);
  const html = useMemo(() => renderMarkdown(deferred), [deferred]);
  const stale = deferred !== text;

  const stats = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    return {
      words,
      chars: text.length,
      lines: text ? text.split("\n").length : 0,
      minutes: Math.max(1, Math.round(words / 200)),
    };
  }, [text]);

  const flash = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 1800);
  }, []);

  const updateText = useCallback((value: string) => {
    if (value.length > MAX_MARKDOWN_CHARS) {
      setError("That is more than 10 MB of text. Please use a smaller document.");
      return;
    }
    setError(null);
    setText(value);
  }, []);

  const wrapSelection = useCallback(
    (before: string, after: string, placeholder: string) => {
      const el = taRef.current;
      if (!el) return;
      const s = el.selectionStart;
      const e = el.selectionEnd;
      const chosen = text.slice(s, e) || placeholder;
      updateText(text.slice(0, s) + before + chosen + after + text.slice(e));
      window.requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(s + before.length, s + before.length + chosen.length);
      });
    },
    [text, updateText]
  );

  const prefixLines = useCallback(
    (make: (index: number) => string) => {
      const el = taRef.current;
      if (!el) return;
      const s = el.selectionStart;
      const e = el.selectionEnd;
      const start = text.lastIndexOf("\n", s - 1) + 1;
      let end = text.indexOf("\n", e);
      if (end === -1) end = text.length;
      const block = text
        .slice(start, end)
        .split("\n")
        .map((line, idx) => make(idx) + line)
        .join("\n");
      updateText(text.slice(0, start) + block + text.slice(end));
      window.requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start, start + block.length);
      });
    },
    [text, updateText]
  );

  const insertTable = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    const s = el.selectionStart;
    const snippet = "\n| Column A | Column B |\n| --- | --- |\n| Cell | Cell |\n";
    updateText(text.slice(0, s) + snippet + text.slice(s));
    window.requestAnimationFrame(() => el.focus());
  }, [text, updateText]);

  const onFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      if (file.size > MAX_MARKDOWN_CHARS) {
        setError("That file is larger than 10 MB.");
        return;
      }
      try {
        const content = await file.text();
        updateText(content);
        flash("Loaded " + file.name);
      } catch {
        setError("Could not read that file.");
      }
      if (fileRef.current) fileRef.current.value = "";
    },
    [flash, updateText]
  );

  const copyHtml = useCallback(async () => {
    const ok = await copyToClipboard(html);
    if (ok) flash("HTML copied");
    else setError("Copy failed. Select the HTML tab and copy manually.");
  }, [html, flash]);

  const downloadHtml = useCallback(() => {
    const title = extractTitle(text);
    triggerDownload(buildHtmlDocument(html, title), fileSlug(title) + ".html", "text/html;charset=utf-8");
  }, [html, text]);

  const downloadMd = useCallback(() => {
    triggerDownload(text, fileSlug(extractTitle(text)) + ".md", "text/markdown;charset=utf-8");
  }, [text]);

  return (
    <div className="space-y-4">
      <style>{MARKDOWN_CSS}</style>
      <div className="card p-3 flex flex-wrap items-center gap-2">
        <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={copyHtml}>
          <Ico d={ICON_COPY} /> Copy HTML
        </button>
        <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={downloadHtml}>
          <Ico d={ICON_DOWNLOAD} /> Download .html
        </button>
        <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={downloadMd}>
          <Ico d={ICON_DOWNLOAD} /> Download .md
        </button>
        <button type="button" className="btn-ghost inline-flex items-center gap-2" onClick={() => fileRef.current?.click()}>
          <Ico d={ICON_UPLOAD} /> Open file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <button type="button" className="btn-ghost inline-flex items-center gap-2" onClick={() => updateText(SAMPLE)}>
          <Ico d={ICON_SPARK} /> Sample
        </button>
        <button
          type="button"
          className="btn-ghost inline-flex items-center gap-2"
          onClick={() => {
            updateText("");
            taRef.current?.focus();
          }}
        >
          <Ico d={ICON_TRASH} /> Clear
        </button>
        <span className="ml-auto text-sm opacity-80" role="status" aria-live="polite">
          {notice}
        </span>
      </div>

      {error && (
        <div className="card p-3 text-sm" role="alert">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-3 flex flex-col gap-3" aria-label="Markdown editor">
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className="btn-ghost" title="Bold" onClick={() => wrapSelection("**", "**", "bold text")}>
              <strong>B</strong>
            </button>
            <button type="button" className="btn-ghost" title="Italic" onClick={() => wrapSelection("*", "*", "italic text")}>
              <em>I</em>
            </button>
            <button type="button" className="btn-ghost" title="Strikethrough" onClick={() => wrapSelection("~~", "~~", "text")}>
              <s>S</s>
            </button>
            <button type="button" className="btn-ghost" title="Heading" onClick={() => prefixLines(() => "## ")}>
              H2
            </button>
            <button type="button" className="btn-ghost" title="Link" onClick={() => wrapSelection("[", "](https://)", "link text")}>
              Link
            </button>
            <button type="button" className="btn-ghost" title="Inline code" onClick={() => wrapSelection("`", "`", "code")}>
              {"</>"}
            </button>
            <button type="button" className="btn-ghost" title="Bulleted list" onClick={() => prefixLines(() => "- ")}>
              List
            </button>
            <button type="button" className="btn-ghost" title="Numbered list" onClick={() => prefixLines((n) => n + 1 + ". ")}>
              1.
            </button>
            <button type="button" className="btn-ghost" title="Task list" onClick={() => prefixLines(() => "- [ ] ")}>
              Task
            </button>
            <button type="button" className="btn-ghost" title="Quote" onClick={() => prefixLines(() => "> ")}>
              Quote
            </button>
            <button type="button" className="btn-ghost" title="Table" onClick={insertTable}>
              Table
            </button>
          </div>

          <textarea
            ref={taRef}
            className="input font-mono text-sm w-full"
            style={{ minHeight: 520, resize: "vertical" }}
            value={text}
            onChange={(e) => updateText(e.target.value)}
            spellCheck={false}
            placeholder="Type or paste Markdown here..."
            aria-label="Markdown source"
          />

          <div className="flex flex-wrap gap-2">
            <span className="chip">{stats.words.toLocaleString()} words</span>
            <span className="chip">{stats.chars.toLocaleString()} characters</span>
            <span className="chip">{stats.lines.toLocaleString()} lines</span>
            <span className="chip">~{stats.minutes} min read</span>
          </div>
        </section>

        <section className="card p-3 flex flex-col gap-3" aria-label="Output">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={tab === "preview" ? "btn-primary" : "btn-secondary"}
              aria-pressed={tab === "preview"}
              onClick={() => setTab("preview")}
            >
              Preview
            </button>
            <button
              type="button"
              className={tab === "html" ? "btn-primary" : "btn-secondary"}
              aria-pressed={tab === "html"}
              onClick={() => setTab("html")}
            >
              HTML
            </button>
            {stale && <span className="text-xs opacity-70 ml-auto">Rendering...</span>}
          </div>

          {tab === "preview" ? (
            <div
              className="md-preview"
              style={{ minHeight: 520, maxHeight: 700, overflow: "auto", padding: "0.25rem 0.5rem" }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <textarea
              className="input font-mono text-xs w-full"
              style={{ minHeight: 520, resize: "vertical" }}
              value={html}
              readOnly
              spellCheck={false}
              aria-label="Generated HTML"
            />
          )}
        </section>
      </div>
    </div>
  );
}
