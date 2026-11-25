export const MAX_FILE_BYTES = 600 * 1024 * 1024;
export const SMALL_FILE_BYTES = 2 * 1024 * 1024;
export const BLOCK_LIMIT = 20000;
export const MAX_SEGMENT_CHARS = 2000000;
export const MAX_LINE_CHARS = 100000;
export const MAX_HEADINGS = 2000;

const MAX_DEPTH = 8;
const PIPE = String.fromCharCode(124);
const ESCAPABLE = "\\`*_{}[]()#+-.!~<>" + PIPE;

export interface InlineNode {
  type: string;
  text?: string;
  href?: string;
  title?: string;
  alt?: string;
  children?: InlineNode[];
}

export interface ListItem {
  hasCheckbox: boolean;
  checked: boolean;
  blocks: BlockNode[];
}

export interface BlockNode {
  type: string;
  level?: number;
  id?: string;
  inline?: InlineNode[];
  text?: string;
  lang?: string;
  children?: BlockNode[];
  ordered?: boolean;
  start?: number;
  tight?: boolean;
  items?: ListItem[];
  align?: string[];
  header?: InlineNode[][];
  rows?: InlineNode[][][];
}

export interface HeadingInfo {
  level: number;
  text: string;
  id: string;
}

export interface ParseStats {
  words: number;
  chars: number;
  lines: number;
  blocks: number;
}

export interface ParseResult {
  blocks: BlockNode[];
  headings: HeadingInfo[];
  stats: ParseStats;
  truncated: boolean;
}

export interface ParseContext {
  slugCounts: Record<string, number>;
  headings: HeadingInfo[];
}

export interface WorkerRequest {
  type: string;
  id: number;
  text?: string;
  file?: File;
}

export interface WorkerResponse {
  type: string;
  id: number;
  blocks?: BlockNode[];
  headings?: HeadingInfo[];
  stats?: ParseStats;
  truncated?: boolean;
  loaded?: number;
  total?: number;
  message?: string;
}

export function createContext(): ParseContext {
  return { slugCounts: Object.create(null) as Record<string, number>, headings: [] };
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function cleanUrl(raw: string): string {
  return raw.trim().replace(/[\u0000-\u001f\u007f]/g, "");
}

const LINK_SCHEMES = ["http", "https", "mailto", "tel"];

export function safeLinkUrl(raw: string): string {
  const cleaned = cleanUrl(raw);
  if (cleaned === "") return "";
  const compact = cleaned.replace(/\s+/g, "");
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(compact);
  if (m) {
    return LINK_SCHEMES.indexOf(m[1].toLowerCase()) >= 0 ? cleaned.replace(/ /g, "%20") : "";
  }
  if (compact.startsWith("//")) return "";
  return cleaned.replace(/ /g, "%20");
}

const IMAGE_DATA_PREFIXES = ["data:image/png", "data:image/gif", "data:image/jpeg", "data:image/webp"];

export function safeImageUrl(raw: string): string {
  const cleaned = cleanUrl(raw);
  const lower = cleaned.toLowerCase();
  for (const prefix of IMAGE_DATA_PREFIXES) {
    if (lower.startsWith(prefix)) {
      const next = lower.charAt(prefix.length);
      if (next !== "" && ";,".indexOf(next) >= 0) return cleaned;
    }
  }
  if (lower.startsWith("http://")) return cleaned.replace(/ /g, "%20");
  if (lower.startsWith("https://")) return cleaned.replace(/ /g, "%20");
  return "";
}

export function slugify(text: string): string {
  const s = text
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\uffff]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  return s === "" ? "section" : s;
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function uniqueId(ctx: ParseContext, text: string): string {
  const base = slugify(text);
  const count = ctx.slugCounts[base] ?? 0;
  ctx.slugCounts[base] = count + 1;
  return "md-" + (count === 0 ? base : base + "-" + count);
}

export function inlineToText(nodes: InlineNode[]): string {
  let out = "";
  for (const n of nodes) {
    if (n.type === "text") out += n.text ?? "";
    else if (n.type === "code") out += n.text ?? "";
    else if (n.type === "image") out += n.alt ?? "";
    else if (n.type === "br") out += " ";
    else out += inlineToText(n.children ?? []);
  }
  return out;
}

function isSpace(ch: string): boolean {
  return ch === "" ? true : /\s/.test(ch);
}

function isAlnum(ch: string): boolean {
  return ch === "" ? false : /[A-Za-z0-9]/.test(ch);
}

function isDigit(ch: string): boolean {
  return ch.length === 1 && ch >= "0" && ch <= "9";
}

function startsWithAt(src: string, index: number, list: string[]): boolean {
  for (const s of list) {
    if (src.startsWith(s, index)) return true;
  }
  return false;
}

function startsWithAny(str: string, list: string[]): boolean {
  for (const s of list) {
    if (str.startsWith(s)) return true;
  }
  return false;
}

interface Budget {
  left: number;
}

function charge(b: Budget, amount: number): void {
  b.left -= amount;
}

function findBacktickClose(src: string, run: number, from: number, b: Budget): number {
  if (b.left <= 0) return -1;
  const n = src.length;
  let k = from;
  let found = -1;
  while (k < n) {
    if (src.charAt(k) === "`") {
      let r = 1;
      while (src.charAt(k + r) === "`") r += 1;
      if (r === run) {
        found = k;
        break;
      }
      k += r;
    } else {
      k += 1;
    }
  }
  charge(b, k - from);
  return found;
}

function findAngleClose(src: string, start: number): number {
  const limit = Math.min(src.length, start + 2000);
  for (let k = start + 1; k < limit; k += 1) {
    const c = src.charAt(k);
    if (c === ">") return k;
    if (c === "<") return -1;
    if (/\s/.test(c)) return -1;
  }
  return -1;
}

interface LinkParse {
  ok: boolean;
  label: string;
  url: string;
  title: string;
  end: number;
}

function readLink(src: string, start: number, b: Budget): LinkParse {
  const fail: LinkParse = { ok: false, label: "", url: "", title: "", end: start };
  if (b.left <= 0) return fail;
  const n = src.length;
  let k = start + 1;
  let depth = 1;
  while (k < n) {
    const c = src.charAt(k);
    if (c === "\\") {
      k += 2;
      continue;
    }
    if (c === "[") {
      depth += 1;
    } else if (c === "]") {
      depth -= 1;
      if (depth === 0) break;
    }
    k += 1;
  }
  charge(b, k - start);
  if (depth !== 0) return fail;
  const label = src.slice(start + 1, k);
  if (src.charAt(k + 1) !== "(") return fail;
  let p = k + 2;
  while (p < n && " \n\t".indexOf(src.charAt(p)) >= 0) p += 1;
  let url = "";
  if (src.charAt(p) === "<") {
    const close = src.indexOf(">", p + 1);
    if (close < 0) return fail;
    url = src.slice(p + 1, close);
    p = close + 1;
  } else {
    let parens = 0;
    const s = p;
    while (p < n) {
      const c = src.charAt(p);
      if (c === "\\") {
        p += 2;
        continue;
      }
      if (" \n\t".indexOf(c) >= 0) break;
      if (c === "(") {
        parens += 1;
      } else if (c === ")") {
        if (parens === 0) break;
        parens -= 1;
      }
      p += 1;
    }
    url = src.slice(s, p);
  }
  while (p < n && " \n\t".indexOf(src.charAt(p)) >= 0) p += 1;
  let title = "";
  const q = src.charAt(p);
  if (q !== "" && "\"'".indexOf(q) >= 0) {
    const close = src.indexOf(q, p + 1);
    if (close < 0) return fail;
    title = src.slice(p + 1, close);
    p = close + 1;
    while (p < n && " \n\t".indexOf(src.charAt(p)) >= 0) p += 1;
  }
  if (src.charAt(p) !== ")") return fail;
  return { ok: true, label, url, title, end: p + 1 };
}

function finalHref(url: string): string {
  const cleaned = cleanUrl(url);
  if (cleaned.startsWith("#")) {
    return "#md-" + slugify(safeDecode(cleaned.slice(1)));
  }
  return safeLinkUrl(cleaned);
}

interface Emphasis {
  ok: boolean;
  type: string;
  inner: string;
  end: number;
}

function readEmphasis(src: string, i: number, ch: string, b: Budget): Emphasis {
  const fail: Emphasis = { ok: false, type: "", inner: "", end: i };
  if (b.left <= 0) return fail;
  let run = 1;
  while (src.charAt(i + run) === ch) run += 1;
  const prev = i > 0 ? src.charAt(i - 1) : "";
  const after = src.charAt(i + run);
  if (isSpace(after)) return fail;
  if (ch === "_" && isAlnum(prev)) return fail;
  if (ch === "~" && run !== 2) return fail;
  const want = ch === "~" ? 2 : run >= 2 ? 2 : 1;
  const contentStart = i + want;
  const n = src.length;
  let k = contentStart;
  let result = fail;
  while (k < n) {
    const c = src.charAt(k);
    if (c === "\\") {
      k += 2;
      continue;
    }
    if (c === "`") {
      let r = 1;
      while (src.charAt(k + r) === "`") r += 1;
      const close = findBacktickClose(src, r, k + r, b);
      k = close >= 0 ? close + r : k + r;
      continue;
    }
    if (c === ch) {
      let r = 1;
      while (src.charAt(k + r) === ch) r += 1;
      const before = src.charAt(k - 1);
      const fits = want === 2 ? r >= 2 : r === 1;
      if (fits && !isSpace(before)) {
        const closePos = want === 2 ? k + r - 2 : k;
        const nextChar = src.charAt(closePos + want);
        const blocked = ch === "_" && isAlnum(nextChar);
        if (!blocked && closePos > contentStart) {
          const type = ch === "~" ? "del" : want === 2 ? "strong" : "em";
          result = { ok: true, type, inner: src.slice(contentStart, closePos), end: closePos + want };
          break;
        }
      }
      k += r;
      continue;
    }
    k += 1;
  }
  charge(b, k - contentStart);
  return result;
}

function inlineRun(src: string, depth: number, b: Budget): InlineNode[] {
  const out: InlineNode[] = [];
  if (depth > 6) {
    out.push({ type: "text", text: src });
    return out;
  }
  let buf = "";
  const flush = (): void => {
    if (buf !== "") {
      out.push({ type: "text", text: buf });
      buf = "";
    }
  };
  const n = src.length;
  let i = 0;
  while (i < n) {
    const ch = src.charAt(i);

    if (ch === "\\") {
      const nx = src.charAt(i + 1);
      if (nx === "\n") {
        flush();
        out.push({ type: "br" });
        i += 2;
        continue;
      }
      if (nx !== "" && ESCAPABLE.indexOf(nx) >= 0) {
        buf += nx;
        i += 2;
        continue;
      }
      buf += ch;
      i += 1;
      continue;
    }

    if (ch === "\n") {
      if (buf.endsWith("  ")) {
        buf = buf.replace(/ +$/, "");
        flush();
        out.push({ type: "br" });
      } else {
        buf = buf.replace(/ +$/, "") + " ";
      }
      i += 1;
      while (src.charAt(i) === " ") i += 1;
      continue;
    }

    if (ch === "`") {
      let run = 1;
      while (src.charAt(i + run) === "`") run += 1;
      const close = findBacktickClose(src, run, i + run, b);
      if (close >= 0) {
        flush();
        let code = src.slice(i + run, close).replace(/\n/g, " ");
        if (code.length > 2 && code.startsWith(" ") && code.endsWith(" ") && code.trim() !== "") {
          code = code.slice(1, -1);
        }
        out.push({ type: "code", text: code });
        i = close + run;
      } else {
        buf += src.slice(i, i + run);
        i += run;
      }
      continue;
    }

    if (ch === "!" && src.charAt(i + 1) === "[") {
      const link = readLink(src, i + 1, b);
      if (link.ok) {
        flush();
        const url = safeImageUrl(link.url);
        if (url !== "") {
          out.push({ type: "image", href: url, alt: link.label, title: link.title });
        } else {
          out.push({ type: "text", text: link.label });
        }
        i = link.end;
        continue;
      }
    }

    if (ch === "[") {
      const link = readLink(src, i, b);
      if (link.ok) {
        flush();
        const kids = inlineRun(link.label, depth + 1, b);
        const href = finalHref(link.url);
        if (href !== "") {
          out.push({ type: "link", href, title: link.title, children: kids });
        } else {
          for (const kid of kids) out.push(kid);
        }
        i = link.end;
        continue;
      }
    }

    if (ch === "<") {
      const close = findAngleClose(src, i);
      if (close > 0) {
        const inner = src.slice(i + 1, close);
        if (startsWithAny(inner.toLowerCase(), ["http://", "https://", "mailto:"])) {
          const href = safeLinkUrl(inner);
          if (href !== "") {
            flush();
            out.push({ type: "link", href, children: [{ type: "text", text: inner }] });
            i = close + 1;
            continue;
          }
        }
      }
    }

    if (ch === "h" && !isAlnum(i > 0 ? src.charAt(i - 1) : "") && startsWithAt(src, i, ["http://", "https://"])) {
      let k = i;
      while (k < n) {
        const c = src.charAt(k);
        if (c === "<") break;
        if (/\s/.test(c)) break;
        k += 1;
      }
      while (k > i && ".,;:!?)\"'*_~".indexOf(src.charAt(k - 1)) >= 0) k -= 1;
      const raw = src.slice(i, k);
      if (raw.length > 8) {
        const href = safeLinkUrl(raw);
        if (href !== "") {
          flush();
          out.push({ type: "link", href, children: [{ type: "text", text: raw }] });
          i = k;
          continue;
        }
      }
    }

    if ("*_~".indexOf(ch) >= 0) {
      const em = readEmphasis(src, i, ch, b);
      if (em.ok) {
        flush();
        out.push({ type: em.type, children: inlineRun(em.inner, depth + 1, b) });
        i = em.end;
      } else {
        let run = 1;
        while (src.charAt(i + run) === ch) run += 1;
        buf += src.slice(i, i + run);
        i += run;
      }
      continue;
    }

    buf += ch;
    i += 1;
  }
  flush();
  return out;
}

export function parseInline(src: string): InlineNode[] {
  if (src.length > MAX_LINE_CHARS) {
    return [{ type: "text", text: src }];
  }
  return inlineRun(src, 0, { left: src.length * 6 + 2000 });
}

function normalizeLine(line: string): string {
  let s = line;
  if (s.endsWith("\r")) s = s.slice(0, -1);
  if (s.charAt(0) === "\t") {
    s = s.replace(/^\t+/, (m) => "    ".repeat(m.length));
  }
  return s;
}

function indentOf(line: string): number {
  let k = 0;
  while (k < line.length && line.charAt(k) === " ") k += 1;
  return k;
}

function isBlank(line: string): boolean {
  return line.trim() === "";
}

function stripIndent(line: string, count: number): string {
  let k = 0;
  while (k < count && line.charAt(k) === " ") k += 1;
  return line.slice(k);
}

const HEADING_RE = /^ {0,3}(#{1,6})(?:[ \t]+(.*))?$/;
const HR_RE = /^ {0,3}([-*_])[ \t]*(?:\1[ \t]*){2,}$/;
const SETEXT1_RE = /^ {0,3}=+[ \t]*$/;
const SETEXT2_RE = /^ {0,3}-+[ \t]*$/;

interface FenceInfo {
  ok: boolean;
  ch: string;
  len: number;
  info: string;
  indent: number;
}

function readFenceOpen(line: string): FenceInfo {
  const fail: FenceInfo = { ok: false, ch: "", len: 0, info: "", indent: 0 };
  const ind = indentOf(line);
  if (ind > 3) return fail;
  const ch = line.charAt(ind);
  if (ch !== "`" && ch !== "~") return fail;
  let len = 0;
  while (line.charAt(ind + len) === ch) len += 1;
  if (len < 3) return fail;
  const info = line.slice(ind + len).trim();
  if (ch === "`" && info.indexOf("`") >= 0) return fail;
  return { ok: true, ch, len, info, indent: ind };
}

function isFenceClose(line: string, ch: string, len: number): boolean {
  const ind = indentOf(line);
  if (ind > 3) return false;
  let k = 0;
  while (line.charAt(ind + k) === ch) k += 1;
  return k >= len && line.slice(ind + k).trim() === "";
}

function isQuoteLine(line: string): boolean {
  const ind = indentOf(line);
  return ind <= 3 && line.charAt(ind) === ">";
}

function stripQuote(line: string): string {
  const ind = indentOf(line);
  const rest = line.slice(ind + 1);
  return rest.startsWith(" ") ? rest.slice(1) : rest;
}

interface Marker {
  ok: boolean;
  indent: number;
  ordered: boolean;
  start: number;
  bullet: string;
  contentOffset: number;
  text: string;
}

const NO_MARKER: Marker = { ok: false, indent: 0, ordered: false, start: 1, bullet: "", contentOffset: 0, text: "" };

function readMarker(line: string): Marker {
  const ind = indentOf(line);
  if (ind > 3) return NO_MARKER;
  const c = line.charAt(ind);
  let end = ind;
  let ordered = false;
  let start = 1;
  let bullet = "";
  if (c !== "" && "-+*".indexOf(c) >= 0) {
    end = ind + 1;
    bullet = c;
  } else if (isDigit(c)) {
    let d = ind;
    while (d < line.length && d - ind < 9 && isDigit(line.charAt(d))) d += 1;
    const delim = line.charAt(d);
    if (delim !== "." && delim !== ")") return NO_MARKER;
    ordered = true;
    start = parseInt(line.slice(ind, d), 10);
    bullet = delim;
    end = d + 1;
  } else {
    return NO_MARKER;
  }
  const after = line.charAt(end);
  if (after !== "" && after !== " ") return NO_MARKER;
  let sp = 0;
  while (line.charAt(end + sp) === " ") sp += 1;
  const rest = line.slice(end + sp);
  let offsetSpaces = sp;
  if (sp > 4) offsetSpaces = 1;
  if (rest === "") offsetSpaces = 1;
  const contentOffset = end + offsetSpaces;
  return { ok: true, indent: ind, ordered, start, bullet, contentOffset, text: line.slice(contentOffset) };
}

function startsBlock(line: string): boolean {
  if (readFenceOpen(line).ok) return true;
  if (HEADING_RE.test(line)) return true;
  if (HR_RE.test(line)) return true;
  if (isQuoteLine(line)) return true;
  const mk = readMarker(line);
  if (mk.ok) {
    if (mk.text.trim() === "") return false;
    if (mk.ordered && mk.start !== 1) return false;
    return true;
  }
  return false;
}

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith(PIPE)) s = s.slice(1);
  if (s.endsWith(PIPE) && !s.endsWith("\\" + PIPE)) s = s.slice(0, -1);
  const cells: string[] = [];
  let cur = "";
  for (let k = 0; k < s.length; k += 1) {
    const c = s.charAt(k);
    if (c === "\\" && s.charAt(k + 1) === PIPE) {
      cur += PIPE;
      k += 1;
      continue;
    }
    if (c === PIPE) {
      cells.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  cells.push(cur.trim());
  return cells;
}

function isTableStart(head: string, delim: string): boolean {
  if (head.indexOf(PIPE) < 0) return false;
  if (delim.indexOf(PIPE) < 0) return false;
  const d = splitRow(delim);
  for (const c of d) {
    if (!/^:?-+:?$/.test(c)) return false;
  }
  return d.length === splitRow(head).length;
}

function alignOf(cell: string): string {
  const left = cell.startsWith(":");
  const right = cell.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  if (left) return "left";
  return "";
}

function makeHeading(level: number, text: string, ctx: ParseContext): BlockNode {
  const inline = parseInline(text);
  const plain = inlineToText(inline);
  const id = uniqueId(ctx, plain);
  if (ctx.headings.length < MAX_HEADINGS) {
    ctx.headings.push({ level, text: plain, id });
  }
  return { type: "heading", level, id, inline };
}

function buildItem(itemLines: string[], ctx: ParseContext, depth: number): ListItem {
  const first = itemLines[0] ?? "";
  let hasCheckbox = false;
  let checked = false;
  const m = /^\[([ xX])\][ \t]+/.exec(first);
  if (m) {
    hasCheckbox = true;
    checked = m[1] !== " ";
    itemLines[0] = first.slice(m[0].length);
  }
  return { hasCheckbox, checked, blocks: parseBlocks(itemLines, ctx, depth + 1) };
}

interface ListRead {
  block: BlockNode;
  next: number;
}

function readList(lines: string[], start: number, first: Marker, ctx: ParseContext, depth: number): ListRead {
  const items: ListItem[] = [];
  const n = lines.length;
  let tight = true;
  let i = start;
  let mk = first;
  for (;;) {
    const itemLines: string[] = [mk.text];
    const offset = mk.contentOffset;
    let k = i + 1;
    while (k < n) {
      const cur = lines[k];
      if (isBlank(cur)) {
        let j = k;
        while (j < n && isBlank(lines[j])) j += 1;
        if (j >= n) {
          k = j;
          break;
        }
        if (indentOf(lines[j]) >= offset) {
          for (let q = k; q < j; q += 1) itemLines.push("");
          k = j;
          tight = false;
          continue;
        }
        break;
      }
      const curInd = indentOf(cur);
      if (curInd >= offset) {
        itemLines.push(cur.slice(offset));
        k += 1;
        continue;
      }
      const cm = readMarker(cur);
      if (cm.ok) {
        if (curInd > mk.indent) {
          itemLines.push(cur.slice(curInd));
          k += 1;
          continue;
        }
        break;
      }
      const prev = itemLines[itemLines.length - 1];
      if (prev !== "" && !startsBlock(cur)) {
        itemLines.push(cur.trim());
        k += 1;
        continue;
      }
      break;
    }
    items.push(buildItem(itemLines, ctx, depth));
    i = k;
    let j = i;
    while (j < n && isBlank(lines[j])) j += 1;
    if (j < n) {
      const nm = readMarker(lines[j]);
      const sameKind = nm.ok && nm.ordered === first.ordered && nm.bullet === first.bullet;
      if (sameKind && !HR_RE.test(lines[j]) && nm.indent <= first.indent + 3) {
        if (j > i) tight = false;
        mk = nm;
        i = j;
        continue;
      }
    }
    break;
  }
  return {
    block: { type: "list", ordered: first.ordered, start: first.start, tight, items },
    next: i,
  };
}

export function parseBlocks(lines: string[], ctx: ParseContext, depth: number = 0): BlockNode[] {
  const out: BlockNode[] = [];
  const n = lines.length;
  let i = 0;
  while (i < n) {
    const line = lines[i];
    if (isBlank(line)) {
      i += 1;
      continue;
    }
    if (depth > MAX_DEPTH) {
      out.push({ type: "paragraph", inline: [{ type: "text", text: line.trim() }] });
      i += 1;
      continue;
    }

    const fence = readFenceOpen(line);
    if (fence.ok) {
      const body: string[] = [];
      let k = i + 1;
      while (k < n && !isFenceClose(lines[k], fence.ch, fence.len)) {
        body.push(stripIndent(lines[k], fence.indent));
        k += 1;
      }
      const lang = fence.info.split(/\s+/)[0] ?? "";
      out.push({ type: "code", text: body.join("\n"), lang });
      i = k < n ? k + 1 : k;
      continue;
    }

    const hm = HEADING_RE.exec(line);
    if (hm) {
      const text = (hm[2] ?? "").replace(/[ \t]+#+[ \t]*$/, "").trim();
      out.push(makeHeading(hm[1].length, text, ctx));
      i += 1;
      continue;
    }

    if (HR_RE.test(line)) {
      out.push({ type: "hr" });
      i += 1;
      continue;
    }

    if (isQuoteLine(line)) {
      const inner: string[] = [];
      let k = i;
      while (k < n) {
        const cur = lines[k];
        if (isQuoteLine(cur)) {
          inner.push(stripQuote(cur));
          k += 1;
          continue;
        }
        if (isBlank(cur)) break;
        if (startsBlock(cur)) break;
        if (inner.length > 0 && !isBlank(inner[inner.length - 1])) {
          inner.push(cur);
          k += 1;
          continue;
        }
        break;
      }
      out.push({ type: "quote", children: parseBlocks(inner, ctx, depth + 1) });
      i = k;
      continue;
    }

    if (i + 1 < n && isTableStart(line, lines[i + 1])) {
      const header = splitRow(line);
      const aligns = splitRow(lines[i + 1]).map((c) => alignOf(c));
      const rows: InlineNode[][][] = [];
      let k = i + 2;
      while (k < n && !isBlank(lines[k]) && lines[k].indexOf(PIPE) >= 0) {
        const cells = splitRow(lines[k]);
        const row: InlineNode[][] = [];
        for (let c = 0; c < header.length; c += 1) {
          row.push(parseInline(cells[c] ?? ""));
        }
        rows.push(row);
        k += 1;
      }
      out.push({
        type: "table",
        align: aligns,
        header: header.map((c) => parseInline(c)),
        rows,
      });
      i = k;
      continue;
    }

    const mk = readMarker(line);
    if (mk.ok) {
      const res = readList(lines, i, mk, ctx, depth);
      out.push(res.block);
      i = res.next;
      continue;
    }

    if (line.startsWith("    ")) {
      const body: string[] = [];
      let k = i;
      while (k < n) {
        const cur = lines[k];
        if (cur.startsWith("    ")) {
          body.push(cur.slice(4));
          k += 1;
          continue;
        }
        if (isBlank(cur)) {
          body.push("");
          k += 1;
          continue;
        }
        break;
      }
      while (body.length > 0 && body[body.length - 1] === "") body.pop();
      out.push({ type: "code", text: body.join("\n"), lang: "" });
      i = k;
      continue;
    }

    const para: string[] = [line.replace(/^\s+/, "")];
    let setext = 0;
    let k = i + 1;
    while (k < n) {
      const cur = lines[k];
      if (isBlank(cur)) break;
      if (SETEXT1_RE.test(cur)) {
        setext = 1;
        k += 1;
        break;
      }
      if (SETEXT2_RE.test(cur)) {
        setext = 2;
        k += 1;
        break;
      }
      if (startsBlock(cur)) break;
      if (k + 1 < n && isTableStart(cur, lines[k + 1])) break;
      para.push(cur.replace(/^\s+/, ""));
      k += 1;
    }
    if (setext > 0) {
      out.push(makeHeading(setext, para.join(" ").trim(), ctx));
    } else {
      out.push({ type: "paragraph", inline: parseInline(para.join("\n").trimEnd()) });
    }
    i = k;
  }
  return out;
}

export function countText(text: string): ParseStats {
  let words = 0;
  let inWord = false;
  let lines = text === "" ? 0 : 1;
  for (let k = 0; k < text.length; k += 1) {
    const c = text.charCodeAt(k);
    if (c === 10) lines += 1;
    const space = c <= 32 ? true : c === 160;
    if (space) {
      inWord = false;
    } else if (!inWord) {
      inWord = true;
      words += 1;
    }
  }
  return { words, chars: text.length, lines, blocks: 0 };
}

export function parseDocument(text: string): ParseResult {
  const ctx = createContext();
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const lines = src.split("\n").map((l) => normalizeLine(l));
  const blocks = parseBlocks(lines, ctx, 0);
  const stats = countText(src);
  stats.blocks = blocks.length;
  return { blocks, headings: ctx.headings, stats, truncated: false };
}

export class StreamParser {
  private ctx: ParseContext = createContext();
  private carry = "";
  private seg: string[] = [];
  private segChars = 0;
  private blankPending = false;
  private fenceCh = "";
  private fenceLen = 0;
  private fenceOpenLine = "";
  private inWord = false;
  private chars = 0;
  private words = 0;
  private lineCount = 0;
  private emitted = 0;
  private done = false;
  private dropped = false;
  private first = true;
  private headingsSent = 0;
  private limit: number;

  constructor(limit: number = BLOCK_LIMIT) {
    this.limit = limit;
  }

  get stats(): ParseStats {
    return {
      words: this.words,
      chars: this.chars,
      lines: this.chars === 0 ? 0 : this.lineCount + 1,
      blocks: this.emitted,
    };
  }

  get truncated(): boolean {
    return this.dropped;
  }

  takeHeadings(): HeadingInfo[] {
    const fresh = this.ctx.headings.slice(this.headingsSent);
    this.headingsSent = this.ctx.headings.length;
    return fresh;
  }

  push(text: string): BlockNode[] {
    let chunk = text;
    if (this.first) {
      this.first = false;
      if (chunk.charCodeAt(0) === 0xfeff) chunk = chunk.slice(1);
    }
    this.countChunk(chunk);
    const out: BlockNode[] = [];
    if (this.done) {
      if (chunk.length > 0) this.dropped = true;
      return out;
    }
    const parts = (this.carry + chunk).split("\n");
    this.carry = parts.pop() ?? "";
    for (const part of parts) {
      this.feedLine(normalizeLine(part), out);
      if (this.done) break;
    }
    if (!this.done && this.carry.length > MAX_SEGMENT_CHARS) {
      this.feedLine(this.carry, out);
      this.carry = "";
    }
    return out;
  }

  finish(): BlockNode[] {
    const out: BlockNode[] = [];
    if (!this.done) {
      if (this.carry !== "") {
        this.feedLine(normalizeLine(this.carry), out);
        this.carry = "";
      }
      this.flush(out);
    }
    return out;
  }

  private countChunk(chunk: string): void {
    for (let k = 0; k < chunk.length; k += 1) {
      const c = chunk.charCodeAt(k);
      if (c === 10) this.lineCount += 1;
      const space = c <= 32 ? true : c === 160;
      if (space) {
        this.inWord = false;
      } else if (!this.inWord) {
        this.inWord = true;
        this.words += 1;
      }
    }
    this.chars += chunk.length;
  }

  private add(line: string): void {
    this.seg.push(line);
    this.segChars += line.length + 1;
  }

  private continues(line: string): boolean {
    const first = this.seg[0] ?? "";
    if (first === "") return false;
    if (readMarker(first).ok) {
      return readMarker(line).ok ? true : indentOf(line) >= 2;
    }
    if (isQuoteLine(first)) return isQuoteLine(line);
    if (first.startsWith("    ")) return line.startsWith("    ");
    return false;
  }

  private feedLine(line: string, out: BlockNode[]): void {
    if (this.fenceCh !== "") {
      this.add(line);
      if (isFenceClose(line, this.fenceCh, this.fenceLen)) {
        this.fenceCh = "";
      } else if (this.segChars > MAX_SEGMENT_CHARS) {
        this.seg.push(this.fenceCh.repeat(this.fenceLen));
        this.flush(out);
        this.add(this.fenceOpenLine);
      }
      return;
    }
    if (isBlank(line)) {
      if (this.seg.length > 0) {
        this.seg.push("");
        this.blankPending = true;
      }
      return;
    }
    if (this.blankPending) {
      if (this.continues(line)) {
        this.blankPending = false;
      } else {
        this.flush(out);
        if (this.done) return;
      }
    }
    const fo = readFenceOpen(line);
    if (fo.ok) {
      this.fenceCh = fo.ch;
      this.fenceLen = fo.len;
      this.fenceOpenLine = line;
    }
    this.add(line);
    if (this.fenceCh === "" && this.segChars > MAX_SEGMENT_CHARS) {
      this.flush(out);
    }
  }

  private flush(out: BlockNode[]): void {
    const lines = this.seg;
    this.seg = [];
    this.segChars = 0;
    this.blankPending = false;
    if (lines.length === 0) return;
    const blocks = parseBlocks(lines, this.ctx, 0);
    for (const b of blocks) {
      if (this.emitted >= this.limit) {
        this.done = true;
        this.dropped = true;
        break;
      }
      out.push(b);
      this.emitted += 1;
    }
    if (this.emitted >= this.limit) this.done = true;
  }
}

export function inlineToHtml(nodes: InlineNode[], allowRemote: boolean): string {
  let html = "";
  for (const n of nodes) {
    if (n.type === "text") {
      html += escapeHtml(n.text ?? "");
    } else if (n.type === "code") {
      html += "<code>" + escapeHtml(n.text ?? "") + "</code>";
    } else if (n.type === "strong") {
      html += "<strong>" + inlineToHtml(n.children ?? [], allowRemote) + "</strong>";
    } else if (n.type === "em") {
      html += "<em>" + inlineToHtml(n.children ?? [], allowRemote) + "</em>";
    } else if (n.type === "del") {
      html += "<del>" + inlineToHtml(n.children ?? [], allowRemote) + "</del>";
    } else if (n.type === "br") {
      html += "<br />";
    } else if (n.type === "link") {
      const title = n.title ? ' title="' + escapeHtml(n.title) + '"' : "";
      html +=
        '<a href="' + escapeHtml(n.href ?? "") + '"' + title + ' rel="noopener noreferrer nofollow ugc">' +
        inlineToHtml(n.children ?? [], allowRemote) + "</a>";
    } else if (n.type === "image") {
      const src = n.href ?? "";
      if (src.startsWith("data:") || allowRemote) {
        const title = n.title ? ' title="' + escapeHtml(n.title) + '"' : "";
        html +=
          '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(n.alt ?? "") + '"' + title +
          ' loading="lazy" referrerpolicy="no-referrer" />';
      } else {
        html += escapeHtml(n.alt ?? "");
      }
    }
  }
  return html;
}

function blockToHtml(b: BlockNode, allowRemote: boolean, tight: boolean): string {
  if (b.type === "heading") {
    const level = Math.min(6, Math.max(1, b.level ?? 1));
    return "<h" + level + ' id="' + escapeHtml(b.id ?? "") + '">' + inlineToHtml(b.inline ?? [], allowRemote) + "</h" + level + ">";
  }
  if (b.type === "paragraph") {
    const inner = inlineToHtml(b.inline ?? [], allowRemote);
    return tight ? inner : "<p>" + inner + "</p>";
  }
  if (b.type === "code") {
    const cls = b.lang ? ' class="language-' + escapeHtml(b.lang) + '"' : "";
    return "<pre><code" + cls + ">" + escapeHtml(b.text ?? "") + "</code></pre>";
  }
  if (b.type === "quote") {
    return "<blockquote>" + blocksToHtml(b.children ?? [], allowRemote, false) + "</blockquote>";
  }
  if (b.type === "hr") {
    return "<hr />";
  }
  if (b.type === "list") {
    let items = "";
    for (const it of b.items ?? []) {
      const box = it.hasCheckbox ? '<input type="checkbox" disabled' + (it.checked ? " checked" : "") + " /> " : "";
      items += "<li>" + box + blocksToHtml(it.blocks, allowRemote, b.tight === true) + "</li>";
    }
    if (b.ordered) {
      const start = b.start !== undefined && b.start !== 1 ? ' start="' + b.start + '"' : "";
      return "<ol" + start + ">" + items + "</ol>";
    }
    return "<ul>" + items + "</ul>";
  }
  if (b.type === "table") {
    const aligns = b.align ?? [];
    const styleFor = (c: number): string => {
      const a = aligns[c] ?? "";
      return a === "" ? "" : ' style="text-align:' + a + '"';
    };
    let head = "";
    (b.header ?? []).forEach((cell, c) => {
      head += "<th" + styleFor(c) + ">" + inlineToHtml(cell, allowRemote) + "</th>";
    });
    let body = "";
    for (const row of b.rows ?? []) {
      let tr = "";
      row.forEach((cell, c) => {
        tr += "<td" + styleFor(c) + ">" + inlineToHtml(cell, allowRemote) + "</td>";
      });
      body += "<tr>" + tr + "</tr>";
    }
    return "<table><thead><tr>" + head + "</tr></thead><tbody>" + body + "</tbody></table>";
  }
  return "";
}

export function blocksToHtml(blocks: BlockNode[], allowRemote: boolean, tight: boolean = false): string {
  let html = "";
  for (const b of blocks) {
    html += blockToHtml(b, allowRemote, tight) + "\n";
  }
  return html;
}

export function documentHtml(title: string, blocks: BlockNode[], allowRemote: boolean): string {
  const css =
    "body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.65;max-width:860px;margin:2rem auto;padding:0 1rem;color:#111827}" +
    "pre{background:#f3f4f6;padding:12px;overflow:auto;border-radius:8px}" +
    "code{font-family:ui-monospace,Menlo,Consolas,monospace}" +
    "table{border-collapse:collapse}th,td{border:1px solid #d1d5db;padding:6px 10px}" +
    "blockquote{border-left:4px solid #d1d5db;margin:1em 0;padding-left:1em;color:#374151}" +
    "img{max-width:100%}";
  return (
    "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\" />\n" +
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n" +
    "<title>" + escapeHtml(title) + "</title>\n<style>" + css + "</style>\n</head>\n<body>\n" +
    blocksToHtml(blocks, allowRemote) +
    "</body>\n</html>\n"
  );
}
