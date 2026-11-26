#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import process from "node:process";
import { fileURLToPath } from "node:url";

const PIPE = String.fromCharCode(124);
const BS = String.fromCharCode(92);
const TICK = String.fromCharCode(96);
const FENCE = TICK + TICK + TICK;
const NL = "\n";

const ARGV = process.argv.slice(2);
const FLAG = {
  strict: ARGV.includes("--strict"),
  quiet: ARGV.includes("--quiet"),
  noWrite: ARGV.includes("--no-write"),
  printContext: ARGV.includes("--print-context"),
  noBundle: ARGV.includes("--no-bundle"),
};
const ROOT_ARG = ARGV.find((a) => a.startsWith("--root="));
const ROOT = path.resolve(ROOT_ARG ? ROOT_ARG.slice(7) : process.cwd());
const OUT_DIR = path.join(ROOT, "audit-report");
const SELF_REL = path.relative(ROOT, fileURLToPath(import.meta.url)).split(BS).join("/");

const OWNER = {
  project: "ToolGlobe Pro",
  owner: "Hassan Asghar",
  email: "hassanasghar7868686@gmail.com",
  whatsapp: "+923451098607 / +923497726469",
  repo: "hassanasghar971-ui/toolglobepro",
};

const WANT_CATEGORIES = [
  "text-tools",
  "developer-tools",
  "security-tools",
  "network-tools",
  "seo-tools",
  "data-tools",
  "file-tools",
  "converters",
  "encoding-decoding-tools",
  "image-tools",
  "design-color-tools",
  "social-media-tools",
  "generators",
  "time-date-tools",
  "math-calculators",
  "unit-converters",
  "web-utility-tools",
  "productivity-tools",
  "privacy-tools",
  "document-text-helpers",
];

const KNOWN_HOME = {
  "markdown-previewer": "document-text-helpers",
  "csv-to-json": "data-tools",
  "url-encoder-decoder": "encoding-decoding-tools",
};

const ALLOWED_CLASSES = ["card", "input", "btn-primary", "btn-secondary", "btn-ghost", "chip"];

const EXPECTED = [
  "app/layout.tsx",
  "app/page.tsx",
  "app/globals.css",
  "app/not-found.tsx",
  "app/error.tsx",
  "app/manifest.ts",
  "app/robots.ts",
  "app/sitemap.ts",
  "app/icon.tsx",
  "app/apple-icon.tsx",
  "app/opengraph-image.tsx",
  "app/ads.txt/route.ts",
  "app/about/page.tsx",
  "app/contact/page.tsx",
  "app/privacy-policy/page.tsx",
  "app/terms-and-conditions/page.tsx",
  "app/disclaimer/page.tsx",
  "app/tools/[slug]/page.tsx",
  "app/category/[slug]/page.tsx",
  "lib/site.ts",
  "lib/types.ts",
  "lib/categories.ts",
  "lib/seo.ts",
  "lib/schema.ts",
  "lib/search.ts",
  "lib/ads.ts",
  "lib/tools/index.ts",
  "components/layout/Logo.tsx",
  "components/layout/ThemeToggle.tsx",
  "components/layout/Header.tsx",
  "components/layout/SearchDialog.tsx",
  "components/layout/Footer.tsx",
  "components/layout/LegalLayout.tsx",
  "components/ads/AdSlot.tsx",
  "components/ads/AdsterraNativeBanner.tsx",
  "components/ads/AdsterraSocialBar.tsx",
  "components/seo/JsonLd.tsx",
  "components/ui/Icon.tsx",
  "components/ui/Breadcrumbs.tsx",
  "components/ui/FaqList.tsx",
  "components/home/ToolExplorer.tsx",
  "components/home/CategoryGrid.tsx",
  "components/contact/ContactForm.tsx",
  "components/tools/tool-map.tsx",
  "components/tools/ToolCard.tsx",
  "components/tools/ToolPageShell.tsx",
];

const REQUIRED_REGISTRY_EXPORTS = [
  "getAllTools",
  "getToolBySlug",
  "getToolsByCategory",
  "getRelatedTools",
  "getActiveCategories",
  "toToolSummary",
  "toSummary",
];

const TOOL_COPY_KEYS = [
  "intro",
  "sections",
  "howTo",
  "features",
  "faqs",
  "content",
  "longDescription",
  "seoText",
  "useCases",
  "tips",
];

const SKIP_ANY = new Set(["node_modules", ".next", ".git", ".vercel", "audit-report", ".turbo", ".cache"]);
const SKIP_ROOT = new Set(["out", "dist", "build", "coverage"]);
const TEXT_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css", ".md", ".mdx", ".txt", ".html", ".svg"]);
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const EXT_TRY = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css"];

function alt(list) {
  return "(?:" + list.join(PIPE) + ")";
}

function cell(v) {
  return String(v ?? "").split(PIPE).join("/").split(NL).join(" ");
}

function row(cells) {
  return PIPE + " " + cells.map(cell).join(" " + PIPE + " ") + " " + PIPE;
}

function table(headers, rows) {
  if (rows.length === 0) return "_none_" + NL;
  const out = [row(headers), row(headers.map(() => "---"))];
  for (const r of rows) out.push(row(r));
  return out.join(NL) + NL;
}

function execAll(re, text) {
  const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  const r = new RegExp(re.source, flags);
  const out = [];
  let m = r.exec(text);
  while (m !== null) {
    out.push(m);
    if (m[0] === "") r.lastIndex++;
    m = r.exec(text);
  }
  return out;
}

function countMatches(text, re) {
  return execAll(re, text).length;
}

function words(text) {
  return String(text ?? "").split(/\s+/).filter(Boolean).length;
}

function lineStarts(text) {
  const s = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) s.push(i + 1);
  }
  return s;
}

function lineAt(starts, idx) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= idx) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

function lev(a, b) {
  const m = a.length;
  const n = b.length;
  const d = [];
  for (let i = 0; i <= m; i++) d.push([i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[m][n];
}

function closest(name, list) {
  let best = null;
  let bd = 99;
  for (const c of list) {
    const dd = lev(name.toLowerCase(), c.toLowerCase());
    if (dd < bd) {
      bd = dd;
      best = c;
    }
  }
  return bd <= 6 ? best : null;
}

const FINDINGS = [];
const SEEN = new Set();

function add(sev, area, file, line, msg, fix) {
  const key = [sev, area, file, line, msg].join("::");
  if (SEEN.has(key)) return;
  SEEN.add(key);
  FINDINGS.push({ sev, area, file: file ?? "", line: line ?? 0, msg, fix: fix ?? "" });
}

function walk(dirAbs, relBase, out) {
  let entries = [];
  try {
    entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  } catch {
    return;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const e of entries) {
    const rel = relBase ? relBase + "/" + e.name : e.name;
    if (e.isDirectory()) {
      if (SKIP_ANY.has(e.name)) continue;
      if (!relBase && SKIP_ROOT.has(e.name)) continue;
      walk(path.join(dirAbs, e.name), rel, out);
    } else if (e.isFile()) {
      out.push(rel);
    }
  }
}

const ALL = [];
walk(ROOT, "", ALL);
const ALLSET = new Set(ALL);
const LOWER = new Map();
for (const r of ALL) LOWER.set(r.toLowerCase(), r);

const FILES = new Map();
for (const rel of ALL) {
  const abs = path.join(ROOT, rel);
  let size = 0;
  try {
    size = fs.statSync(abs).size;
  } catch {
    size = 0;
  }
  const ext = path.extname(rel).toLowerCase();
  const base = path.posix.basename(rel);
  const isText = TEXT_EXT.has(ext) ? true : base.startsWith(".env") ? true : base === ".gitignore";
  const rec = { rel, abs, ext, base, size, text: null, lines: 0, starts: null };
  if (isText && size <= 3000000) {
    try {
      rec.text = fs.readFileSync(abs, "utf8");
      rec.lines = rec.text.split("\n").length;
    } catch {
      rec.text = null;
    }
  }
  FILES.set(rel, rec);
}

function T(rel) {
  const f = FILES.get(rel);
  if (!f) return "";
  return f.text ?? "";
}

function sts(f) {
  if (!f.starts) f.starts = lineStarts(f.text ?? "");
  return f.starts;
}

const STEMS = new Map();
for (const rel of ALL) STEMS.set(rel.replace(/\.(tsx?|jsx?|mjs|cjs)$/, ""), rel);

function existsLoose(rel) {
  return STEMS.has(rel.replace(/\.(tsx?|jsx?|mjs|cjs)$/, ""));
}

function findLoose(rel) {
  return STEMS.get(rel.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "")) ?? null;
}

const CODE = [];
for (const f of FILES.values()) {
  if (f.text === null) continue;
  if (!CODE_EXT.has(f.ext)) continue;
  if (f.rel === SELF_REL) continue;
  if (f.rel.endsWith(".d.ts")) continue;
  CODE.push(f);
}

function hasPrefix(p) {
  return ALL.some((r) => r.startsWith(p));
}

function readJsonSafe(rel) {
  const f = FILES.get(rel);
  if (!f) return null;
  if (!f.text) return null;
  try {
    return JSON.parse(f.text);
  } catch {
    try {
      const cleaned = f.text.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

let ALIAS_DIR = "";
function detectAlias() {
  const ts = readJsonSafe("tsconfig.json");
  if (ts && ts.compilerOptions && ts.compilerOptions.paths) {
    const p = ts.compilerOptions.paths["@/*"];
    if (p && p[0]) {
      ALIAS_DIR = p[0].replace(/^\.\//, "").replace(/\/?\*$/, "");
      return;
    }
  }
  ALIAS_DIR = hasPrefix("src/app/") ? "src" : "";
}

function resolveSpec(fromRel, spec) {
  let base = null;
  if (spec.startsWith(".")) base = path.posix.join(path.posix.dirname(fromRel), spec);
  else if (spec.startsWith("@/")) base = path.posix.join(ALIAS_DIR, spec.slice(2));
  else return { external: true };
  const cands = [base];
  for (const e of EXT_TRY) cands.push(base + e);
  for (const e of EXT_TRY) cands.push(base + "/index" + e);
  for (const c of cands) {
    if (ALLSET.has(c)) return { rel: c };
  }
  for (const c of cands) {
    const lc = LOWER.get(c.toLowerCase());
    if (lc) return { rel: lc, caseMismatch: true };
  }
  return { missing: base };
}

function skipQuoted(text, i) {
  const q = text[i];
  let j = i + 1;
  while (j < text.length && text[j] !== q) {
    if (q !== TICK && text[j] === "\n") return j;
    if (text[j] === BS) j++;
    j++;
  }
  return j + 1;
}

function extractBracket(text, open) {
  const o = text[open];
  const c = o === "[" ? "]" : o === "{" ? "}" : ")";
  let depth = 0;
  let i = open;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '"' || ch === "'" || ch === TICK) {
      i = skipQuoted(text, i);
      continue;
    }
    if (ch === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      const e = text.indexOf("*/", i + 2);
      i = e < 0 ? text.length : e + 2;
      continue;
    }
    if (ch === o) depth++;
    else if (ch === c) {
      depth--;
      if (depth === 0) return text.slice(open, i + 1);
    }
    i++;
  }
  return text.slice(open);
}

function enclosingObject(t, idx) {
  let depth = 0;
  for (let i = idx; i >= 0; i--) {
    const c = t[i];
    if (c === "}") depth++;
    else if (c === "{") {
      if (depth === 0) return extractBracket(t, i);
      depth--;
    }
  }
  return "";
}

function scanStrings(text) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      const e = text.indexOf("*/", i + 2);
      i = e < 0 ? text.length : e + 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === TICK) {
      const end = skipQuoted(text, i);
      out.push(text.slice(i + 1, end - 1));
      i = end;
      continue;
    }
    i++;
  }
  return out;
}

function readStringValue(text, pos) {
  let i = pos;
  let value = "";
  let got = false;
  for (;;) {
    while (i < text.length && /\s/.test(text[i])) i++;
    const q = text[i];
    if (q !== '"' && q !== "'" && q !== TICK) break;
    let j = i + 1;
    let part = "";
    while (j < text.length && text[j] !== q) {
      if (text[j] === BS && j + 1 < text.length) {
        part += text[j + 1];
        j += 2;
        continue;
      }
      part += text[j];
      j++;
    }
    value += part;
    got = true;
    i = j + 1;
    let k = i;
    while (k < text.length && /\s/.test(text[k])) k++;
    if (text[k] === "+") {
      i = k + 1;
      continue;
    }
    break;
  }
  return got ? value : null;
}

function afterKey(text, key, from) {
  const re = new RegExp("[\\s,{][\"']?" + key + "[\"']?\\s*:\\s*", "g");
  re.lastIndex = from ?? 0;
  const m = re.exec(text);
  return m ? m.index + m[0].length : -1;
}

function strField(text, key) {
  const p = afterKey(text, key, 0);
  if (p < 0) return null;
  return readStringValue(text, p);
}

function fieldStrings(text, key) {
  const p = afterKey(text, key, 0);
  if (p < 0) return [];
  let i = p;
  while (i < text.length && /\s/.test(text[i])) i++;
  const ch = text[i];
  if (ch === '"' || ch === "'" || ch === TICK) {
    const v = readStringValue(text, i);
    return v === null ? [] : [v];
  }
  if (ch === "[" || ch === "{") return scanStrings(extractBracket(text, i));
  return [];
}

function extractDecl(text, name) {
  const m = new RegExp("(?:export\\s+)?" + alt(["interface", "type"]) + "\\s+" + name + "\\b").exec(text);
  if (!m) return null;
  const isInterface = m[0].includes("interface");
  if (isInterface) {
    const open = text.indexOf("{", m.index);
    if (open < 0) return null;
    return text.slice(m.index, open) + extractBracket(text, open);
  }
  let depth = 0;
  let i = m.index;
  let seenEq = false;
  while (i < text.length && i - m.index < 6000) {
    const ch = text[i];
    if (ch === '"' || ch === "'" || ch === TICK) {
      i = skipQuoted(text, i);
      continue;
    }
    if (ch === "=") seenEq = true;
    if (ch === "{" || ch === "[" || ch === "(") depth++;
    if (ch === "}" || ch === "]" || ch === ")") depth--;
    if (depth === 0 && ch === ";" && seenEq) {
      i++;
      break;
    }
    if (depth === 0 && ch === "\n" && seenEq) {
      let k = i + 1;
      while (k < text.length && /\s/.test(text[k])) k++;
      if (text[k] !== PIPE && text[k] !== "&") break;
    }
    i++;
  }
  return text.slice(m.index, i);
}

function topFields(decl) {
  if (!decl) return [];
  const open = decl.indexOf("{");
  if (open < 0) return [];
  const body = decl.slice(open + 1);
  const fields = [];
  let depth = 1;
  for (const line of body.split("\n")) {
    if (depth === 1) {
      const m = /^[ \t]*(?:readonly\s+)?([A-Za-z_$][\w$]*)(\?)?\s*:/.exec(line);
      if (m) fields.push({ name: m[1], optional: Boolean(m[2]) });
    }
    for (const ch of line) {
      if (ch === "{") depth++;
      if (ch === "}") depth--;
    }
    if (depth <= 0) break;
  }
  return fields;
}

function parseClause(clause) {
  const out = { def: null, named: [], ns: null };
  const brace = clause.indexOf("{");
  const head = (brace >= 0 ? clause.slice(0, brace) : clause).replace(/,/g, " ").trim();
  if (head.startsWith("*")) out.ns = head;
  else if (head) out.def = head;
  if (brace >= 0) {
    const end = clause.indexOf("}", brace);
    const inner = clause.slice(brace + 1, end < 0 ? clause.length : end);
    for (const part of inner.split(",")) {
      let p = part.trim();
      if (!p) continue;
      p = p.replace(/^type\s+/, "");
      const name = p.split(/\s+as\s+/)[0].trim();
      if (name) out.named.push(name);
    }
  }
  return out;
}

function parseModule(f) {
  const t = f.text;
  const starts = sts(f);
  f.useClient = /["']use client["']/.test(t.slice(0, 500));
  f.imports = [];
  for (const m of execAll(/import\s+(type\s+)?([\w$*{}\s,]+?)\s+from\s+["']([^"']+)["']/g, t)) {
    f.imports.push({ spec: m[3], kind: "static", clause: parseClause(m[2]), line: lineAt(starts, m.index) });
  }
  for (const m of execAll(/^[ \t]*import\s+["']([^"']+)["']/gm, t)) {
    f.imports.push({ spec: m[1], kind: "side", clause: parseClause(""), line: lineAt(starts, m.index) });
  }
  for (const m of execAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g, t)) {
    f.imports.push({ spec: m[1], kind: "dynamic", clause: parseClause(""), line: lineAt(starts, m.index) });
  }
  for (const m of execAll(/export\s+\*(?:\s+as\s+[\w$]+)?\s+from\s+["']([^"']+)["']/g, t)) {
    f.imports.push({ spec: m[1], kind: "reexport", clause: parseClause(""), line: lineAt(starts, m.index) });
  }
  for (const m of execAll(/export\s+(?:type\s+)?\{[^}]*\}\s+from\s+["']([^"']+)["']/g, t)) {
    f.imports.push({ spec: m[1], kind: "reexport", clause: parseClause(""), line: lineAt(starts, m.index) });
  }
  for (const m of execAll(/new\s+URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url\s*\)/g, t)) {
    f.imports.push({ spec: m[1], kind: "worker", clause: parseClause(""), line: lineAt(starts, m.index) });
  }
  const names = new Set();
  let hasDefault = false;
  let star = false;
  const declRe = new RegExp(
    "export\\s+(default\\s+)?(?:declare\\s+)?(?:async\\s+)?" +
      alt(["function\\*?", "const", "let", "var", "class", "interface", "type", "enum"]) +
      "\\s+([A-Za-z0-9_$]+)",
    "g"
  );
  for (const m of execAll(declRe, t)) {
    names.add(m[2]);
    if (m[1]) hasDefault = true;
  }
  if (/export\s+default\b/.test(t)) hasDefault = true;
  for (const m of execAll(/export\s+(?:type\s+)?\{([^}]*)\}/g, t)) {
    for (const part of m[1].split(",")) {
      const p = part.trim().replace(/^type\s+/, "");
      if (!p) continue;
      const bits = p.split(/\s+as\s+/);
      const exported = (bits[1] ?? bits[0]).trim();
      if (exported === "default") hasDefault = true;
      else names.add(exported);
    }
  }
  if (/export\s+\*\s+from/.test(t)) star = true;
  for (const m of execAll(/export\s+\*\s+as\s+([\w$]+)/g, t)) names.add(m[1]);
  f.exports = { names, hasDefault, star };
}

function routeInfo(rel) {
  if (!rel.startsWith("app/")) return null;
  const parts = rel.split("/");
  const file = parts[parts.length - 1];
  const dirs = parts.slice(1, -1).filter((d) => !(d.startsWith("(") && d.endsWith(")")));
  const stem = file.replace(/\.[a-z]+$/, "");
  const dirUrl = dirs.length ? "/" + dirs.join("/") : "";
  if (stem === "page") return { url: dirUrl === "" ? "/" : dirUrl, type: "page" };
  if (stem === "route") return { url: dirUrl === "" ? "/" : dirUrl, type: "route" };
  const meta = {
    sitemap: "/sitemap.xml",
    robots: "/robots.txt",
    manifest: "/manifest.webmanifest",
    icon: "/icon",
    "apple-icon": "/apple-icon",
    "opengraph-image": "/opengraph-image",
    "twitter-image": "/twitter-image",
  };
  if (meta[stem]) return { url: dirUrl + meta[stem], type: "metadata" };
  return null;
}

function kindOf(f) {
  const rel = f.rel;
  const base = f.base;
  if (rel.startsWith("app/")) {
    const ri = routeInfo(rel);
    if (ri) return "route:" + ri.type;
    const stem = base.replace(/\.[a-z]+$/, "");
    if (["layout", "loading", "error", "not-found", "global-error", "template", "default"].includes(stem)) return "route:special";
    if (f.ext === ".css") return "styles";
    return "app-other";
  }
  if (rel.startsWith("lib/tools/")) return base.startsWith("index.") ? "registry" : "tool-def";
  if (rel.startsWith("lib/")) return base.replace(/\.[a-z]+$/, "").endsWith("-engine") ? "engine" : "lib";
  if (rel.startsWith("components/tools/")) {
    if (base.includes(".worker.")) return "worker";
    if (base.startsWith("tool-map.")) return "tool-map";
    if (base.startsWith("ToolCard.") || base.startsWith("ToolPageShell.")) return "tool-shell";
    if (f.ext === ".tsx") return "tool-ui";
    return "tool-support";
  }
  if (rel.startsWith("components/")) return "component";
  if (rel.startsWith("scripts/")) return "script";
  if (rel.startsWith("public/")) return "asset";
  if (!rel.includes("/")) return "config";
  return "other";
}

function isEntry(f) {
  const k = f.kind;
  if (k.startsWith("route:")) return true;
  if (k === "script" || k === "asset" || k === "config") return true;
  if (["middleware", "proxy", "instrumentation"].some((n) => f.base.startsWith(n + "."))) return true;
  return false;
}

const MODEL = {
  tools: [],
  categories: [],
  categorySlugsFromTypes: [],
  routes: [],
  toolFieldsRequired: [],
  looseFields: [],
  mapKeys: new Set(),
  mapUi: new Map(),
  registryExports: [],
  iconSet: new Set(),
  linkChecks: 0,
  workers: [],
  pkg: null,
};

function checkJsonFiles() {
  for (const f of FILES.values()) {
    if (f.ext !== ".json") continue;
    if (f.text === null) continue;
    if (f.base === "tsconfig.json") continue;
    try {
      JSON.parse(f.text);
    } catch (e) {
      add("error", "BUILD", f.rel, 1, "Invalid JSON: " + String(e.message).slice(0, 120), "Replace with valid JSON.");
    }
  }
  MODEL.pkg = readJsonSafe("package.json");
  if (!MODEL.pkg) {
    add("error", "BUILD", "package.json", 1, "package.json missing or unreadable.", "Run from repo root.");
  }
}

function checkImports() {
  for (const f of CODE) parseModule(f);
  for (const f of CODE) f.kind = kindOf(f);
  for (const f of FILES.values()) {
    if (!f.kind) f.kind = kindOf(f);
    f.importedBy = new Set();
  }
  for (const f of CODE) {
    for (const imp of f.imports) {
      const res = resolveSpec(f.rel, imp.spec);
      if (res.external) continue;
      if (res.missing) {
        const area = imp.kind === "worker" ? "PERF" : "BUILD";
        add("error", area, f.rel, imp.line, "Unresolved import: " + imp.spec, "Create file or fix path.");
        continue;
      }
      if (res.caseMismatch) {
        add("error", "BUILD", f.rel, imp.line, "Import case mismatch: " + imp.spec + " -> " + res.rel, "Fix casing for Linux builds.");
      }
      imp.target = res.rel;
      const tf = FILES.get(res.rel);
      if (tf) tf.importedBy.add(f.rel);
    }
  }
  for (const f of CODE) {
    for (const imp of f.imports) {
      if (!imp.target) continue;
      const tf = FILES.get(imp.target);
      if (!tf || !tf.exports || !CODE_EXT.has(tf.ext)) continue;
      const names = [...tf.exports.names];
      if (!tf.exports.star) {
        for (const n of imp.clause.named) {
          if (tf.exports.names.has(n)) continue;
          const near = closest(n, names);
          const hint = near ? " Did you mean " + near + "?" : "";
          const fix = near
            ? "Export alias in " + tf.rel + ": export { " + near + " as " + n + " };"
            : "Export " + n + " from " + tf.rel + ".";
          add("error", "BUILD", f.rel, imp.line, "Export " + n + " missing in " + tf.rel + "." + hint, fix);
        }
      }
      if (imp.kind === "static" && imp.clause.def && !tf.exports.hasDefault && !tf.exports.star) {
        add("error", "BUILD", f.rel, imp.line, "Default import from " + tf.rel + " with no default export.", "Add default export or use named import.");
      }
    }
  }
}

function checkCorruption() {
  const vert1 = BS + "vert{}";
  const vert2 = BS + "vert";
  const tokens = [vert1, vert2, "&vert;", "&#124;", BS + "mid "];
  for (const f of FILES.values()) {
    if (f.text === null || f.rel === SELF_REL) continue;
    const t = f.text;
    const starts = sts(f);
    for (const tok of tokens) {
      const idx = t.indexOf(tok);
      if (idx >= 0) {
        add("error", "CORRUPTION", f.rel, lineAt(starts, idx), "Corruption token found: " + tok, "Replace with clean file.");
      }
    }
    if (!CODE_EXT.has(f.ext)) continue;
    const lines = t.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const tr = lines[i].trim();
      if (tr === "..." || tr === "\u2026" || /\/\/\s*rest of/i.test(lines[i])) {
        add("error", "CORRUPTION", f.rel, i + 1, "Placeholder or truncation marker found.", "Replace with complete file.");
        break;
      }
    }
  }
}

function checkCss() {
  const css = T("app/globals.css");
  if (!css) return;
  for (const m of execAll(/@apply\s+([^;}\n]+)/g, css)) {
    const tokens = m[1].trim().split(/\s+/).map((tk) => tk.replace(/^.*:/, "").replace(/^!/, ""));
    const bad = tokens.filter((tk) => ALLOWED_CLASSES.includes(tk));
    if (bad.length) {
      add("error", "RULES", "app/globals.css", 1, "@apply used with custom class(es): " + bad.join(", "), "Do not @apply custom classes in Tailwind v4.");
    }
  }
}

function checkNoindex() {
  for (const f of FILES.values()) {
    if (f.text === null || f.rel === SELF_REL || f.ext === ".md") continue;
    if (/noindex|\bindex\s*:\s*false\b|x-robots-tag/i.test(f.text)) {
      add("error", "SEO", f.rel, 1, "Indexing block found. Rule: never noindex.", "Remove noindex or index: false.");
    }
  }
}

function checkPerf() {
  for (const f of CODE) {
    const creates = countMatches(f.text, /URL\.createObjectURL\s*\(/g);
    const revokes = countMatches(f.text, /URL\.revokeObjectURL\s*\(/g);
    if (creates > 0 && revokes === 0) {
      add("error", "PERF", f.rel, 1, "URL.createObjectURL without URL.revokeObjectURL.", "Revoke object URLs after use and on cleanup.");
    }
    const wk = execAll(/new\s+Worker\s*\(([^)]*)\)/g, f.text);
    if (wk.length) {
      MODEL.workers.push({ file: f.rel, count: wk.length });
      if (!f.text.includes(".terminate(")) {
        add("warn", "PERF", f.rel, 1, "Worker created without .terminate().", "Terminate worker on cleanup and unmount.");
      }
    }
  }
}

function parseToolDef(f) {
  const t = f.text;
  const slug = strField(t, "slug");
  if (!slug) return null;
  const copy = [];
  for (const k of TOOL_COPY_KEYS) copy.push(...fieldStrings(t, k));
  return {
    file: f.rel,
    slug,
    category: strField(t, "category"),
    icon: strField(t, "icon"),
    copyWords: words(copy.join(" ")),
    faqs: countMatches(t, /\bquestion\s*:/g),
    registered: false,
    mapKey: false,
    ui: null,
    usesWorker: false,
  };
}

function checkRegistry() {
  const typesF = FILES.get("lib/types.ts");
  const catF = FILES.get("lib/categories.ts");
  const regF = FILES.get("lib/tools/index.ts");
  const mapF = FILES.get("components/tools/tool-map.tsx");
  if (typesF && typesF.text) {
    const slugDecl = extractDecl(typesF.text, "CategorySlug");
    if (slugDecl) {
      MODEL.categorySlugsFromTypes = scanStrings(slugDecl).filter((s) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s));
    }
  }
  if (catF && catF.text) {
    for (const m of execAll(/[\s,{]slug\s*:\s*["']([a-z0-9-]+)["']/g, catF.text)) {
      const obj = enclosingObject(catF.text, m.index);
      MODEL.categories.push({
        slug: m[1],
        name: strField(obj, "name"),
        description: strField(obj, "description"),
        icon: strField(obj, "icon"),
      });
    }
  }
  for (const f of CODE.filter((x) => x.kind === "tool-def")) {
    const rec = parseToolDef(f);
    if (rec) MODEL.tools.push(rec);
  }
  if (regF && regF.text) {
    MODEL.registryExports = [...(regF.exports ? regF.exports.names : [])];
    for (const n of REQUIRED_REGISTRY_EXPORTS) {
      if (!MODEL.registryExports.includes(n)) {
        add("warn", "BUILD", regF.rel, 1, "Missing registry export: " + n, "Export " + n + " from lib/tools/index.ts.");
      }
    }
    const importedFiles = new Set();
    for (const imp of regF.imports) {
      if (imp.target) importedFiles.add(imp.target);
    }
    for (const t of MODEL.tools) t.registered = importedFiles.has(t.file);
  }
  if (mapF && mapF.text) {
    for (const m of execAll(/["']([a-z0-9][a-z0-9-]*)["']\s*:/g, mapF.text)) {
      MODEL.mapKeys.add(m[1]);
    }
    for (const t of MODEL.tools) t.mapKey = MODEL.mapKeys.has(t.slug);
  }
  const counts = new Map();
  for (const t of MODEL.tools) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
  MODEL.categoryCounts = counts;
}

function checkRoutes() {
  for (const f of FILES.values()) {
    const ri = routeInfo(f.rel);
    if (ri) MODEL.routes.push({ url: ri.url, type: ri.type, file: f.rel });
  }
}

function decideActions() {
  const rows = [];
  for (const rel of EXPECTED) {
    if (!existsLoose(rel)) {
      rows.push({ file: rel, action: "NEW", note: "expected file not found" });
    }
  }
  const missingCats = WANT_CATEGORIES.filter((s) => !MODEL.categories.some((c) => c.slug === s));
  if (missingCats.length) {
    rows.push({ file: "lib/categories.ts", action: "REPLACE", note: "expand to 20 categories" });
    rows.push({ file: "lib/types.ts", action: "REPLACE", note: "update CategorySlug type" });
  }
  return rows;
}

function buildReport(actions) {
  const L = [];
  L.push("# " + OWNER.project + " audit report", "");
  L.push("Generated: " + new Date().toISOString(), "");
  L.push(table(["Severity", "Count"], [
    ["error", FINDINGS.filter((x) => x.sev === "error").length],
    ["warn", FINDINGS.filter((x) => x.sev === "warn").length],
    ["info", FINDINGS.filter((x) => x.sev === "info").length],
  ]));
  L.push("## Findings", "");
  L.push(table(["Sev", "File", "Line", "Problem", "Fix"], FINDINGS.map((x) => [x.sev, x.file, x.line || "", x.msg, x.fix])));
  L.push("## Actions", "");
  L.push(table(["Action", "File", "Note"], actions.map((a) => [a.action, a.file, a.note])));
  return L.join(NL) + NL;
}

function buildContext(actions) {
  const L = [];
  const counts = MODEL.categoryCounts ?? new Map();
  L.push("# " + OWNER.project + " context", "");
  L.push("Owner: " + OWNER.owner + " (" + OWNER.email + ", " + OWNER.whatsapp + ")", "");
  L.push("## Tools (" + MODEL.tools.length + ")", "");
  L.push(table(["Slug", "Category", "Words", "Registered", "Mapped"],
    MODEL.tools.map((t) => [t.slug, t.category ?? "", t.copyWords, t.registered ? "yes" : "NO", t.mapKey ? "yes" : "NO"])));
  L.push("## Categories (" + MODEL.categories.length + ")", "");
  L.push(table(["Slug", "Name", "Tools"], MODEL.categories.map((c) => [c.slug, c.name ?? "", counts.get(c.slug) ?? 0])));
  L.push("## Actions", "");
  L.push(table(["Action", "File", "Note"], actions.map((a) => [a.action, a.file, a.note])));
  return L.join(NL) + NL;
}

function buildKeyFiles() {
  const L = ["# Key files", ""];
  const targets = ["lib/types.ts", "lib/categories.ts", "lib/tools/index.ts", "components/tools/tool-map.tsx", "components/ui/Icon.tsx"];
  for (const rel of targets) {
    const real = findLoose(rel) ?? (ALLSET.has(rel) ? rel : null);
    L.push("## " + rel, "");
    if (!real) {
      L.push("_not found_", "");
      continue;
    }
    const fence = TICK + TICK + TICK + TICK;
    L.push(fence, T(real), fence, "");
  }
  return L.join(NL) + NL;
}

function main() {
  detectAlias();
  checkJsonFiles();
  checkImports();
  checkCorruption();
  checkCss();
  checkNoindex();
  checkPerf();
  checkRegistry();
  checkRoutes();
  const actions = decideActions();
  const report = buildReport(actions);
  const context = buildContext(actions);
  if (!FLAG.noWrite) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, "REPORT.md"), report);
    fs.writeFileSync(path.join(OUT_DIR, "PROJECT_CONTEXT.md"), context);
    if (!FLAG.noBundle) fs.writeFileSync(path.join(OUT_DIR, "KEY_FILES.md"), buildKeyFiles());
    fs.writeFileSync(path.join(OUT_DIR, "audit.json"), JSON.stringify({
      generated: new Date().toISOString(),
      findings: FINDINGS,
      actions,
      tools: MODEL.tools,
      categories: MODEL.categories,
      routes: MODEL.routes,
    }, null, 2));
  }
  if (FLAG.printContext) process.stdout.write(context);
  if (!FLAG.quiet) {
    console.log("Audit complete. Errors: " + FINDINGS.filter((x) => x.sev === "error").length + ", Warnings: " + FINDINGS.filter((x) => x.sev === "warn").length);
  }
  if (FINDINGS.some((x) => x.sev === "error")) process.exit(1);
  if (FLAG.strict && FINDINGS.some((x) => x.sev === "warn")) process.exit(1);
}

main();
