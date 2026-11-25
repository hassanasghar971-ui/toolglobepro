"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import {
  BLOCK_LIMIT,
  MAX_FILE_BYTES,
  SMALL_FILE_BYTES,
  blocksToHtml,
  documentHtml,
  parseDocument,
} from "../../lib/markdown-engine";
import type {
  BlockNode,
  HeadingInfo,
  InlineNode,
  ParseStats,
  WorkerRequest,
  WorkerResponse,
} from "../../lib/markdown-engine";

const INLINE_PARSE_LIMIT = 50000;
const PAGE_BLOCKS = 200;
const LAYOUTS = ["split", "edit", "preview"] as const;
type Layout = (typeof LAYOUTS)[number];
const LAYOUT_LABELS: Record<Layout, string> = { split: "Split", edit: "Editor", preview: "Preview" };
const EMPTY_STATS: ParseStats = { words: 0, chars: 0, lines: 0, blocks: 0 };

const SOFT_BG = "color-mix(in srgb, currentColor 8%, transparent)";
const SOFT_BORDER = "color-mix(in srgb, currentColor 22%, transparent)";

const HEADING_CLASSES = [
  "",
  "text-3xl font-bold mt-6 mb-3",
  "text-2xl font-bold mt-6 mb-3",
  "text-xl font-semibold mt-5 mb-2",
  "text-lg font-semibold mt-4 mb-2",
  "text-base font-semibold mt-4 mb-2",
  "text-sm font-semibold mt-4 mb-2",
];

const BAR = String.fromCharCode(124);

function tableRow(cells: string[]): string {
  return BAR + " " + cells.join(" " + BAR + " ") + " " + BAR;
}

const SAMPLE = [
  "# Welcome to the Markdown previewer",
  "",
  "Type on the left and see the result on the right. Everything runs **in your browser**, so nothing is uploaded.",
  "",
  "## Text formatting",
  "",
  "You can write *italic*, **bold**, ~~strikethrough~~ and `inline code`. Visit [ToolGlobe Pro](https://example.com) or paste a bare link like https://example.org/docs.",
  "",
  "## Lists and tasks",
  "",
  "- Write your README",
  "- Check the headings",
  "  - Nested bullet",
  "- Export the HTML",
  "",
  "1. First step",
  "2. Second step",
  "3. Third step",
  "",
  "- [x] Draft the document",
  "- [ ] Proofread it",
  "",
  "## A table",
  "",
  tableRow(["Feature", "Supported", "Notes"]),
  tableRow(["---", ":---:", "---:"]),
  tableRow(["Tables", "Yes", "Alignment works"]),
  tableRow(["Task lists", "Yes", "Read only"]),
  "",
  "## Code",
  "",
  "```js",
  "function greet(name) {",
  "  return 'Hello, ' + name;",
  "}",
  "```",
  "",
  "> Blockquotes work too, and they can contain **formatting**.",
  "",
  "---",
  "",
  "Raw HTML such as <b>this</b> is shown as plain text for safety.",
].join("\n");

function formatBytes(n: number): string {
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  if (n < 1073741824) return (n / 1048576).toFixed(1) + " MB";
  return (n / 1073741824).toFixed(2) + " GB";
}

function renderInline(nodes: InlineNode[], keyBase: string, allowRemote: boolean): ReactNode[] {
  const out: ReactNode[] = [];
  nodes.forEach((n, idx) => {
    const key = keyBase + "-" + idx;
    if (n.type === "text") {
      out.push(n.text ?? "");
    } else if (n.type === "code") {
      out.push(
        <code key={key} className="rounded px-1 py-0.5 font-mono text-[0.9em]" style={{ background: SOFT_BG }}>
          {n.text ?? ""}
        </code>
      );
    } else if (n.type === "strong") {
      out.push(<strong key={key}>{renderInline(n.children ?? [], key, allowRemote)}</strong>);
    } else if (n.type === "em") {
      out.push(<em key={key}>{renderInline(n.children ?? [], key, allowRemote)}</em>);
    } else if (n.type === "del") {
      out.push(<del key={key}>{renderInline(n.children ?? [], key, allowRemote)}</del>);
    } else if (n.type === "br") {
      out.push(<br key={key} />);
    } else if (n.type === "link") {
      const href = n.href ?? "";
      const isHash = href.startsWith("#");
      out.push(
        <a
          key={key}
          href={href}
          title={n.title ? n.title : undefined}
          target={isHash ? undefined : "_blank"}
          rel={isHash ? undefined : "noopener noreferrer nofollow ugc"}
          className="font-medium underline underline-offset-2"
        >
          {renderInline(n.children ?? [], key, allowRemote)}
        </a>
      );
    } else if (n.type === "image") {
      const src = n.href ?? "";
      const alt = n.alt ?? "";
      if (src.startsWith("data:")) {
        out.push(<img key={key} src={src} alt={alt} title={n.title ? n.title : undefined} className="my-2 h-auto max-w-full rounded" />);
      } else if (allowRemote) {
        out.push(
          <img
            key={key}
            src={src}
            alt={alt}
            title={n.title ? n.title : undefined}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="my-2 h-auto max-w-full rounded"
          />
        );
      } else {
        out.push(
          <span key={key} className="chip" title={src}>
            {"Remote image blocked: " + (alt === "" ? "no description" : alt)}
          </span>
        );
      }
    }
  });
  return out;
}

function renderBlock(b: BlockNode, key: string, allowRemote: boolean, tight: boolean): ReactNode {
  if (b.type === "heading") {
    const level = Math.min(6, Math.max(1, b.level ?? 1));
    const Tag = ("h" + level) as "h1";
    return (
      <Tag key={key} id={b.id} className={HEADING_CLASSES[level]}>
        {renderInline(b.inline ?? [], key, allowRemote)}
      </Tag>
    );
  }
  if (b.type === "paragraph") {
    const inner = renderInline(b.inline ?? [], key, allowRemote);
    if (tight) return <span key={key}>{inner}</span>;
    return (
      <p key={key} className="my-3 break-words leading-7">
        {inner}
      </p>
    );
  }
  if (b.type === "code") {
    return (
      <div key={key} className="my-3">
        {b.lang ? <div className="chip mb-1 inline-block">{b.lang}</div> : null}
        <pre className="overflow-auto rounded-lg p-3 font-mono text-sm" style={{ background: SOFT_BG }}>
          <code>{b.text ?? ""}</code>
        </pre>
      </div>
    );
  }
  if (b.type === "quote") {
    return (
      <blockquote key={key} className="my-3 border-l-4 pl-4" style={{ borderColor: SOFT_BORDER }}>
        {renderBlocks(b.children ?? [], key, allowRemote, false)}
      </blockquote>
    );
  }
  if (b.type === "hr") {
    return <hr key={key} className="my-6" style={{ borderColor: SOFT_BORDER }} />;
  }
  if (b.type === "list") {
    const kids = (b.items ?? []).map((it, idx) => {
      const itemKey = key + "-i" + idx;
      return (
        <li key={itemKey} className={it.hasCheckbox ? "-ml-5 list-none" : undefined}>
          {it.hasCheckbox ? <input type="checkbox" checked={it.checked} disabled readOnly className="mr-2 align-middle" /> : null}
          {renderBlocks(it.blocks, itemKey, allowRemote, b.tight === true)}
        </li>
      );
    });
    if (b.ordered) {
      return (
        <ol key={key} start={b.start} className="my-3 list-decimal space-y-1 pl-6">
          {kids}
        </ol>
      );
    }
    return (
      <ul key={key} className="my-3 list-disc space-y-1 pl-6">
        {kids}
      </ul>
    );
  }
  if (b.type === "table") {
    const aligns = b.align ?? [];
    const alignFor = (c: number): "left" | "center" | "right" => {
      const a = aligns[c];
      return a === "center" ? "center" : a === "right" ? "right" : "left";
    };
    return (
      <div key={key} className="my-3 overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              {(b.header ?? []).map((cell, c) => (
                <th
                  key={key + "-h" + c}
                  className="border px-3 py-2 font-semibold"
                  style={{ borderColor: SOFT_BORDER, background: SOFT_BG, textAlign: alignFor(c) }}
                >
                  {renderInline(cell, key + "-h" + c, allowRemote)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(b.rows ?? []).map((row, r) => (
              <tr key={key + "-r" + r}>
                {row.map((cell, c) => (
                  <td
                    key={key + "-r" + r + "-c" + c}
                    className="border px-3 py-2"
                    style={{ borderColor: SOFT_BORDER, textAlign: alignFor(c) }}
                  >
                    {renderInline(cell, key + "-r" + r + "-c" + c, allowRemote)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return null;
}

function renderBlocks(blocks: BlockNode[], keyBase: string, allowRemote: boolean, tight: boolean): ReactNode[] {
  return blocks.map((b, idx) => renderBlock(b, keyBase + "-" + idx, allowRemote, tight));
}

export default function MarkdownPreviewerTool() {
  const [text, setText] = useState("");
  const [layout, setLayout] = useState<Layout>("split");
  const [blocks, setBlocks] = useState<BlockNode[]>([]);
  const [headings, setHeadings] = useState<HeadingInfo[]>([]);
  const [stats, setStats] = useState<ParseStats>(EMPTY_STATS);
  const [truncated, setTruncated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [shown, setShown] = useState(PAGE_BLOCKS);
  const [allowRemote, setAllowRemote] = useState(false);
  const [showOutline, setShowOutline] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [fileMode, setFileMode] = useState(false);

  const workerRef = useRef<{ w?: Worker }>({});
  const fileRef = useRef<{ f?: File }>({});
  const jobRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlsRef = useRef<string[]>([]);

  const stopWorker = useCallback(() => {
    const holder = workerRef.current;
    if (holder.w) {
      holder.w.terminate();
      holder.w = undefined;
    }
  }, []);

  const flash = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2500);
  }, []);

  const handleMessage = useCallback((event: MessageEvent<WorkerResponse>) => {
    const m = event.data;
    if (m.id !== jobRef.current) return;
    if (m.type === "result") {
      setBlocks(m.blocks ?? []);
      setHeadings(m.headings ?? []);
      setStats(m.stats ?? EMPTY_STATS);
      setTruncated(m.truncated === true);
      setBusy(false);
      setProgress(100);
    } else if (m.type === "blocks") {
      const add = m.blocks ?? [];
      const hs = m.headings ?? [];
      if (add.length > 0) setBlocks((prev) => prev.concat(add));
      if (hs.length > 0) setHeadings((prev) => prev.concat(hs));
    } else if (m.type === "progress") {
      const total = m.total ?? 0;
      setProgress(total > 0 ? Math.min(99, Math.round(((m.loaded ?? 0) / total) * 100)) : 0);
    } else if (m.type === "done") {
      setStats(m.stats ?? EMPTY_STATS);
      setTruncated(m.truncated === true);
      setBusy(false);
      setProgress(100);
    } else if (m.type === "error") {
      setError(m.message ?? "Processing failed.");
      setBusy(false);
    }
  }, []);

  const ensureWorker = useCallback((): boolean => {
    if (workerRef.current.w) return true;
    try {
      const w = new Worker(new URL("./markdown-previewer.worker.ts", import.meta.url));
      w.onmessage = handleMessage;
      w.onerror = () => {
        setError("The background worker stopped unexpectedly. Try a smaller file.");
        setBusy(false);
      };
      workerRef.current.w = w;
      return true;
    } catch {
      setError("Web Workers are not available in this browser.");
      return false;
    }
  }, [handleMessage]);

  const runText = useCallback(
    (value: string) => {
      jobRef.current += 1;
      const id = jobRef.current;
      setError("");
      stopWorker();
      if (value.length <= INLINE_PARSE_LIMIT) {
        try {
          const r = parseDocument(value);
          setBlocks(r.blocks);
          setHeadings(r.headings);
          setStats(r.stats);
          setTruncated(false);
          setBusy(false);
          setProgress(0);
        } catch {
          setError("Could not render this Markdown.");
        }
        return;
      }
      if (!ensureWorker()) return;
      setBusy(true);
      setProgress(0);
      const req: WorkerRequest = { type: "parse-text", id, text: value };
      workerRef.current.w?.postMessage(req);
    },
    [ensureWorker, stopWorker]
  );

  const runFile = useCallback(
    (file: File) => {
      jobRef.current += 1;
      const id = jobRef.current;
      stopWorker();
      if (!ensureWorker()) return;
      setBlocks([]);
      setHeadings([]);
      setStats(EMPTY_STATS);
      setTruncated(false);
      setShown(PAGE_BLOCKS);
      setBusy(true);
      setProgress(0);
      setError("");
      const req: WorkerRequest = { type: "parse-file", id, file };
      workerRef.current.w?.postMessage(req);
    },
    [ensureWorker, stopWorker]
  );

  const loadFile = useCallback(
    async (file: File) => {
      setError("");
      setNotice("");
      if (file.size > MAX_FILE_BYTES) {
        setError("That file is " + formatBytes(file.size) + ". The limit is 600 MB.");
        return;
      }
      fileRef.current.f = file;
      setFileName(file.name);
      setFileSize(file.size);
      if (file.size <= SMALL_FILE_BYTES) {
        try {
          const content = await file.text();
          setFileMode(false);
          setText(content.charCodeAt(0) === 0xfeff ? content.slice(1) : content);
        } catch {
          setError("Could not read that file.");
        }
        return;
      }
      setFileMode(true);
      setText("");
      runFile(file);
    },
    [runFile]
  );

  useEffect(() => {
    if (fileMode) return undefined;
    const delay = text.length > INLINE_PARSE_LIMIT ? 400 : 150;
    const t = window.setTimeout(() => runText(text), delay);
    return () => window.clearTimeout(t);
  }, [text, fileMode, runText]);

  useEffect(() => {
    const holder = workerRef.current;
    const urls = urlsRef.current;
    return () => {
      if (holder.w) {
        holder.w.terminate();
        holder.w = undefined;
      }
      for (const u of urls) URL.revokeObjectURL(u);
      urls.length = 0;
    };
  }, []);

  const download = useCallback((name: string, content: BlobPart, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    urlsRef.current.push(url);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
      const idx = urlsRef.current.indexOf(url);
      if (idx >= 0) urlsRef.current.splice(idx, 1);
    }, 15000);
  }, []);

  const copy = useCallback(
    async (value: string, label: string) => {
      try {
        await navigator.clipboard.writeText(value);
        flash(label + " copied to clipboard");
      } catch {
        setError("Copy failed because the browser blocked clipboard access.");
      }
    },
    [flash]
  );

  const baseName = fileName === "" ? "document" : fileName.replace(/\.[^.]+$/, "");

  const cancel = useCallback(() => {
    jobRef.current += 1;
    stopWorker();
    setBusy(false);
    flash("Stopped. Showing what was processed so far.");
  }, [flash, stopWorker]);

  const clearAll = useCallback(() => {
    jobRef.current += 1;
    stopWorker();
    fileRef.current.f = undefined;
    setText("");
    setBlocks([]);
    setHeadings([]);
    setStats(EMPTY_STATS);
    setTruncated(false);
    setFileMode(false);
    setFileName("");
    setFileSize(0);
    setError("");
    setNotice("");
    setBusy(false);
    setProgress(0);
    setShown(PAGE_BLOCKS);
  }, [stopWorker]);

  const loadSample = useCallback(() => {
    jobRef.current += 1;
    stopWorker();
    fileRef.current.f = undefined;
    setFileMode(false);
    setFileName("");
    setFileSize(0);
    setError("");
    setText(SAMPLE);
  }, [stopWorker]);

  const scrollToId = useCallback(
    (id: string) => {
      const go = (): boolean => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return true;
        }
        return false;
      };
      if (!go()) {
        setShown(blocks.length);
        window.setTimeout(() => {
          go();
        }, 80);
      }
    },
    [blocks.length]
  );

  const onPreviewClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href") ?? "";
    if (href.startsWith("#md-")) {
      e.preventDefault();
      scrollToId(href.slice(1));
    }
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) void loadFile(f);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void loadFile(f);
    e.target.value = "";
  };

  const previewNodes = useMemo(
    () => renderBlocks(blocks.slice(0, shown), "b", allowRemote, false),
    [blocks, shown, allowRemote]
  );

  const readingMinutes = stats.words > 0 ? Math.max(1, Math.ceil(stats.words / 220)) : 0;
  const hasContent = fileMode ? blocks.length > 0 : text !== "";
  const paneClass = layout === "split" ? "grid gap-4 lg:grid-cols-2" : "grid gap-4";

  return (
    <div
      className={dragging ? "space-y-4 rounded-xl ring-2 ring-offset-2" : "space-y-4"}
      onDragOver={onDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      aria-busy={busy}
    >
      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primary" onClick={() => inputRef.current?.click()}>
            Open Markdown file
          </button>
          <button type="button" className="btn-secondary" onClick={loadSample}>
            Load sample
          </button>
          <button type="button" className="btn-ghost" onClick={clearAll} disabled={!hasContent && fileName === ""}>
            Clear
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".md,.markdown,.mdown,.txt,text/markdown,text/plain"
            className="hidden"
            onChange={onPick}
          />
          <span className="mx-1 hidden h-6 w-px sm:inline-block" style={{ background: SOFT_BORDER }} />
          {LAYOUTS.map((l) => (
            <button
              key={l}
              type="button"
              className={layout === l ? "btn-primary" : "btn-secondary"}
              aria-pressed={layout === l}
              onClick={() => setLayout(l)}
            >
              {LAYOUT_LABELS[l]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-secondary"
            disabled={fileMode || text === ""}
            onClick={() => void copy(text, "Markdown")}
          >
            Copy Markdown
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={!fileMode && text === ""}
            onClick={() => {
              const f = fileRef.current.f;
              if (fileMode && f) download(baseName + ".md", f, "text/markdown;charset=utf-8");
              else download(baseName + ".md", text, "text/markdown;charset=utf-8");
            }}
          >
            Download .md
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={blocks.length === 0}
            onClick={() => void copy(blocksToHtml(blocks, allowRemote), "HTML")}
          >
            Copy HTML
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={blocks.length === 0}
            onClick={() => download(baseName + ".html", documentHtml(baseName, blocks, allowRemote), "text/html;charset=utf-8")}
          >
            Download .html
          </button>
        </div>
        <p className="text-xs opacity-70">
          Drop a .md or .txt file anywhere on this tool. Files up to 600 MB are read in chunks inside your browser and never uploaded.
        </p>
      </div>

      {error !== "" ? (
        <div role="alert" className="card p-3 text-sm" style={{ borderColor: "#dc2626" }}>
          {error}
        </div>
      ) : null}

      {busy ? (
        <div className="card p-3" role="status" aria-live="polite">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span>
              {fileMode ? "Reading " + fileName + " in chunks (" + progress + "%)" : "Rendering a large document"}
            </span>
            <button type="button" className="btn-ghost" onClick={cancel}>
              Cancel
            </button>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: SOFT_BG }}>
            <div
              className={fileMode ? "h-full rounded-full" : "h-full animate-pulse rounded-full"}
              style={{
                width: fileMode ? progress + "%" : "100%",
                background: "currentColor",
                opacity: 0.6,
                transition: "width 150ms linear",
              }}
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2" aria-live="polite">
        <span className="chip">{stats.words.toLocaleString()} words</span>
        <span className="chip">{stats.chars.toLocaleString()} characters</span>
        <span className="chip">{stats.lines.toLocaleString()} lines</span>
        <span className="chip">{readingMinutes === 0 ? "No reading time yet" : readingMinutes + " min read"}</span>
        {fileName !== "" ? <span className="chip">{fileName + " (" + formatBytes(fileSize) + ")"}</span> : null}
        {notice !== "" ? <span className="text-sm font-medium">{notice}</span> : null}
      </div>

      {truncated ? (
        <div className="card p-3 text-sm">
          {"This file is very large, so the preview and HTML export cover the first " +
            BLOCK_LIMIT.toLocaleString() +
            " blocks. Word, character and line counts include the whole file, and Download .md returns the original."}
        </div>
      ) : null}

      <div className={paneClass}>
        {layout !== "preview" ? (
          <div className="card min-w-0 p-3">
            <label htmlFor="md-input" className="mb-2 block text-sm font-semibold">
              Markdown source
            </label>
            <textarea
              id="md-input"
              className="input w-full font-mono text-sm"
              style={{ minHeight: "60vh", resize: "vertical" }}
              value={text}
              disabled={fileMode}
              spellCheck={false}
              placeholder="Type or paste Markdown here, or open a file."
              onChange={(e) => setText(e.target.value)}
            />
            {fileMode ? (
              <p className="mt-2 text-xs opacity-70">
                Large files are previewed without loading them into the editor. Clear the tool to type again.
              </p>
            ) : null}
          </div>
        ) : null}

        {layout !== "edit" ? (
          <div className="card min-w-0 p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Preview</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={showOutline} onChange={(e) => setShowOutline(e.target.checked)} />
                  Outline
                </label>
                <label className="flex items-center gap-1" title="Remote images contact the image host and reveal your IP address.">
                  <input type="checkbox" checked={allowRemote} onChange={(e) => setAllowRemote(e.target.checked)} />
                  Load remote images
                </label>
              </div>
            </div>
            <div className="flex gap-4">
              {showOutline && headings.length > 0 ? (
                <nav aria-label="Document outline" className="hidden max-h-[70vh] w-48 shrink-0 overflow-auto text-sm md:block">
                  {headings.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      className="block w-full truncate rounded py-1 pr-2 text-left hover:underline"
                      style={{ paddingLeft: 8 + (h.level - 1) * 12 }}
                      onClick={() => scrollToId(h.id)}
                    >
                      {h.text === "" ? "(empty heading)" : h.text}
                    </button>
                  ))}
                </nav>
              ) : null}
              <div className="max-h-[70vh] min-w-0 flex-1 overflow-auto pr-2" onClick={onPreviewClick}>
                {blocks.length === 0 ? (
                  <p className="text-sm opacity-70">
                    {busy ? "Waiting for the first blocks." : "Your rendered Markdown appears here."}
                  </p>
                ) : (
                  previewNodes
                )}
                {blocks.length > shown ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" className="btn-secondary" onClick={() => setShown(shown + PAGE_BLOCKS)}>
                      Show more
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => setShown(blocks.length)}>
                      {"Show all (" + blocks.length.toLocaleString() + " blocks)"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
