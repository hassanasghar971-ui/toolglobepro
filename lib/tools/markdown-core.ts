/**
 * Markdown core: a small, dependency-free renderer that is safe by construction.
 *
 * - Every piece of text is HTML-escaped. Raw HTML in the source is shown as text.
 * - Link URLs allow only http, https, mailto, tel and relative targets.
 * - Image URLs allow only http, https and relative targets.
 * - Heading ids are prefixed with "md-" so they can never clobber page globals.
 */
export const MAX_MARKDOWN_CHARS = 10 * 1024 * 1024;
const MAX_DEPTH = 12;
const MAX_INLINE = 100000;

interface RenderContext {
  ids: Record<string, number>;
}

const BLANK = /^\s*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})([^`]*)$/;
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const HR = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const QUOTE = /^ {0,3}>/;
const QUOTE_STRIP = /^ {0,3}> ?/;
const ITEM = /^( *)([-*+]|\d{1,9}[.)])(?:[ \t]+(.*))?$/;
const SETEXT = /^ {0,3}(=+|-+)[ \t]*$/;
const TABLE_DELIM = /^[ \t]*\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;
const CODE_SPAN = /(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g;
const ESCAPES = /\\([!-\/:-@\[-`{-~])/g;
const AUTOLINK = /<((?:https?:\/\/|mailto:)[^\s<>]+)>/gi;
const IMAGE = /!\[([^\[\]]*)\]\(\s*(<[^<>\n]*>|[^\s()]*(?:\([^\s()]*\)[^\s()]*)*)(?:\s+(?:"([^"]*)"|'([^']*)'))?\s*\)/g;
const LINK = /\[((?:[^\[\]]|\[[^\[\]]*\])*)\]\(\s*(<[^<>\n]*>|[^\s()]*(?:\([^\s()]*\)[^\s()]*)*)(?:\s+(?:"([^"]*)"|'([^']*)'))?\s*\)/g;
const BARE_URL = /(^|[\s(])(https?:\/\/[^\s<>"\u0000]*[^\s<>"'.,;:!?)\]*_~\u0000])/g;

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Returns a cleaned URL, or null when the scheme is not allowed. */
export function sanitizeUrl(raw: string, kind: "link" | "image"): string | null {
  const url = raw.replace(/[\u0000-\u0020\u007f-\u009f\u00a0-\u00a0\u2028\u2029]+/g, "");
  if (url.length === 0) return null;
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.\-]*):/.exec(url);
  if (!scheme) return url;
  const allowed = kind === "image" ? ["http", "https"] : ["http", "https", "mailto", "tel"];
  return allowed.indexOf(scheme[1].toLowerCase()) !== -1 ? url : null;
}

function rep(ch: string, n: number): string {
  return new Array(n + 1).join(ch);
}

function leading(line: string): number {
  return line.length - line.replace(/^ +/, "").length;
}

function stripAngles(dest: string): string {
  return dest.charAt(0) === "<" && dest.charAt(dest.length - 1) === ">" ? dest.slice(1, -1) : dest;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function anchor(url: string, inner: string, title?: string): string {
  const external = /^(?:https?:)?\/\//i.test(url);
  return (
    '<a href="' +
    escapeHtml(url) +
    '"' +
    (title ? ' title="' + title + '"' : "") +
    (external ? ' target="_blank" rel="noopener noreferrer nofollow"' : "") +
    ">" +
    inner +
    "</a>"
  );
}

/** Escapes text and applies emphasis. Placeholders (\u0000N\u0001) pass through untouched. */
function formatInline(s: string): string {
  let t = escapeHtml(s);
  if (t.length > MAX_INLINE) return t;
  t = t.replace(/\*\*\*(?=\S)([\s\S]*?\S)\*\*\*/g, "<strong><em>$1</em></strong>");
  t = t.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(^|[^\w])__(?=\S)([\s\S]*?\S)__(?!\w)/g, "$1<strong>$2</strong>");
  t = t.replace(/\*(?=\S)([\s\S]*?\S)\*/g, "<em>$1</em>");
  t = t.replace(/(^|[^\w])_(?=\S)([\s\S]*?\S)_(?!\w)/g, "$1<em>$2</em>");
  t = t.replace(/~~(?=\S)([\s\S]*?\S)~~/g, "<del>$1</del>");
  t = t.replace(/ {2,}\n/g, "<br>\n").replace(/\\\n/g, "<br>\n");
  return t;
}

function renderInline(src: string): string {
  if (src.length > MAX_INLINE) return escapeHtml(src);
  const store: string[] = [];
  const put = (html: string): string => {
    store.push(html);
    return "\u0000" + (store.length - 1) + "\u0001";
  };
  const restore = (t: string): string => {
    let out = t;
    for (let k = 0; k < 8 && out.indexOf("\u0000") !== -1; k++) {
      out = out.replace(/\u0000(\d+)\u0001/g, (_m: string, n: string) => store[parseInt(n, 10)] || "");
    }
    return out;
  };
  const attrText = (raw: string): string => stripTags(restore(escapeHtml(raw)));

  let s = src.replace(/[\u0000\u0001]/g, "");
  s = s.replace(CODE_SPAN, (_m: string, _ticks: string, code: string) =>
    put("<code>" + escapeHtml(code.replace(/\n/g, " ").trim()) + "</code>")
  );
  s = s.replace(ESCAPES, (_m: string, ch: string) => put(escapeHtml(ch)));
  s = s.replace(AUTOLINK, (_m: string, url: string) => {
    const safe = sanitizeUrl(url, "link");
    return put(safe ? anchor(safe, escapeHtml(url)) : escapeHtml("<" + url + ">"));
  });
  s = s.replace(
    IMAGE,
    (_m: string, alt: string, dest: string, t1: string | undefined, t2: string | undefined) => {
      const url = sanitizeUrl(stripAngles(dest), "image");
      const altText = attrText(alt);
      if (!url) return put(altText);
      const title = t1 !== undefined ? t1 : t2;
      return put(
        '<img src="' +
          escapeHtml(url) +
          '" alt="' +
          altText +
          '"' +
          (title ? ' title="' + attrText(title) + '"' : "") +
          ' loading="lazy">'
      );
    }
  );
  s = s.replace(
    LINK,
    (_m: string, text: string, dest: string, t1: string | undefined, t2: string | undefined) => {
      const url = sanitizeUrl(stripAngles(dest), "link");
      const inner = formatInline(text);
      if (!url) return put(inner);
      const title = t1 !== undefined ? t1 : t2;
      return put(anchor(url, inner, title ? attrText(title) : undefined));
    }
  );
  s = s.replace(BARE_URL, (_m: string, pre: string, url: string) => pre + put(anchor(url, escapeHtml(url))));
  return restore(formatInline(s));
}

function headingId(raw: string, ctx: RenderContext): string {
  const plain = raw.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*_~\\]/g, "");
  let base = plain
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u00c0-\uffff_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!base) base = "section";
  base = "md-" + base;
  const seen = ctx.ids[base] || 0;
  ctx.ids[base] = seen + 1;
  return seen === 0 ? base : base + "-" + seen;
}

function renderHeading(level: number, text: string, ctx: RenderContext): string {
  const clean = text.trim();
  return "<h" + level + ' id="' + headingId(clean, ctx) + '">' + renderInline(clean) + "</h" + level + ">";
}

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.charAt(0) === "|") s = s.slice(1);
  if (s.charAt(s.length - 1) === "|" && s.charAt(s.length - 2) !== "\\") s = s.slice(0, -1);
  const cells: string[] = [];
  let cur = "";
  for (let k = 0; k < s.length; k++) {
    const ch = s.charAt(k);
    if (ch === "\\" && s.charAt(k + 1) === "|") {
      cur += "|";
      k++;
    } else if (ch === "|") {
      cells.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

function isTableStart(lines: string[], i: number): boolean {
  if (i + 1 >= lines.length) return false;
  if (lines[i].indexOf("|") === -1) return false;
  if (!TABLE_DELIM.test(lines[i + 1])) return false;
  return splitRow(lines[i]).length === splitRow(lines[i + 1]).length;
}

function startsBlock(lines: string[], i: number): boolean {
  const l = lines[i];
  if (FENCE.test(l) || HEADING.test(l) || HR.test(l) || QUOTE.test(l)) return true;
  const m = ITEM.exec(l);
  if (m && leading(l) < 4 && m[3] !== undefined && m[3] !== "") {
    return /^[-*+]$/.test(m[2]) || /^1[.)]$/.test(m[2]);
  }
  return isTableStart(lines, i);
}

interface ListItem {
  lines: string[];
  contentIndent: number;
}

function renderList(
  lines: string[],
  start: number,
  ctx: RenderContext,
  depth: number
): { html: string; next: number } {
  const first = ITEM.exec(lines[start]) as RegExpExecArray;
  const baseIndent = first[1].length;
  const ordered = /^\d/.test(first[2]);
  const startNum = ordered ? parseInt(first[2], 10) : 1;
  const items: ListItem[] = [];
  let loose = false;
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
    if (BLANK.test(line)) {
      let j = i + 1;
      while (j < lines.length && BLANK.test(lines[j])) j++;
      if (j >= lines.length) {
        i = j;
        break;
      }
      const nxt = lines[j];
      const nm = ITEM.exec(nxt);
      const nIndent = leading(nxt);
      const sibling = nm !== null && nIndent >= baseIndent && nIndent <= baseIndent + 1 && /^\d/.test(nm[2]) === ordered;
      const continuation = !sibling && nIndent > baseIndent && items.length > 0;
      if (sibling) {
        loose = true;
        i = j;
        continue;
      }
      if (continuation) {
        if (nm === null) loose = true;
        items[items.length - 1].lines.push("");
        i = j;
        continue;
      }
      break;
    }

    const m = ITEM.exec(line);
    const indent = leading(line);
    if (m && indent >= baseIndent && indent <= baseIndent + 1) {
      if (/^\d/.test(m[2]) !== ordered) break;
      const markerEnd = m[1].length + m[2].length;
      const spaces = /^[ \t]*/.exec(line.slice(markerEnd));
      const sp = spaces ? spaces[0].length : 0;
      items.push({
        lines: [m[3] !== undefined ? m[3] : ""],
        contentIndent: markerEnd + (sp > 0 && sp <= 4 ? sp : 1),
      });
      i++;
      continue;
    }

    if (items.length === 0) break;
    const cur = items[items.length - 1];
    if (indent > baseIndent) {
      cur.lines.push(line.slice(Math.min(indent, cur.contentIndent)));
      i++;
      continue;
    }
    if (m) break;
    const prev = cur.lines[cur.lines.length - 1];
    if (!BLANK.test(prev) && !startsBlock(lines, i)) {
      cur.lines.push(line.trim());
      i++;
      continue;
    }
    break;
  }

  const rendered: string[] = [];
  for (let k = 0; k < items.length; k++) {
    const it = items[k];
    const task = /^\[([ xX])\][ \t]+/.exec(it.lines[0]);
    let prefix = "";
    if (task) {
      prefix = '<input type="checkbox" disabled' + (task[1] !== " " ? " checked" : "") + "> ";
      it.lines[0] = it.lines[0].slice(task[0].length);
    }
    const inner = renderBlocks(it.lines, ctx, depth + 1, !loose);
    rendered.push("<li" + (task ? ' class="task"' : "") + ">" + prefix + inner + "</li>");
  }

  const open = ordered ? "<ol" + (startNum !== 1 ? ' start="' + startNum + '"' : "") + ">" : "<ul>";
  const close = ordered ? "</ol>" : "</ul>";
  return { html: open + "\n" + rendered.join("\n") + "\n" + close, next: i };
}

function renderBlocks(lines: string[], ctx: RenderContext, depth: number, tight: boolean): string {
  if (depth > MAX_DEPTH) return "<p>" + escapeHtml(lines.join("\n")) + "</p>";
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (BLANK.test(line)) {
      i++;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      const marker = fence[1];
      const ch = marker.charAt(0);
      const lang = fence[2].trim().split(/\s+/)[0].replace(/[^\w+#.\-]/g, "");
      const indent = leading(line);
      const code: string[] = [];
      i++;
      while (i < lines.length) {
        const t = lines[i].trim();
        if (t.length >= marker.length && t === rep(ch, t.length) && leading(lines[i]) < 4) {
          i++;
          break;
        }
        code.push(indent > 0 ? lines[i].replace(new RegExp("^ {0," + indent + "}"), "") : lines[i]);
        i++;
      }
      out.push(
        "<pre><code" + (lang ? ' class="language-' + lang + '"' : "") + ">" + escapeHtml(code.join("\n")) + "</code></pre>"
      );
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      out.push(renderHeading(heading[1].length, heading[2] || "", ctx));
      i++;
      continue;
    }

    if (HR.test(line)) {
      out.push("<hr>");
      i++;
      continue;
    }

    if (QUOTE.test(line)) {
      const inner: string[] = [];
      while (i < lines.length) {
        const l = lines[i];
        if (QUOTE.test(l)) {
          inner.push(l.replace(QUOTE_STRIP, ""));
          i++;
        } else if (
          !BLANK.test(l) &&
          inner.length > 0 &&
          !BLANK.test(inner[inner.length - 1]) &&
          !startsBlock(lines, i)
        ) {
          inner.push(l);
          i++;
        } else {
          break;
        }
      }
      out.push("<blockquote>\n" + renderBlocks(inner, ctx, depth + 1, false) + "\n</blockquote>");
      continue;
    }

    if (ITEM.test(line) && leading(line) < 4) {
      const list = renderList(lines, i, ctx, depth);
      out.push(list.html);
      i = list.next;
      continue;
    }

    if (isTableStart(lines, i)) {
      const head = splitRow(lines[i]);
      const aligns = splitRow(lines[i + 1]).map((c) => {
        const left = c.charAt(0) === ":";
        const right = c.charAt(c.length - 1) === ":";
        return left && right ? "center" : right ? "right" : left ? "left" : "";
      });
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && !BLANK.test(lines[i]) && lines[i].indexOf("|") !== -1) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      const cell = (tag: string, text: string, k: number): string =>
        "<" + tag + (aligns[k] ? ' style="text-align:' + aligns[k] + '"' : "") + ">" + renderInline(text) + "</" + tag + ">";
      const thead = "<thead><tr>" + head.map((c, k) => cell("th", c, k)).join("") + "</tr></thead>";
      const bodyRows = rows.map((r) => {
        const cells: string[] = [];
        for (let k = 0; k < head.length; k++) cells.push(cell("td", r[k] !== undefined ? r[k] : "", k));
        return "<tr>" + cells.join("") + "</tr>";
      });
      out.push("<table>" + thead + (bodyRows.length ? "<tbody>" + bodyRows.join("") + "</tbody>" : "") + "</table>");
      continue;
    }

    if (/^ {4}/.test(line)) {
      const code: string[] = [];
      while (i < lines.length) {
        if (/^ {4}/.test(lines[i])) {
          code.push(lines[i].slice(4));
          i++;
        } else if (BLANK.test(lines[i])) {
          let j = i;
          while (j < lines.length && BLANK.test(lines[j])) j++;
          if (j < lines.length && /^ {4}/.test(lines[j])) {
            code.push("");
            i = j;
          } else {
            break;
          }
        } else {
          break;
        }
      }
      out.push("<pre><code>" + escapeHtml(code.join("\n")) + "</code></pre>");
      continue;
    }

    const para: string[] = [];
    let setextLevel = 0;
    while (i < lines.length) {
      const l = lines[i];
      if (BLANK.test(l)) break;
      if (para.length > 0) {
        const se = SETEXT.exec(l);
        if (se) {
          setextLevel = se[1].charAt(0) === "=" ? 1 : 2;
          i++;
          break;
        }
        if (startsBlock(lines, i)) break;
      }
      para.push(l);
      i++;
    }

    const text = para
      .map((l, idx) => (idx === para.length - 1 ? l.trim() : l.replace(/^\s+/, "")))
      .join("\n");
    if (setextLevel > 0) {
      out.push(renderHeading(setextLevel, text.replace(/\n/g, " "), ctx));
    } else if (tight) {
      out.push(renderInline(text));
    } else {
      out.push("<p>" + renderInline(text) + "</p>");
    }
  }

  return out.join("\n");
}

/** Converts Markdown source to a safe HTML fragment. */
export function renderMarkdown(source: string): string {
  const normalized = source.replace(/\r\n?/g, "\n").replace(/^\uFEFF/, "");
  const lines = normalized.split("\n").map((l) => l.replace(/^\t+/, (tabs) => rep(" ", tabs.length * 4)));
  return renderBlocks(lines, { ids: {} }, 0, false);
}

export const MARKDOWN_CSS = [
  ".md-preview{line-height:1.7;font-size:16px;overflow-wrap:anywhere}",
  ".md-preview>*:first-child{margin-top:0}",
  ".md-preview h1,.md-preview h2,.md-preview h3,.md-preview h4,.md-preview h5,.md-preview h6{line-height:1.25;margin:1.6em 0 .6em;font-weight:700}",
  ".md-preview h1{font-size:2em;padding-bottom:.3em;border-bottom:1px solid rgba(127,127,127,.35)}",
  ".md-preview h2{font-size:1.5em;padding-bottom:.25em;border-bottom:1px solid rgba(127,127,127,.25)}",
  ".md-preview h3{font-size:1.25em}",
  ".md-preview h4{font-size:1em}",
  ".md-preview h5{font-size:.875em}",
  ".md-preview h6{font-size:.85em;opacity:.8}",
  ".md-preview p,.md-preview ul,.md-preview ol,.md-preview blockquote,.md-preview pre,.md-preview table{margin:0 0 1em}",
  ".md-preview ul,.md-preview ol{padding-left:1.6em}",
  ".md-preview ul{list-style:disc}",
  ".md-preview ol{list-style:decimal}",
  ".md-preview li>ul,.md-preview li>ol{margin:.25em 0}",
  ".md-preview li.task{list-style:none;margin-left:-1.3em}",
  ".md-preview li.task input{margin-right:.45em}",
  ".md-preview blockquote{border-left:4px solid rgba(127,127,127,.5);padding:.1em 1em;margin-left:0;opacity:.92}",
  ".md-preview code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.9em;background:rgba(127,127,127,.18);padding:.15em .35em;border-radius:4px}",
  ".md-preview pre{background:rgba(127,127,127,.15);padding:1em;border-radius:8px;overflow:auto}",
  ".md-preview pre code{background:none;padding:0;font-size:.875em}",
  ".md-preview table{border-collapse:collapse;display:block;overflow:auto;max-width:100%}",
  ".md-preview th,.md-preview td{border:1px solid rgba(127,127,127,.4);padding:.4em .8em}",
  ".md-preview th{background:rgba(127,127,127,.12);font-weight:600}",
  ".md-preview img{max-width:100%;height:auto}",
  ".md-preview hr{border:0;border-top:1px solid rgba(127,127,127,.4);margin:1.6em 0}",
  ".md-preview a{color:#3b82f6;text-decoration:underline}",
].join("\n");

/** Wraps a rendered fragment in a complete, standalone HTML document. */
export function buildHtmlDocument(bodyHtml: string, title: string): string {
  const safeTitle = escapeHtml(title || "Document");
  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>" + safeTitle + "</title>",
    "<style>",
    "body{max-width:820px;margin:2rem auto;padding:0 1rem;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;background:#ffffff}",
    "@media (prefers-color-scheme:dark){body{color:#e5e7eb;background:#0b1020}}",
    MARKDOWN_CSS,
    "</style>",
    "</head>",
    "<body>",
    '<article class="md-preview">',
    bodyHtml,
    "</article>",
    "</body>",
    "</html>",
    "",
  ].join("\n");
}
