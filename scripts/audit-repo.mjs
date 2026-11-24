#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const ARGS = new Set(process.argv.slice(2));
const PIPE = String.fromCharCode(124);
const BSL = String.fromCharCode(92);
const SELF = 'scripts/audit-repo.mjs';
const OUT_DIR = path.join(ROOT, 'audit-report');
const QUIET = ARGS.has('--quiet');
const STRICT = ARGS.has('--strict');
const NO_WRITE = ARGS.has('--no-write');
const PRINT_CONTEXT = ARGS.has('--print-context');

function alt(list, flags) {
  return new RegExp('(?:' + list.join(PIPE) + ')', flags === undefined ? '' : flags);
}
function cell(v) {
  return String(v).split(PIPE).join('/').replace(/\s+/g, ' ').trim();
}
function row(cells) {
  return PIPE + ' ' + cells.map(cell).join(' ' + PIPE + ' ') + ' ' + PIPE;
}
function sepRow(n) {
  return row(new Array(n).fill('---'));
}
function lineOf(text, idx) {
  let n = 1;
  for (let i = 0; i < idx; i++) {
    if (text.charCodeAt(i) === 10) n++;
  }
  return n;
}

const SKIP_DIRS = new Set([
  'node_modules', '.next', '.git', '.vercel', '.turbo', 'out', 'coverage',
  'dist', 'build', 'audit-report', '.idea', '.vscode',
]);
const TEXT_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.md',
  '.mdx', '.txt', '.html', '.yml', '.yaml', '.svg', '.xml',
]);
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(path.join(dir, e.name), out);
    } else if (e.isFile()) {
      out.push(path.relative(ROOT, path.join(dir, e.name)).split(path.sep).join('/'));
    }
  }
}

const allPaths = [];
walk(ROOT, allPaths);
allPaths.sort();

const files = new Map();
for (const rel of allPaths) {
  const ext = path.extname(rel).toLowerCase();
  const base = path.posix.basename(rel);
  let size = 0;
  try {
    size = fs.statSync(path.join(ROOT, rel)).size;
  } catch {
    size = 0;
  }
  let text = null;
  const textual = TEXT_EXT.has(ext) ? true : base.startsWith('.') ? true : ext === '';
  if (textual && size < 2000000) {
    try {
      text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    } catch {
      text = null;
    }
  }
  files.set(rel, {
    rel, ext, base, size, text,
    isCode: CODE_EXT.has(ext) && text !== null,
    lines: text === null ? 0 : text.split('\n').length,
  });
}
const T = (rel) => {
  const f = files.get(rel);
  return f !== undefined && f.text !== null ? f.text : '';
};
const has = (rel) => files.has(rel);

const findings = [];
const removeMap = new Map();
const missingFiles = new Map();
function add(sev, area, file, msg, fix) {
  findings.push({ sev, area, file: file === undefined ? '' : file, msg, fix: fix === undefined ? '' : fix });
}
const err = (a, f, m, x) => add('error', a, f, m, x);
const warn = (a, f, m, x) => add('warn', a, f, m, x);
const info = (a, f, m, x) => add('info', a, f, m, x);
function flagRemove(rel, reason) {
  if (!removeMap.has(rel)) removeMap.set(rel, reason);
  warn('DUPLICATION', rel, reason, 'REMOVE: git rm this file if it is truly unused.');
}
function flagMissing(p, reason) {
  if (!missingFiles.has(p)) missingFiles.set(p, reason);
}

function scanCode(src) {
  const out = [];
  const inline = [];
  const strings = [];
  const n = src.length;
  const starters = '(,=:[!&;{}?+-*%>~^' + PIPE;
  let i = 0;
  let line = 1;
  let lineHasCode = false;
  let prev = '';
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '\n') {
      out.push('\n');
      line++;
      lineHasCode = false;
      i++;
      continue;
    }
    if (c === '/' && d === '/' && src[i - 1] !== ':') {
      let j = i;
      while (j < n && src[j] !== '\n') j++;
      if (lineHasCode) inline.push({ line, text: src.slice(i, j) });
      for (let k = i; k < j; k++) out.push(' ');
      i = j;
      continue;
    }
    if (c === '/' && d === '*') {
      let j = i + 2;
      while (j < n && !(src[j] === '*' && src[j + 1] === '/')) j++;
      j = Math.min(n, j + 2);
      for (let k = i; k < j; k++) {
        if (src[k] === '\n') {
          out.push('\n');
          line++;
          lineHasCode = false;
        } else {
          out.push(' ');
        }
      }
      i = j;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== '\n') {
        if (src[j] === BSL) j++;
        j++;
      }
      const closed = src[j] === c;
      strings.push(src.slice(i + 1, Math.min(j, n)));
      out.push(c);
      for (let k = i + 1; k < j; k++) out.push(' ');
      if (closed) {
        out.push(c);
        j++;
      }
      i = j;
      lineHasCode = true;
      prev = c;
      continue;
    }
    if (c === '`') {
      let j = i + 1;
      out.push('`');
      while (j < n && src[j] !== '`') {
        if (src[j] === BSL) {
          out.push(' ');
          j++;
          if (j < n) out.push(src[j] === '\n' ? '\n' : ' ');
          if (src[j] === '\n') line++;
          j++;
          continue;
        }
        if (src[j] === '\n') {
          out.push('\n');
          line++;
        } else {
          out.push(' ');
        }
        j++;
      }
      strings.push(src.slice(i + 1, Math.min(j, n)));
      if (j < n) {
        out.push('`');
        j++;
      }
      i = j;
      lineHasCode = true;
      prev = '`';
      continue;
    }
    if (c === '/' && d !== '>' && (prev === '' ? true : starters.includes(prev))) {
      let j = i + 1;
      let inClass = false;
      while (j < n && src[j] !== '\n') {
        if (src[j] === BSL) {
          j += 2;
          continue;
        }
        if (src[j] === '[') inClass = true;
        else if (src[j] === ']') inClass = false;
        else if (src[j] === '/' && !inClass) break;
        j++;
      }
      if (src[j] === '/') {
        j++;
        while (j < n && /[a-z]/.test(src[j])) j++;
        out.push('/');
        for (let k = i + 1; k < j; k++) out.push(' ');
        i = j;
        prev = 'x';
        lineHasCode = true;
        continue;
      }
    }
    out.push(c);
    if (!/\s/.test(c)) {
      prev = c;
      lineHasCode = true;
    }
    i++;
  }
  return { code: out.join(''), inline, strings };
}

const scans = new Map();
for (const f of files.values()) {
  if (f.isCode) scans.set(f.rel, scanCode(f.text));
}

let aliasPrefix = '';
try {
  const raw = T('tsconfig.json').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  const ts = JSON.parse(raw);
  const target = ts.compilerOptions && ts.compilerOptions.paths ? ts.compilerOptions.paths['@/*'] : undefined;
  if (target && target[0]) aliasPrefix = target[0].replace(/^\.\//, '').replace(/\*$/, '');
} catch {
  aliasPrefix = '';
}

const lowerIndex = new Map();
for (const k of files.keys()) lowerIndex.set(k.toLowerCase(), k);

function resolveSpec(fromRel, spec) {
  let base;
  if (spec.startsWith('.')) {
    base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec));
  } else if (spec.startsWith('@/')) {
    base = aliasPrefix + spec.slice(2);
  } else {
    return { kind: 'external' };
  }
  const exts = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.css', '/index.ts', '/index.tsx', '/index.js'];
  for (const e of exts) {
    if (files.has(base + e)) return { kind: 'ok', rel: base + e };
  }
  for (const e of exts) {
    const hit = lowerIndex.get((base + e).toLowerCase());
    if (hit !== undefined) return { kind: 'case', rel: hit, base };
  }
  return { kind: 'missing', base };
}

function stripComments(t) {
  const noLine = t.split('\n').map((l) => (l.trim().startsWith('//') ? '' : l)).join('\n');
  return noLine.replace(/^\s*\/\*[\s\S]*?\*\//gm, (s) => s.replace(/[^\n]/g, ''));
}

const SPEC_RE = /\b(?:import|export)\s+(?:type\s+)?(?:[\w*${}\s,]+?\s+from\s+)?["']([^"']+)["']/g;
const DYN_RE = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
const URL_RE = /new\s+URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url/g;
const CLAUSE_RE = /\bimport\s+(type\s+)?([^'";]+?)\s+from\s+["']([^"']+)["']/g;

const importCache = new Map();
function importsOf(rel) {
  if (importCache.has(rel)) return importCache.get(rel);
  const f = files.get(rel);
  const res = [];
  if (f !== undefined && f.isCode) {
    const t = stripComments(f.text);
    for (const re of [SPEC_RE, DYN_RE, URL_RE]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(t)) !== null) {
        if (re === URL_RE && !m[1].startsWith('.')) continue;
        res.push({ spec: m[1], line: lineOf(t, m.index), resolved: resolveSpec(rel, m[1]) });
      }
    }
  }
  importCache.set(rel, res);
  return res;
}
function clausesOf(rel) {
  const f = files.get(rel);
  const res = [];
  if (f === undefined ? true : !f.isCode) return res;
  const t = stripComments(f.text);
  CLAUSE_RE.lastIndex = 0;
  let m;
  while ((m = CLAUSE_RE.exec(t)) !== null) {
    const clause = m[2].trim();
    let def = null;
    const named = [];
    const brace = clause.indexOf('{');
    const head = brace >= 0 ? clause.slice(0, brace) : clause;
    const headClean = head.replace(/,\s*$/, '').trim();
    if (headClean !== '' && !headClean.startsWith('*')) def = headClean;
    if (brace >= 0) {
      const inner = clause.slice(brace + 1, clause.lastIndexOf('}'));
      for (const part of inner.split(',')) {
        const nm = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
        if (nm !== '') named.push(nm);
      }
    }
    res.push({ spec: m[3], def, named, line: lineOf(t, m.index), typeOnly: m[1] !== undefined });
  }
  return res;
}
function closureText(rel, depth) {
  const seen = new Set();
  const parts = [];
  function visit(r, d) {
    if (seen.has(r)) return;
    seen.add(r);
    parts.push(T(r));
    if (d <= 0) return;
    for (const imp of importsOf(r)) {
      if (imp.resolved.kind === 'ok') {
        const t = imp.resolved.rel;
        if (t.startsWith('components/') ? true : t.startsWith('lib/') ? true : t.startsWith('workers/')) visit(t, d - 1);
      }
    }
  }
  visit(rel, depth);
  return parts.join('\n');
}

const referenced = new Set();
for (const f of files.values()) {
  if (!f.isCode ? true : f.rel === SELF) continue;
  for (const imp of importsOf(f.rel)) {
    const r = imp.resolved;
    if (r.kind === 'ok') {
      referenced.add(r.rel);
    } else if (r.kind === 'case') {
      referenced.add(r.rel);
      err('BUILD', f.rel, 'Line ' + imp.line + ': import "' + imp.spec + '" differs only by letter case from ' + r.rel + '. Vercel (Linux) fails on this.', 'REPLACE: fix the import casing to match ' + r.rel);
    } else if (r.kind === 'missing') {
      const guess = r.base + (f.ext === '.tsx' ? (r.base.startsWith('lib/') ? '.ts' : '.tsx') : '.ts');
      err('BUILD', f.rel, 'Line ' + imp.line + ': cannot resolve "' + imp.spec + '" (next build fails with Module not found).', 'NEW: create ' + guess + ' or remove the import.');
      flagMissing(guess, 'imported by ' + f.rel + ':' + imp.line);
    }
  }
}

for (const f of files.values()) {
  if (!f.isCode ? true : f.rel === SELF) continue;
  for (const cl of clausesOf(f.rel)) {
    const r = resolveSpec(f.rel, cl.spec);
    if (r.kind !== 'ok') continue;
    const target = files.get(r.rel);
    if (target === undefined ? true : !target.isCode) continue;
    const tt = T(r.rel);
    if (cl.def !== null && !/\bexport\s+default\b/.test(tt) && !/export\s*\{[^}]*\bdefault\b/.test(tt)) {
      err('BUILD', f.rel, 'Line ' + cl.line + ': default import "' + cl.def + '" from "' + cl.spec + '" but that file has no default export.', 'REPLACE: add export default or fix the import.');
    }
    if (/export\s+\*\s+from/.test(tt)) continue;
    for (const nm of cl.named) {
      const direct = new RegExp('export\\s+(?:async\\s+)?(?:const|let|var|function\\*?|class|type|interface|enum)\\s+' + nm + '\\b');
      const grouped = new RegExp('export\\s*(?:type\\s*)?\\{[^}]*\\b' + nm + '\\b');
      if (!direct.test(tt) && !grouped.test(tt)) {
        err('BUILD', f.rel, 'Line ' + cl.line + ': "' + nm + '" is imported from "' + cl.spec + '" but not exported there.', 'REPLACE: export it or fix the import.');
      }
    }
  }
}

const lowerSeen = new Map();
for (const k of files.keys()) {
  const lk = k.toLowerCase();
  if (lowerSeen.has(lk)) {
    err('DUPLICATION', k, 'Case-insensitive path collision with ' + lowerSeen.get(lk) + ' (breaks on Linux or Windows checkouts).', 'REMOVE one of the two.');
    removeMap.set(k, 'case collision with ' + lowerSeen.get(lk));
  } else {
    lowerSeen.set(lk, k);
  }
}

function req(p, alts) {
  return { p, alts: alts === undefined ? [] : alts };
}
const REQUIRED = [
  req('package.json'), req('next.config.ts', ['next.config.mjs', 'next.config.js']), req('tsconfig.json'),
  req('postcss.config.mjs'), req('.gitignore'), req('.env.example'),
  req('app/globals.css'), req('app/layout.tsx'), req('app/page.tsx'), req('app/not-found.tsx'), req('app/error.tsx'),
  req('app/manifest.ts'), req('app/robots.ts'), req('app/sitemap.ts'),
  req('app/icon.tsx', ['app/icon.png', 'app/icon.svg', 'app/icon.ico', 'app/favicon.ico']),
  req('app/apple-icon.tsx', ['app/apple-icon.png']),
  req('app/opengraph-image.tsx', ['app/opengraph-image.png']),
  req('app/ads.txt/route.ts', ['public/ads.txt']),
  req('app/about/page.tsx'), req('app/contact/page.tsx'), req('app/privacy-policy/page.tsx'),
  req('app/terms-and-conditions/page.tsx'), req('app/disclaimer/page.tsx'),
  req('app/tools/[slug]/page.tsx'), req('app/category/[slug]/page.tsx'),
  req('lib/site.ts'), req('lib/types.ts'), req('lib/categories.ts'), req('lib/seo.ts'), req('lib/schema.ts'),
  req('lib/search.ts'), req('lib/ads.ts'), req('lib/consent.ts'), req('lib/brand-mark.tsx'), req('lib/tools/index.ts'),
  ...['Logo', 'ThemeToggle', 'Header', 'SearchDialog', 'Footer', 'LegalLayout', 'AdSlot', 'AdsterraNativeBanner',
    'AdsterraSocialBar', 'ConsentBanner', 'JsonLd', 'Icon', 'Breadcrumbs', 'FaqList', 'ToolCard', 'ToolPageShell',
    'ToolExplorer', 'CategoryGrid', 'ContactForm'].map((n) => req('components/' + n + '.tsx')),
  req('components/tools/tool-map.tsx'),
];
for (const r of REQUIRED) {
  const ok = has(r.p) ? true : r.alts.some((a) => has(a));
  if (!ok) {
    err('STRUCTURE', r.p, 'Required file is missing.', 'NEW: create ' + r.p);
    flagMissing(r.p, 'required by ToolGlobe Pro master architecture');
  }
}

const HOOKS = ['useState', 'useEffect', 'useRef', 'useCallback', 'useMemo', 'useReducer', 'useLayoutEffect', 'useId', 'useTransition'];
const HOOK_RE = new RegExp('\\b(?:' + HOOKS.join(PIPE) + ')\\s*[(<]');
const HANDLER_RE = new RegExp('\\bon(?:' + ['Click', 'Change', 'Submit', 'Drop', 'KeyDown'].join(PIPE) + ')\\s*=');
const KW_G = new RegExp('\\b(?:const\\s' + PIPE + 'import\\s' + PIPE + 'export\\s' + PIPE + 'function\\b' + PIPE + 'return\\b)', 'g');
const SWALLOW_PARTS = [
  /\bconst\s+\w+\s*=/, /\blet\s+\w+\s*=/, /\breturn\s*[\w(\[{]/, /\bimport\s+[\w{*]/,
  /\bexport\s+(?:default\s+)?function\b/, /\bexport\s+const\b/, /=>\s*[{(]/, /;\s*\S/,
];
const phWords = ['\\.\\.\\.', 'rest of', 'remaining code', 'existing code', 'same as before', 'unchanged', 'omitted', 'truncated', 'implement me', 'your code here'];
const phTail = '(?:' + phWords.join(PIPE) + ')';
const PH_RES = [
  new RegExp('^\\s*\\/\\/+\\s*' + phTail, 'i'),
  new RegExp('^\\s*\\/\\*+\\s*' + phTail, 'i'),
  new RegExp('^\\s*\\*\\s*' + phTail, 'i'),
  /^\s*\.\.\.\s*$/,
];
const SECRET_RES = [
  /AKIA[0-9A-Z]{16}/, /-----BEGIN (?:RSA )?PRIVATE KEY-----/, /sk_live_[0-9A-Za-z]{16,}/,
  /ghp_[A-Za-z0-9]{36}/, /AIza[0-9A-Za-z_-]{35}/,
  /(?:api[_-]?key\s*[:=]\s*["'][A-Za-z0-9_-]{20,}["'])/i,
  /(?:secret\s*[:=]\s*["'][A-Za-z0-9_-]{20,}["'])/i,
];

const SUSPECT_NAME = alt(['\\.bak$', '\\.old$', '\\.orig$', '\\.rej$', '\\.tmp$', '~$', '\\(\\d+\\)', '[-_ ]copy\\b', '[-_]backup\\b', '^\\.DS_Store$', '^Thumbs\\.db$'], 'i');

for (const f of files.values()) {
  if (f.rel === SELF) continue;
  if (SUSPECT_NAME.test(f.base)) flagRemove(f.rel, 'Stale, backup or OS-junk file name.');
  if (f.base.includes(' ')) warn('STRUCTURE', f.rel, 'File name contains spaces.', 'REPLACE: rename with kebab-case.');
  if (f.rel.startsWith('components/tools/') && /^shared\./.test(f.base)) {
    err('DESIGN', f.rel, 'shared file inside components/tools is disallowed by the architecture rules.', 'REMOVE: inline helpers inside each tool component.');
    removeMap.set(f.rel, 'shared.* is disallowed in components/tools');
  }
  if (f.text === null ? true : f.base === 'package-lock.json') continue;
  const text = f.text;
  if (text.includes(BSL + 'vert')) {
    err('CORRUPTION', f.rel, 'Found the transfer-corruption marker for a pipe character (backslash-vert) at line ' + lineOf(text, text.indexOf(BSL + 'vert')) + '.', 'REPLACE: restore the original pipe operators, then re-paste via a file, not chat.');
  }
  if (f.isCode ? (text.includes('&vert;') ? true : text.includes('&#124;')) : false) {
    warn('CORRUPTION', f.rel, 'HTML entity for a pipe found in code.', 'REPLACE: restore the pipe character.');
  }
  if (/^\.env/.test(f.base) && f.base !== '.env.example') {
    err('SECURITY', f.rel, 'Environment file is present in the repo tree.', 'REMOVE: git rm --cached it, rotate any secrets, and make sure .gitignore covers .env*.');
    removeMap.set(f.rel, 'env file committed');
  }
  if (f.base !== '.env.example') {
    for (const re of SECRET_RES) {
      const m = re.exec(text);
      if (m !== null) {
        err('SECURITY', f.rel, 'Possible secret near line ' + lineOf(text, m.index) + '.', 'REPLACE: move to env vars and rotate the key.');
        break;
      }
    }
  }
  if (!f.isCode) continue;

  const sc = scans.get(f.rel);
  const code = sc.code;
  const rawLines = text.split('\n');
  if (f.size > 1200 && f.lines < 6) {
    err('CORRUPTION', f.rel, 'File is ' + f.size + ' bytes in only ' + f.lines + ' lines (collapsed line breaks).', 'REPLACE: re-create the file with real newlines.');
  }
  let longHits = 0;
  rawLines.forEach((line, i) => {
    if (line.length > 400 && longHits < 3) {
      const semis = line.split(';').length - 1;
      const kws = (line.match(KW_G) === null ? [] : line.match(KW_G)).length;
      if (semis >= 4 ? true : kws >= 3) {
        longHits++;
        err('CORRUPTION', f.rel, 'Line ' + (i + 1) + ' is ' + line.length + ' chars with multiple statements (collapsed code).', 'REPLACE: restore line breaks.');
      }
    }
    for (const re of PH_RES) {
      if (re.test(line)) {
        err('CORRUPTION', f.rel, 'Line ' + (i + 1) + ' looks like a truncation placeholder: ' + line.trim().slice(0, 60), 'REPLACE: supply the full code.');
        break;
      }
    }
  });
  for (const c of sc.inline) {
    if (c.text.length >= 60) {
      const hits = SWALLOW_PARTS.filter((r) => r.test(c.text)).length;
      if (hits >= 2) {
        warn('CORRUPTION', f.rel, 'Line ' + c.line + ': inline // comment contains code-like text; a collapsed line may have swallowed code.', 'REPLACE: put the comment on its own line and restore the code.');
      }
    }
  }
  const bal = { '{': 0, '}': 0, '(': 0, ')': 0, '[': 0, ']': 0 };
  for (const ch of code) {
    if (bal[ch] !== undefined) bal[ch]++;
  }
  if (bal['{'] !== bal['}'] ? true : bal['('] !== bal[')'] ? true : bal['['] !== bal[']']) {
    warn('CORRUPTION', f.rel, 'Unbalanced brackets (braces ' + bal['{'] + '/' + bal['}'] + ', parens ' + bal['('] + '/' + bal[')'] + ', brackets ' + bal['['] + '/' + bal[']'] + '). May be a truncated file or a parser false positive.', 'REPLACE if truncated.');
  }

  const evalRe = /\beval\s*\(/;
  const fnRe = /\bnew\s+Function\s*\(/;
  if (evalRe.test(code)) err('SECURITY', f.rel, 'eval() usage.', 'REPLACE: remove eval.');
  if (fnRe.test(code)) err('SECURITY', f.rel, 'new Function() usage.', 'REPLACE: remove dynamic code execution.');
  if (/\.innerHTML\s*=/.test(code)) err('SECURITY', f.rel, 'innerHTML assignment (XSS risk).', 'REPLACE: use textContent or React nodes.');
  if (/\bdocument\.write\s*\(/.test(code)) err('SECURITY', f.rel, 'document.write usage.', 'REPLACE: remove.');
  if (/\binsertAdjacentHTML\b/.test(code)) err('SECURITY', f.rel, 'insertAdjacentHTML usage.', 'REPLACE: use safe DOM APIs.');
  if (/\bdangerouslySetInnerHTML\b/.test(code)) {
    const sanitized = /sanitiz/i.test(text) ? true : /DOMPurify/.test(text);
    if (f.base === 'JsonLd.tsx') {
      if (!/u003c/i.test(text) && !/replace\(\s*\/</.test(text)) {
        warn('SECURITY', f.rel, 'JsonLd injects JSON without escaping "<".', 'REPLACE: JSON.stringify(data).replace(/</g, "\\u003c").');
      }
    } else if (f.rel === 'app/layout.tsx') {
      info('SECURITY', f.rel, 'dangerouslySetInnerHTML in layout (theme boot script). Keep it static.');
    } else if (!sanitized) {
      err('SECURITY', f.rel, 'dangerouslySetInnerHTML without any sanitizer in the file.', 'REPLACE: render React nodes or sanitize with an allow-list first.');
    } else {
      warn('SECURITY', f.rel, 'dangerouslySetInnerHTML present; confirm the sanitizer covers every input path.');
    }
  }
  if (/javascript\s*:/i.test(text) && !/sanitiz/i.test(text)) {
    warn('SECURITY', f.rel, 'javascript: URL string found without sanitizer context.', 'REPLACE: allow only http, https, mailto and tel.');
  }
  const anchorRe = /<a\b[^>]*target\s*=\s*["']_blank["'][^>]*>/g;
  let am;
  while ((am = anchorRe.exec(text)) !== null) {
    if (!/noopener/.test(am[0])) {
      warn('SECURITY', f.rel, 'Line ' + lineOf(text, am.index) + ': target="_blank" without rel="noopener noreferrer".', 'REPLACE: add rel="noopener noreferrer".');
    }
  }
  const nested = /\((?:[^()\n]*[+*])[^()\n]*\)[+*{]/;
  rawLines.forEach((line, i) => {
    if (line.includes('RegExp') ? true : /\/[^/\s][^\n]*\//.test(line)) {
      if (nested.test(line) && /\/[^/]*\([^)]*[+*][^)]*\)[+*][^/]*\//.test(line)) {
        warn('SECURITY', f.rel, 'Line ' + (i + 1) + ': regex with nested quantifiers (ReDoS risk).', 'REPLACE: unroll the pattern or cap input length.');
      }
    }
  });
  if (/new\s+RegExp\(/.test(code) && f.rel.startsWith('components/tools/') && !/escape/i.test(text)) {
    warn('SECURITY', f.rel, 'new RegExp() in a tool without an escape helper (ReDoS or injection from user input).', 'REPLACE: escape user text before building a RegExp.');
  }
  if (/__proto__/.test(text) && !/hasOwn/.test(text) && !/Object\.create\(null\)/.test(text)) {
    warn('SECURITY', f.rel, '__proto__ referenced without a guard.', 'REPLACE: use Object.create(null) or Map.');
  }

  const isToolUi = f.rel.startsWith('components/tools/') && f.rel !== 'components/tools/tool-map.tsx';
  const isToolLogic = isToolUi ? true : f.rel.startsWith('lib/tools/') ? true : /\.worker\.[jt]s$/.test(f.rel);
  const isServerEntry = /^app\/.*(?:page|layout|route)\.tsx?$/.test(f.rel);
  if (f.ext === '.tsx' || isServerEntry) {
    const head = text.replace(/^(?:\s*\/\/[^\n]*\n)+/, '');
    const hasDirective = /^\s*["']use client["']/.test(head);
    const usesClient = HOOK_RE.test(code) ? true : HANDLER_RE.test(code);
    if (usesClient && !hasDirective && !/^\s*["']use server["']/.test(head)) {
      if (isServerEntry) {
        err('BUILD', f.rel, 'Uses hooks or event handlers without "use client" in a server entry file.', 'REPLACE: add "use client" or move the UI into a client component.');
      } else {
        warn('BUILD', f.rel, 'Uses hooks or event handlers without "use client". Fine only if every importer is a client component.', 'REPLACE: add "use client" as the first line to be safe.');
      }
    }
  }
  if (isToolLogic) {
    if (/\b(?:XMLHttpRequest|sendBeacon|WebSocket|EventSource)\b/.test(code)) {
      err('PRIVACY', f.rel, 'Network primitive inside tool code; tools must stay client-only.', 'REPLACE: remove network access.');
    }
    if (/\bfetch\s*\(/.test(code)) {
      warn('PRIVACY', f.rel, 'fetch() inside tool code. Verify no user data leaves the browser.');
    }
    if (/<form\b[^>]*\b(?:action|method)\s*=/.test(text)) {
      err('PRIVACY', f.rel, 'Form with action or method inside tool UI could upload data.', 'REPLACE: handle submit in JS with preventDefault.');
    }
  }
  if (f.rel.startsWith('lib/tools/') && f.rel !== 'lib/tools/index.ts') {
    if (/\b(?:window|document|localStorage|navigator)\./.test(code)) {
      warn('BUILD', f.rel, 'Browser global used in a tool definition that is imported by server routes.', 'REPLACE: move browser logic into the component or worker.');
    }
    if (/from\s+["']react["']/.test(text)) {
      warn('BUILD', f.rel, 'Tool definition imports React; keep definitions as plain data.');
    }
  }
}

const sitemapText = T('app/sitemap.ts');
const robotsText = T('app/robots.ts');
const layoutText = T('app/layout.tsx');
const cssText = T('app/globals.css');
const nextCfgPath = has('next.config.ts') ? 'next.config.ts' : has('next.config.mjs') ? 'next.config.mjs' : 'next.config.js';
const nextCfgText = T(nextCfgPath);
const typesText = T('lib/types.ts');
const mapText = T('components/tools/tool-map.tsx');
const regText = T('lib/tools/index.ts');

const catSlugs = [];
{
  const re = /slug\s*:\s*["']([^"']+)["']/g;
  let m;
  const ct = T('lib/categories.ts');
  while ((m = re.exec(ct)) !== null) catSlugs.push(m[1]);
}
const catSet = new Set();
for (const s of catSlugs) {
  if (catSet.has(s)) err('REGISTRY', 'lib/categories.ts', 'Duplicate category slug "' + s + '".', 'REPLACE: keep one definition.');
  catSet.add(s);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) warn('REGISTRY', 'lib/categories.ts', 'Category slug "' + s + '" is not kebab-case.');
}
{
  const m = /type\s+CategorySlug\s*=\s*([^;]+);/.exec(typesText);
  if (m !== null && !/typeof/.test(m[1])) {
    const lits = [];
    const re = /["']([^"']+)["']/g;
    let x;
    while ((x = re.exec(m[1])) !== null) lits.push(x[1]);
    if (lits.length > 0) {
      for (const s of catSet) {
        if (!lits.includes(s)) err('REGISTRY', 'lib/types.ts', 'Category "' + s + '" exists in categories.ts but not in the CategorySlug union.', 'REPLACE: add it to CategorySlug.');
      }
      for (const s of lits) {
        if (!catSet.has(s)) warn('REGISTRY', 'lib/types.ts', 'CategorySlug lists "' + s + '" but categories.ts does not define it.');
      }
    }
  }
}

function pickStr(text, key) {
  const pats = [
    new RegExp('\\b' + key + '\\s*:\\s*"([^"]*)"'),
    new RegExp('\\b' + key + "\\s*:\\s*'([^']*)'"),
    new RegExp('\\b' + key + '\\s*:\\s*`([^`]*)`'),
  ];
  let best = null;
  for (const p of pats) {
    const m = p.exec(text);
    if (m !== null && (best === null ? true : m.index < best.index)) best = { index: m.index, v: m[1] };
  }
  return best === null ? null : best.v;
}
function depthKeys(code) {
  const keys = [];
  let depth = 0;
  for (const line of code.split('\n')) {
    if (depth === 1) {
      const m = /^\s*(?:readonly\s+)?(\w+)(\??)\s*:/.exec(line);
      if (m !== null) keys.push({ key: m[1], optional: m[2] === '?' });
    }
    for (const ch of line) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
  }
  return keys;
}
function typeBlock(code, name) {
  const re = new RegExp('\\b(?:interface' + PIPE + 'type)\\s+' + name + '\\b');
  const m = re.exec(code);
  if (m === null) return null;
  const start = code.indexOf('{', m.index);
  if (start < 0) return null;
  const between = code.slice(m.index, start);
  if (between.includes(';') ? true : /\n\s*(?:export\s+)?(?:type|interface)\s/.test(between.slice(5))) return null;
  let depth = 0;
  for (let i = start; i < code.length; i++) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}') {
      depth--;
      if (depth === 0) return code.slice(start, i + 1);
    }
  }
  return null;
}

const typesScan = scans.get('lib/types.ts');
const requiredKeys = new Set();
const optionalKeys = new Set();
if (typesScan !== undefined) {
  for (const nm of ['ToolSummary', 'ToolDefinition']) {
    const blk = typeBlock(typesScan.code, nm);
    if (blk !== null) {
      for (const k of depthKeys(blk)) {
        if (k.optional) optionalKeys.add(k.key);
        else requiredKeys.add(k.key);
      }
    }
  }
}

const toolDefs = [];
const nameSeen = new Set();
for (const rel of files.keys()) {
  let m = /^lib\/tools\/([^/]+)\.tsx?$/.exec(rel);
  let isDir = false;
  if (m === null) {
    m = /^lib\/tools\/([^/]+)\/index\.tsx?$/.exec(rel);
    isDir = m !== null;
  }
  if (m === null ? true : m[1] === 'index') continue;
  if (nameSeen.has(m[1])) {
    err('DUPLICATION', rel, 'Tool "' + m[1] + '" exists both as a flat file and as a subfolder.', 'REMOVE one layout.');
    removeMap.set(rel, 'flat vs subfolder tool conflict');
    continue;
  }
  nameSeen.add(m[1]);
  const text = isDir
    ? [...files.keys()].filter((k) => k.startsWith('lib/tools/' + m[1] + '/')).map((k) => T(k)).join('\n')
    : T(rel);
  const sc = scans.get(rel);
  toolDefs.push({ name: m[1], rel, isDir, text, strings: sc === undefined ? [] : sc.strings, code: sc === undefined ? '' : sc.code });
}

const tools = [];
for (const d of toolDefs) {
  const slug = pickStr(d.text, 'slug');
  if (slug === null) {
    info('REGISTRY', d.rel, 'No slug found; treating as a helper module, not a tool.');
    continue;
  }
  const words = d.strings.filter((s) => s.length >= 25 ? s.includes(' ') : false).join(' ').split(/\s+/).filter((w) => w !== '').length;
  const faqs = (d.code.match(/\bquestion\s*:/g) === null ? [] : d.code.match(/\bquestion\s*:/g)).length
    + (d.code.match(/\bq\s*:/g) === null ? [] : d.code.match(/\bq\s*:/g)).length;
  tools.push({
    slug, name: d.name, rel: d.rel, text: d.text, code: d.code,
    category: pickStr(d.text, 'category'),
    title: pickStr(d.text, 'title') === null ? pickStr(d.text, 'name') : pickStr(d.text, 'title'),
    description: pickStr(d.text, 'description'),
    words, faqs,
    registered: false, mapped: false, componentRel: null,
  });
}

const slugSeen = new Map();
for (const t of tools) {
  if (slugSeen.has(t.slug)) {
    err('REGISTRY', t.rel, 'Duplicate tool slug "' + t.slug + '" also defined in ' + slugSeen.get(t.slug) + '.', 'REPLACE: slugs must be unique.');
  } else {
    slugSeen.set(t.slug, t.rel);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t.slug)) warn('REGISTRY', t.rel, 'Slug "' + t.slug + '" is not kebab-case.');
  if (t.category === null) err('REGISTRY', t.rel, 'Tool has no category.', 'REPLACE: add category.');
  else if (catSet.size > 0 && !catSet.has(t.category)) {
    err('REGISTRY', t.rel, 'Category "' + t.category + '" is not defined in lib/categories.ts.', 'REPLACE: use an existing category or add it (also to CategorySlug).');
  }
  if (!/\bexport\s+default\b/.test(t.text)) err('REGISTRY', t.rel, 'Tool definition has no default export.', 'REPLACE: add export default.');
  if (!/ToolDefinition/.test(t.text)) warn('REGISTRY', t.rel, 'Tool is not typed with ToolDefinition.', 'REPLACE: annotate or use satisfies ToolDefinition.');
  for (const k of requiredKeys) {
    if (!new RegExp('\\b' + k + '\\b\\s*[:,}]').test(t.code)) {
      warn('REGISTRY', t.rel, 'Contract drift: required key "' + k + '" from lib/types.ts not found (verify; may be derived).', 'REPLACE: add the field.');
    }
  }
}
{
  const same = tools.filter((t) => t.name === t.slug).length;
  if (tools.length >= 3 ? same / tools.length >= 0.7 : false) {
    for (const t of tools) {
      if (t.name !== t.slug) warn('REGISTRY', t.rel, 'File name "' + t.name + '" differs from slug "' + t.slug + '" while most tools use slug as file name.', 'REPLACE: rename for parity.');
    }
  }
  const freq = new Map();
  for (const t of tools) {
    const keys = new Set(depthKeys(t.code).map((k) => k.key));
    for (const k of keys) freq.set(k, (freq.get(k) === undefined ? 0 : freq.get(k)) + 1);
    t.keys = keys;
  }
  if (tools.length >= 4) {
    for (const [k, c] of freq) {
      if (c / tools.length >= 0.6) {
        for (const t of tools) {
          if (!t.keys.has(k)) warn('REGISTRY', t.rel, 'Parity: key "' + k + '" is used by ' + c + ' of ' + tools.length + ' tools but missing here.', 'REPLACE: match the existing tool shape.');
        }
      }
    }
  }
}

const regImports = [];
const dynamicRegistry = /import\.meta\.glob/.test(regText) ? true : /require\.context/.test(regText) ? true : /readdirSync/.test(regText);
{
  for (const cl of clausesOf('lib/tools/index.ts')) {
    const r = resolveSpec('lib/tools/index.ts', cl.spec);
    if (cl.def !== null && cl.spec.startsWith('.')) {
      regImports.push({ ident: cl.def, spec: cl.spec, rel: r.kind === 'ok' ? r.rel : null, line: cl.line });
    }
  }
  const stripped = scans.get('lib/tools/index.ts') === undefined ? '' : scans.get('lib/tools/index.ts').code;
  for (const ri of regImports) {
    const uses = (stripped.match(new RegExp('\\b' + ri.ident + '\\b', 'g')) === null ? [] : stripped.match(new RegExp('\\b' + ri.ident + '\\b', 'g'))).length;
    if (ri.rel === null) {
      continue;
    }
    if (uses < 2) warn('REGISTRY', 'lib/tools/index.ts', 'Line ' + ri.line + ': "' + ri.ident + '" is imported but never added to the tools list.', 'REPLACE: add it to the exported tools array.');
    const t = tools.find((x) => x.rel === ri.rel);
    if (t !== undefined) t.registered = uses >= 2;
  }
  if (!dynamicRegistry) {
    for (const t of tools) {
      if (!t.registered) {
        warn('REGISTRY', t.rel, 'Tool "' + t.slug + '" is not registered in lib/tools/index.ts (will not appear in routes, sitemap or search).', 'REPLACE lib/tools/index.ts: import it and add it to the tools array.');
      }
    }
  } else {
    info('REGISTRY', 'lib/tools/index.ts', 'Registry looks dynamic (glob or readdir); per-tool registration checks skipped.');
    for (const t of tools) t.registered = true;
  }
}

const mapEntries = new Map();
{
  const identRe = /^\s*["']?([a-z0-9][a-z0-9-]*)["']?\s*:\s*([A-Z][A-Za-z0-9_]*)/gm;
  const dynRe = /^\s*["']?([a-z0-9][a-z0-9-]*)["']?\s*:\s*dynamic\s*\(/gm;
  const caseRe = /case\s+["']([a-z0-9-]+)["']\s*:/g;
  let m;
  const mapClauses = clausesOf('components/tools/tool-map.tsx');
  while ((m = identRe.exec(mapText)) !== null) {
    const cl = mapClauses.find((c) => c.def === m[2] ? true : c.named.includes(m[2]));
    const r = cl === undefined ? null : resolveSpec('components/tools/tool-map.tsx', cl.spec);
    mapEntries.set(m[1], { ident: m[2], rel: r !== null && r.kind === 'ok' ? r.rel : null, line: lineOf(mapText, m.index) });
  }
  while ((m = dynRe.exec(mapText)) !== null) {
    const tail = mapText.slice(m.index, m.index + 400);
    const im = /import\(\s*["']([^"']+)["']\s*\)/.exec(tail);
    const r = im === null ? null : resolveSpec('components/tools/tool-map.tsx', im[1]);
    mapEntries.set(m[1], { ident: 'dynamic', rel: r !== null && r.kind === 'ok' ? r.rel : null, line: lineOf(mapText, m.index) });
  }
  while ((m = caseRe.exec(mapText)) !== null) {
    if (!mapEntries.has(m[1])) mapEntries.set(m[1], { ident: 'case', rel: null, line: lineOf(mapText, m.index) });
  }
  if (has('components/tools/tool-map.tsx') && mapEntries.size === 0 && tools.length > 0) {
    warn('REGISTRY', 'components/tools/tool-map.tsx', 'Could not parse any slug-to-component entries; map style is unusual.', 'Paste this file so the audit can learn its shape.');
  }
}
for (const t of tools) {
  const e = mapEntries.get(t.slug);
  if (e === undefined) {
    if (mapEntries.size > 0) {
      err('REGISTRY', 'components/tools/tool-map.tsx', 'Tool "' + t.slug + '" has no component entry in tool-map.tsx (tool page will have no interactive UI).', 'REPLACE tool-map.tsx: import the component and map "' + t.slug + '" to it.');
    }
  } else {
    t.mapped = true;
    t.componentRel = e.rel;
  }
}
for (const [slug, e] of mapEntries) {
  if (!slugSeen.has(slug) && slug.includes('-')) {
    warn('REGISTRY', 'components/tools/tool-map.tsx', 'Line ' + e.line + ': map key "' + slug + '" has no matching tool definition.', 'REPLACE: remove the stale entry or add the tool.');
  }
}

const importedByAny = new Set(referenced);
for (const f of files.values()) {
  if (!f.isCode ? true : f.rel === SELF) continue;
  const underScope = f.rel.startsWith('components/') ? true : f.rel.startsWith('lib/') ? true : f.rel.startsWith('workers/');
  if (!underScope) continue;
  if (importedByAny.has(f.rel)) continue;
  if (/^lib\/tools\/[^/]+\.tsx?$/.test(f.rel) && f.rel !== 'lib/tools/index.ts') continue;
  flagRemove(f.rel, 'Orphan: nothing imports this file.');
}

for (const f of files.values()) {
  if (!f.isCode ? true : !f.rel.startsWith('components/tools/')) continue;
  if (f.rel === 'components/tools/tool-map.tsx') continue;
  if (/\.worker\.[jt]s$/.test(f.rel)) continue;
  const text = f.text;
  const code = scans.get(f.rel).code;
  for (const imp of importsOf(f.rel)) {
    const r = imp.resolved;
    const target = r.kind === 'ok' ? r.rel : '';
    if (/(?:^\.\/shared$)/.test(imp.spec) ? true : /\/shared(?:\.|$)/.test(imp.spec)) {
      err('DESIGN', f.rel, 'Line ' + imp.line + ': imports shared module "' + imp.spec + '" (disallowed in tool UI).', 'REPLACE: inline helpers.');
    }
    if (target === 'components/Icon.tsx' ? true : /\/Icon$/.test(imp.spec)) {
      err('DESIGN', f.rel, 'Line ' + imp.line + ': tool UI imports Icon (disallowed).', 'REPLACE: use inline SVG.');
    }
  }
  if (/<Icon\b/.test(code)) err('DESIGN', f.rel, '<Icon> used in tool UI.', 'REPLACE: inline SVG.');
  const nonTrivial = f.lines > 40;
  if (nonTrivial && !/\bcard\b/.test(text) && !/\bbtn-(?:primary|secondary|ghost)\b/.test(text)) {
    warn('DESIGN', f.rel, 'Does not use the shared design classes (card, btn-primary, btn-secondary, btn-ghost, input, chip).', 'REPLACE: align with live tool styling.');
  }
  if (nonTrivial && !/\b(?:sm|md|lg):/.test(text) && !/grid-cols/.test(text) && !/flex-wrap/.test(text)) {
    warn('DESIGN', f.rel, 'No responsive utilities detected (sm:, md:, lg:, grid-cols, flex-wrap).', 'REPLACE: add mobile-first layout.');
  }
  if ((/<textarea\b/.test(text) ? true : /<pre\b/.test(text)) && !/overflow-/.test(text) && !/break-/.test(text) && !/whitespace-pre-wrap/.test(text) && !/min-w-0/.test(text)) {
    warn('DESIGN', f.rel, 'Textarea or pre without overflow or wrapping utilities (mobile overflow risk).', 'REPLACE: add overflow-auto, break-words or min-w-0.');
  }
  const inputs = (text.match(/<(?:textarea|input|select)\b/g) === null ? [] : text.match(/<(?:textarea|input|select)\b/g)).length;
  const labels = (text.match(/aria-label|htmlFor|aria-labelledby/g) === null ? [] : text.match(/aria-label|htmlFor|aria-labelledby/g)).length;
  if (inputs > labels) warn('A11Y', f.rel, inputs + ' form controls but only ' + labels + ' labels or aria-labels.', 'REPLACE: label every control.');
  const buttons = (text.match(/<button\b/g) === null ? [] : text.match(/<button\b/g)).length;
  const typed = (text.match(/<button\b[^>]*\btype\s*=/g) === null ? [] : text.match(/<button\b[^>]*\btype\s*=/g)).length;
  if (buttons > typed) warn('A11Y', f.rel, (buttons - typed) + ' button(s) without type attribute.', 'REPLACE: add type="button".');
  if (/<img\b(?![^>]*\balt=)/.test(text)) warn('A11Y', f.rel, '<img> without alt.', 'REPLACE: add alt.');
  if (nonTrivial && !/aria-live/.test(text) && !/role\s*=\s*["']alert["']/.test(text) && !/role\s*=\s*["']status["']/.test(text)) {
    info('A11Y', f.rel, 'No aria-live or role=status/alert region for results and errors.');
  }
  const hexes = (text.match(/#[0-9a-fA-F]{6}\b/g) === null ? [] : text.match(/#[0-9a-fA-F]{6}\b/g)).length;
  if (hexes > 3) warn('DESIGN', f.rel, hexes + ' hard-coded hex colors; theme tokens or Tailwind classes keep dark/light consistent.', 'REPLACE: use theme classes.');
  if (f.lines < 40) warn('TOOL', f.rel, 'Very small component (' + f.lines + ' lines); may be a stub.');
  if (/coming soon/i.test(text) ? true : /not implemented/i.test(text) ? true : /lorem ipsum/i.test(text)) {
    err('TOOL', f.rel, 'Stub text found (coming soon, not implemented or lorem ipsum).', 'REPLACE: implement the tool.');
  }
  if (/=>\s*\{\s*\}/.test(code) && /\bon(?:Click|Change)\s*=\s*\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/.test(code)) {
    err('TOOL', f.rel, 'Empty event handler (non-functional control).', 'REPLACE: implement handler.');
  }
}

for (const t of tools) {
  const comp = t.componentRel;
  const closure = comp === null ? '' : closureText(comp, 2);
  const f = {
    file: /type\s*=\s*["']file["']/.test(closure),
    drop: /onDrop/.test(closure),
    worker: /new\s+Worker\s*\(/.test(closure),
    stream: /\.stream\s*\(\s*\)/.test(closure) ? true : /getReader\s*\(/.test(closure) ? true : /\.slice\s*\(\s*\w+\s*,/.test(closure),
    progress: /progress/i.test(closure),
    copy: /clipboard/.test(closure),
    download: /download/.test(closure),
    revoke: /revokeObjectURL/.test(closure),
    createUrl: /createObjectURL/.test(closure),
    terminate: /\.terminate\s*\(/.test(closure),
    handlers: HANDLER_RE.test(closure),
    sizeGuard: /600/.test(closure) ? true : /MAX_[A-Z_]*(?:BYTES|SIZE)/.test(closure) ? true : /maxBytes/i.test(closure),
  };
  t.feat = f;
  if (comp !== null) {
    if (!f.handlers) warn('TOOL', comp, 'Tool "' + t.slug + '" has no onClick, onChange, onSubmit or onDrop handler (possibly non-functional).', 'REPLACE: wire up interactions.');
    if (f.createUrl && !f.revoke) err('MEMORY', comp, 'createObjectURL without revokeObjectURL (memory leak with big files).', 'REPLACE: revoke after download and on unmount.');
    if (f.worker && !f.terminate) warn('MEMORY', comp, 'Worker created but never terminated.', 'REPLACE: worker.terminate() on finish, cancel and unmount.');
    if (f.file && !f.sizeGuard) warn('TOOL', comp, 'File input without a size guard (600 MB cap).', 'REPLACE: add a MAX_BYTES check and a clear error.');
    if (f.file && !f.worker && !f.stream) warn('TOOL', comp, 'File tool without Worker or streaming/slicing; large files may freeze the tab.', 'REPLACE: process in a Worker with chunked reads.');
    if (f.file && !f.drop) info('TOOL', comp, 'File tool without drag-and-drop.');
    if (f.file && !f.progress) info('TOOL', comp, 'File tool without a progress indicator.');
    if (!f.copy) info('TOOL', comp, 'No copy-to-clipboard action.');
  } else if (mapEntries.size > 0) {
    warn('TOOL', t.rel, 'Component file for "' + t.slug + '" could not be resolved from tool-map.tsx.');
  }
  if (t.words < 500) warn('SEO', t.rel, '"' + t.slug + '" has ~' + t.words + ' words of content (target 500-800).', 'REPLACE: expand intro, how-to and FAQ copy.');
  if (t.faqs < 4) warn('SEO', t.rel, '"' + t.slug + '" has ' + t.faqs + ' FAQ items (target 4 or more).', 'REPLACE: add practical FAQs.');
  if (t.title !== null && t.title.length > 65) warn('SEO', t.rel, 'Title is ' + t.title.length + ' chars (may be truncated in SERPs).');
  if (t.description === null) warn('SEO', t.rel, 'No description.');
  else if (t.description.length < 70 ? true : t.description.length > 170) warn('SEO', t.rel, 'Description is ' + t.description.length + ' chars (aim for 120-160).');
  if (/pdf/i.test(t.slug)) info('TOOL', t.rel, 'PDF tool present. Project rule: PDF tools stay skipped unless pdf-lib is installed and approved.');
}
for (const f of files.values()) {
  if (!f.isCode ? true : !/\.worker\.[jt]s$/.test(f.rel)) continue;
  const text = f.text;
  if (!/onmessage/.test(text) && !/addEventListener\(\s*["']message["']/.test(text)) err('TOOL', f.rel, 'Worker never listens for messages.', 'REPLACE: add onmessage.');
  if (!/postMessage/.test(text)) err('TOOL', f.rel, 'Worker never posts results.', 'REPLACE: add postMessage.');
  if (!/catch/.test(text)) warn('TOOL', f.rel, 'Worker has no try/catch; errors will not reach the UI.', 'REPLACE: post an error message on failure.');
}
{
  const catCount = new Map();
  for (const t of tools) catCount.set(t.category, (catCount.get(t.category) === undefined ? 0 : catCount.get(t.category)) + 1);
  for (const s of catSet) {
    const c = catCount.get(s) === undefined ? 0 : catCount.get(s);
    if (c === 0) info('GROWTH', 'lib/categories.ts', 'Category "' + s + '" has no tools yet (empty category page is thin content).');
    else if (c < 3) info('GROWTH', 'lib/categories.ts', 'Category "' + s + '" has only ' + c + ' tool(s).');
  }
}

const toolsPage = T('app/tools/[slug]/page.tsx');
if (has('app/tools/[slug]/page.tsx')) {
  if (!/generateStaticParams/.test(toolsPage)) warn('SEO', 'app/tools/[slug]/page.tsx', 'No generateStaticParams (tool pages will not be prerendered).', 'REPLACE: export generateStaticParams from the registry.');
  if (!/generateMetadata/.test(toolsPage)) err('SEO', 'app/tools/[slug]/page.tsx', 'No generateMetadata.', 'REPLACE: add per-tool metadata.');
  if (!/notFound/.test(toolsPage)) warn('SEO', 'app/tools/[slug]/page.tsx', 'No notFound() for unknown slugs.');
}
for (const f of files.values()) {
  if (!/^app\/.*\[[^\]]+\]\/page\.tsx$/.test(f.rel)) continue;
  const t = f.text;
  if (/params\s*:\s*\{/.test(t) && !/Promise\s*</.test(t)) {
    err('BUILD', f.rel, 'params typed as a plain object. In Next 15 and 16, params is a Promise.', 'REPLACE: params: Promise<{...}> and await params.');
  }
  if (/\bparams\.\w+/.test(t) && !/await\s+params/.test(t)) {
    warn('BUILD', f.rel, 'params property read without awaiting params.', 'REPLACE: const { slug } = await params.');
  }
}
for (const f of files.values()) {
  if (!f.isCode ? true : f.rel === SELF) continue;
  if (/noindex/i.test(f.text) ? true : /index\s*:\s*false/.test(scans.get(f.rel).code)) {
    err('SEO', f.rel, 'noindex or index:false found. All pages must stay indexable.', 'REPLACE: remove it.');
  }
}
if (/noindex/i.test(nextCfgText)) err('SEO', nextCfgPath, 'noindex header in next.config.', 'REPLACE: remove X-Robots-Tag noindex.');
if (has('app/sitemap.ts')) {
  if (!/lib\/tools/.test(sitemapText)) warn('SEO', 'app/sitemap.ts', 'Sitemap does not import the tool registry (new tools would be missed).', 'REPLACE: build entries from the registry.');
  if (!/categor/i.test(sitemapText)) warn('SEO', 'app/sitemap.ts', 'Sitemap does not list category pages.', 'REPLACE: add category URLs.');
  for (const p of ['/about', '/contact', '/privacy-policy', '/terms-and-conditions', '/disclaimer']) {
    if (!sitemapText.includes(p)) warn('SEO', 'app/sitemap.ts', 'Static page ' + p + ' missing from sitemap.', 'REPLACE: add it.');
  }
  for (const t of tools) {
    if (sitemapText.includes('/tools/' + t.slug)) warn('SEO', 'app/sitemap.ts', 'Hardcoded tool URL for "' + t.slug + '" (does not scale).', 'REPLACE: derive from registry.');
  }
}
if (has('app/robots.ts')) {
  if (!/sitemap/i.test(robotsText)) warn('SEO', 'app/robots.ts', 'robots does not reference the sitemap.', 'REPLACE: add sitemap URL.');
  if (/disallow\s*:\s*["']\/["']/.test(robotsText)) err('SEO', 'app/robots.ts', 'Disallow: / blocks the entire site.', 'REPLACE: remove.');
}
if (has('app/ads.txt/route.ts')) {
  const adsText = T('app/ads.txt/route.ts');
  if (!/text\/plain/.test(adsText)) warn('SEO', 'app/ads.txt/route.ts', 'ads.txt route does not send Content-Type text/plain.', 'REPLACE: set the header.');
}
if (has('app/manifest.ts')) {
  const mt = T('app/manifest.ts');
  for (const k of ['name', 'short_name', 'start_url', 'display', 'icons']) {
    if (!new RegExp('\\b' + k + '\\b').test(mt)) warn('SEO', 'app/manifest.ts', 'Manifest missing "' + k + '".');
  }
}
if (has('app/layout.tsx')) {
  if (!/metadataBase/.test(layoutText) && !/metadataBase/.test(T('lib/seo.ts'))) warn('SEO', 'app/layout.tsx', 'metadataBase not set (relative OG and canonical URLs break).', 'REPLACE: set metadataBase from site.ts.');
  if (!/tgp-theme/.test(layoutText)) warn('DESIGN', 'app/layout.tsx', 'Theme boot script with tgp-theme not found (flash of wrong theme).', 'REPLACE: restore the initialization script.');
  if (!/<html[^>]*\blang=/.test(layoutText)) warn('A11Y', 'app/layout.tsx', '<html> has no lang attribute.');
  if (!/JsonLd/.test(layoutText)) info('SEO', 'app/layout.tsx', 'No site-wide JSON-LD (WebSite or Organization) in layout.');
}
if (has('lib/seo.ts')) {
  const st = T('lib/seo.ts');
  if (!/canonical/.test(st)) warn('SEO', 'lib/seo.ts', 'No canonical in metadata helper.', 'REPLACE: add alternates.canonical.');
  if (!/openGraph/.test(st)) warn('SEO', 'lib/seo.ts', 'No openGraph metadata.');
  if (!/twitter/.test(st)) warn('SEO', 'lib/seo.ts', 'No twitter metadata.');
}
if (has('lib/schema.ts')) {
  const sct = T('lib/schema.ts');
  for (const k of ['FAQPage', 'BreadcrumbList', 'WebSite']) {
    if (!sct.includes(k)) warn('SEO', 'lib/schema.ts', 'Schema type ' + k + ' not generated.');
  }
  if (!/SoftwareApplication/.test(sct) && !/WebApplication/.test(sct)) warn('SEO', 'lib/schema.ts', 'No SoftwareApplication or WebApplication schema for tools.');
}
if (has('components/ToolPageShell.tsx')) {
  const sh = T('components/ToolPageShell.tsx');
  for (const k of ['JsonLd', 'Breadcrumbs', 'FaqList', 'AdSlot']) {
    if (!sh.includes(k)) warn('SEO', 'components/ToolPageShell.tsx', 'ToolPageShell does not use ' + k + '.');
  }
  if (!/related/i.test(sh)) info('GROWTH', 'components/ToolPageShell.tsx', 'No related-tools block (internal linking and session depth).');
}
{
  const hrefsTools = [...files.values()].some((f) => f.isCode && f.rel !== SELF && /href\s*=\s*["']\/tools["']/.test(f.text));
  if (hrefsTools && !has('app/tools/page.tsx') && !/\/tools["']/.test(nextCfgText)) {
    warn('SEO', 'app/tools/page.tsx', 'Something links to /tools but there is no app/tools/page.tsx or redirect (404).', 'NEW: add app/tools/page.tsx or a redirect in next.config.');
  }
  for (const t of tools) {
    if (has('app/tools/' + t.slug + '/page.tsx')) {
      err('REGISTRY', 'app/tools/' + t.slug + '/page.tsx', 'Static route shadows the dynamic /tools/[slug] page for "' + t.slug + '".', 'REMOVE: delete the static page.');
      removeMap.set('app/tools/' + t.slug + '/page.tsx', 'shadows dynamic route');
    }
  }
}

if (has('app/globals.css')) {
  for (const k of ['.card', '.input', '.btn-primary', '.btn-secondary', '.btn-ghost', '.chip']) {
    if (!new RegExp(k.replace('.', '\\.') + '\\b').test(cssText)) err('DESIGN', 'app/globals.css', 'Design class ' + k + ' is not defined.', 'REPLACE: restore it.');
  }
  const customs = new Set(['card', 'input', 'chip', 'btn', 'btn-primary', 'btn-secondary', 'btn-ghost']);
  const applyRe = /@apply\s+([^;]+);/g;
  let m;
  while ((m = applyRe.exec(cssText)) !== null) {
    for (const tok of m[1].split(/\s+/)) {
      const bare = tok.split(':').pop().replace(/^!/, '');
      if (customs.has(bare)) err('DESIGN', 'app/globals.css', 'Line ' + lineOf(cssText, m.index) + ': @apply of custom class "' + bare + '" (breaks Tailwind v4).', 'REPLACE: write plain CSS or Tailwind utilities.');
    }
  }
  if (!/\.dark/.test(cssText) && !/data-theme/.test(cssText) && !/custom-variant\s+dark/.test(cssText) && !/prefers-color-scheme/.test(cssText)) {
    warn('DESIGN', 'app/globals.css', 'No dark-theme hooks found.', 'REPLACE: add dark variables.');
  }
  if (!/focus-visible/.test(cssText)) info('A11Y', 'app/globals.css', 'No :focus-visible styles.');
  if (!/prefers-reduced-motion/.test(cssText)) info('A11Y', 'app/globals.css', 'No prefers-reduced-motion handling.');
}
if (has('components/ThemeToggle.tsx') && !/tgp-theme/.test(T('components/ThemeToggle.tsx'))) {
  warn('DESIGN', 'components/ThemeToggle.tsx', 'ThemeToggle does not use the tgp-theme storage key.');
}

if (has('components/AdsterraSocialBar.tsx')) {
  const a = T('components/AdsterraSocialBar.tsx');
  const checks = [
    ['frequency storage (sessionStorage or localStorage)', /sessionStorage/.test(a) ? true : /localStorage/.test(a)],
    ['30-minute interval', /30\s*\*\s*60/.test(a) ? true : /1800000/.test(a) ? true : /1_800_000/.test(a)],
    ['delay before load (setTimeout)', /setTimeout/.test(a)],
    ['user-interaction gating', /pointerdown/.test(a) ? true : /scroll/.test(a) ? true : /keydown/.test(a) ? true : /click/.test(a)],
    ['skip on legal and contact pages', /usePathname/.test(a) ? /contact/.test(a) : false],
    ['consent gating', /consent/i.test(a)],
  ];
  for (const [label, ok] of checks) {
    if (!ok) warn('ADS', 'components/AdsterraSocialBar.tsx', 'Missing: ' + label + '.', 'REPLACE: restore the frequency cap and compliance guard.');
  }
}
if (has('components/AdsterraNativeBanner.tsx') && !/consent/i.test(T('components/AdsterraNativeBanner.tsx')) && !/consent/i.test(T('components/AdSlot.tsx'))) {
  warn('ADS', 'components/AdsterraNativeBanner.tsx', 'No consent check around the native banner.', 'REPLACE: gate on consent state.');
}
{
  const consentAll = T('lib/consent.ts') + '\n' + T('components/ConsentBanner.tsx');
  if (has('lib/consent.ts')) {
    if (!/globalPrivacyControl/.test(consentAll)) warn('PRIVACY', 'lib/consent.ts', 'Global Privacy Control (navigator.globalPrivacyControl) not handled.', 'REPLACE: honor GPC as an opt-out.');
    if (!/\bEEA\b/.test(consentAll) && !/\bEU\b/.test(consentAll)) warn('PRIVACY', 'lib/consent.ts', 'No EU or EEA region logic.');
    if (!/\bUK\b/.test(consentAll) && !/\bGB\b/.test(consentAll)) warn('PRIVACY', 'lib/consent.ts', 'No UK handling.');
    if (!/California/i.test(consentAll) && !/US-CA/.test(consentAll) && !/\bCCPA\b/.test(consentAll)) warn('PRIVACY', 'lib/consent.ts', 'No California or CCPA handling.');
  }
  const geoSrc = [...files.values()].some((f) => f.isCode && f.rel !== SELF && /x-vercel-ip-country/.test(f.text));
  if (!geoSrc) info('PRIVACY', 'proxy.ts', 'No server-side geo source (x-vercel-ip-country) found; region logic relies on client heuristics. Consider proxy.ts (Next 16) to set a region cookie.');
}

if (has('package.json')) {
  let pkg = null;
  try {
    pkg = JSON.parse(T('package.json'));
  } catch {
    err('BUILD', 'package.json', 'package.json is not valid JSON.', 'REPLACE');
  }
  if (pkg !== null) {
    const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
    for (const k of ['next', 'react', 'react-dom', 'typescript', 'tailwindcss']) {
      if (deps[k] === undefined) err('BUILD', 'package.json', 'Missing dependency "' + k + '".', 'REPLACE');
    }
    if (pkg.scripts === undefined ? true : pkg.scripts.build === undefined) err('BUILD', 'package.json', 'No build script.', 'REPLACE');
    if (pkg.scripts !== undefined && pkg.scripts.audit === undefined) info('STRUCTURE', 'package.json', 'Add script: "audit": "node scripts/audit-repo.mjs"');
    if (deps['pdf-lib'] !== undefined && !tools.some((t) => /pdf/i.test(t.slug))) info('TOOL', 'package.json', 'pdf-lib installed but no PDF tools exist (project rule: PDF tools skipped).');
    info('STRUCTURE', 'package.json', 'Dependencies: ' + Object.keys(deps).join(', '));
  }
}
{
  const locks = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'].filter((l) => has(l));
  if (locks.length > 1) warn('BUILD', locks[1], 'Multiple lockfiles: ' + locks.join(', '), 'REMOVE all but one.');
  const gi = T('.gitignore');
  for (const k of ['node_modules', '.next', '.env', '.vercel']) {
    if (!gi.includes(k)) warn('SECURITY', '.gitignore', '.gitignore does not mention ' + k + '.', 'REPLACE: add it.');
  }
  if (!gi.includes('audit-report')) info('STRUCTURE', '.gitignore', 'Add audit-report/ to .gitignore.');
}
if (has(nextCfgPath)) {
  const hdrs = ['Content-Security-Policy', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy', 'Strict-Transport-Security'];
  for (const h of hdrs) {
    if (!nextCfgText.includes(h)) warn('SECURITY', nextCfgPath, 'Missing security header ' + h + '.', 'REPLACE: add it in headers().');
  }
  if (!/X-Frame-Options/.test(nextCfgText) && !/frame-ancestors/.test(nextCfgText)) warn('SECURITY', nextCfgPath, 'No clickjacking protection (X-Frame-Options or frame-ancestors).');
  if (/ignoreBuildErrors\s*:\s*true/.test(nextCfgText) ? true : /ignoreDuringBuilds\s*:\s*true/.test(nextCfgText)) err('BUILD', nextCfgPath, 'Build errors are being ignored.', 'REPLACE: remove the ignore flag.');
  if (/poweredByHeader\s*:\s*false/.test(nextCfgText) === false) info('SECURITY', nextCfgPath, 'poweredByHeader is not disabled.');
  if (/unsafe-eval/.test(nextCfgText)) warn('SECURITY', nextCfgPath, "CSP allows 'unsafe-eval'.", 'REPLACE: remove if possible.');
  const usesWorkers = [...files.values()].some((f) => f.isCode && /new\s+Worker\s*\(/.test(f.text));
  if (usesWorkers && /Content-Security-Policy/.test(nextCfgText) && !/worker-src/.test(nextCfgText)) {
    warn('SECURITY', nextCfgPath, "Workers are used but CSP has no worker-src (falls back to script-src; blob workers may be blocked).", "REPLACE: add worker-src 'self' blob:.");
  }
}

{
  const byHash = new Map();
  for (const f of files.values()) {
    if (!f.isCode ? true : f.size < 200 ? true : f.rel === SELF) continue;
    const h = crypto.createHash('sha1').update(f.text.replace(/\s+/g, ' ')).digest('hex');
    if (byHash.has(h)) {
      flagRemove(f.rel, 'Identical content to ' + byHash.get(h) + '.');
    } else {
      byHash.set(h, f.rel);
    }
  }
  const comps = new Map();
  for (const f of files.values()) {
    if (!f.isCode ? true : f.rel === SELF) continue;
    const m = /export\s+default\s+(?:async\s+)?function\s+([A-Z]\w*)/.exec(f.text);
    if (m !== null) {
      if (comps.has(m[1]) && /^components\//.test(f.rel)) {
        warn('DUPLICATION', f.rel, 'Component name "' + m[1] + '" is also defined in ' + comps.get(m[1]) + '.', 'REMOVE or rename one.');
      } else {
        comps.set(m[1], f.rel);
      }
    }
  }
}

const statusOf = new Map();
for (const f of files.values()) statusOf.set(f.rel, { status: 'OK', notes: [] });
for (const [rel, reason] of removeMap) {
  if (!statusOf.has(rel)) statusOf.set(rel, { status: 'REMOVE', notes: [] });
  statusOf.get(rel).status = 'REMOVE';
  statusOf.get(rel).notes.push(reason);
}
for (const fd of findings) {
  if (fd.file === '' ? true : !statusOf.has(fd.file)) continue;
  const s = statusOf.get(fd.file);
  if (fd.sev === 'error' && s.status === 'OK') s.status = 'REPLACE';
  if (fd.sev !== 'info') s.notes.push(fd.msg);
}
const newFiles = [...missingFiles.entries()].map(([p, why]) => ({ path: p, why }));

const count = (sev) => findings.filter((f) => f.sev === sev).length;
const errors = count('error');
const warns = count('warn');
const infos = count('info');

let commit = 'unknown';
try {
  commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch {
  commit = 'no-git';
}
let pkgJson = {};
try {
  pkgJson = JSON.parse(T('package.json'));
} catch {
  pkgJson = {};
}
const siteName = pickStr(T('lib/site.ts'), 'name');
const siteUrl = pickStr(T('lib/site.ts'), 'url');

function head(rel, n) {
  return T(rel).split('\n').slice(0, n).join('\n');
}
function sevOrder(s) {
  return s === 'error' ? 0 : s === 'warn' ? 1 : 2;
}

function buildReport() {
  const L = [];
  L.push('# ToolGlobe Pro Audit Report');
  L.push('');
  L.push('Generated: ' + new Date().toISOString() + '  Commit: ' + commit);
  L.push('');
  L.push('Errors: ' + errors + '  Warnings: ' + warns + '  Info: ' + infos + '  Files scanned: ' + files.size);
  L.push('');
  L.push('## New files needed');
  L.push('');
  if (newFiles.length === 0) L.push('None.');
  for (const n of newFiles) L.push('- NEW ' + n.path + ' (' + n.why + ')');
  L.push('');
  L.push('## Tool matrix');
  L.push('');
  L.push(row(['slug', 'category', 'registered', 'in map', 'words', 'faqs', 'worker', 'file', 'drop', 'progress', 'copy', 'download']));
  L.push(sepRow(12));
  for (const t of tools) {
    const f = t.feat === undefined ? {} : t.feat;
    const yn = (v) => (v ? 'yes' : 'no');
    L.push(row([t.slug, t.category === null ? '?' : t.category, yn(t.registered), yn(t.mapped), t.words, t.faqs, yn(f.worker), yn(f.file), yn(f.drop), yn(f.progress), yn(f.copy), yn(f.download)]));
  }
  L.push('');
  L.push('## Findings (errors first)');
  L.push('');
  const sorted = [...findings].sort((a, b) => sevOrder(a.sev) - sevOrder(b.sev));
  for (const fd of sorted) {
    L.push('- [' + fd.sev.toUpperCase() + '][' + fd.area + '] ' + (fd.file === '' ? '' : fd.file + ': ') + fd.msg + (fd.fix === '' ? '' : ' FIX: ' + fd.fix));
  }
  L.push('');
  L.push('## X-Ray: per-file status');
  L.push('');
  L.push(row(['status', 'file', 'notes']));
  L.push(sepRow(3));
  for (const n of newFiles) L.push(row(['NEW', n.path, n.why]));
  for (const [rel, s] of statusOf) {
    L.push(row([s.status, rel, s.notes.slice(0, 3).join('; ')]));
  }
  return L.join('\n');
}

function buildContext() {
  const L = [];
  L.push('# ToolGlobe Pro: Project Model and Full Context');
  L.push('');
  L.push('Paste this whole file at the start of a new chat before asking for a new tool.');
  L.push('Generated: ' + new Date().toISOString() + '  Commit: ' + commit);
  L.push('');
  L.push('## Identity');
  L.push('- Site: ' + (siteName === null ? 'ToolGlobe Pro' : siteName) + (siteUrl === null ? '' : ' (' + siteUrl + ')'));
  L.push('- Owner: Hassan Asghar, hassanasghar7868686@gmail.com, WhatsApp +923451098607 and +923497726469');
  L.push('- Stack: ' + Object.keys(Object.assign({}, pkgJson.dependencies, pkgJson.devDependencies)).map((k) => k + '@' + Object.assign({}, pkgJson.dependencies, pkgJson.devDependencies)[k]).join(', '));
  L.push('');
  L.push('## Non-negotiable rules');
  for (const r of [
    'Everything runs in the browser. No uploads, no server processing. Files up to 600 MB via Web Workers, streams or slicing, with progress, drag-and-drop, copy and download.',
    'Revoke every object URL. Terminate every worker. No eval, no new Function, no innerHTML, no unsanitized dangerouslySetInnerHTML.',
    'Never add noindex anywhere. All pages are indexable and in the dynamic sitemap.',
    'UI uses the shared classes card, input, btn-primary, btn-secondary, btn-ghost, chip plus Tailwind utilities and inline SVG. No @apply on custom classes. No shared.tsx and no Icon import inside tool UI components.',
    'Every tool needs 500 to 800 words of human-written SEO copy, practical FAQs, and a feature list for schema.',
    'Register a tool in lib/tools/index.ts and map its component in components/tools/tool-map.tsx. Do not patch unrelated core files.',
    'Category slug must exist in lib/categories.ts (and in the CategorySlug type if it is a union).',
    'PDF tools stay skipped. Never drop an existing live tool. Never overwrite a live file without seeing it first.',
    'Deliver complete files. No placeholders, no truncation. Avoid pipe characters in chat-pasted code where possible; prefer file delivery.',
  ]) L.push('- ' + r);
  L.push('');
  L.push('## Taxonomy');
  L.push(row(['category', 'tools']));
  L.push(sepRow(2));
  for (const s of catSet) L.push(row([s, tools.filter((t) => t.category === s).length]));
  L.push('');
  L.push('## Tools (' + tools.length + ')');
  L.push(row(['slug', 'category', 'definition', 'component', 'registered', 'in map']));
  L.push(sepRow(6));
  for (const t of tools) L.push(row([t.slug, t.category === null ? '?' : t.category, t.rel, t.componentRel === null ? '?' : t.componentRel, t.registered ? 'yes' : 'NO', t.mapped ? 'yes' : 'NO']));
  L.push('');
  L.push('## Contract: required ToolSummary and ToolDefinition keys');
  L.push('Required: ' + [...requiredKeys].join(', '));
  L.push('Optional: ' + [...optionalKeys].join(', '));
  L.push('');
  L.push('## lib/types.ts (first 220 lines)');
  L.push('```ts');
  L.push(head('lib/types.ts', 220));
  L.push('```');
  const sample = [...tools].filter((t) => t.registered).sort((a, b) => a.text.length - b.text.length)[0];
  if (sample !== undefined) {
    L.push('');
    L.push('## Sample tool definition: ' + sample.rel + ' (first 160 lines)');
    L.push('```ts');
    L.push(head(sample.rel, 160));
    L.push('```');
    if (sample.componentRel !== null) {
      L.push('');
      L.push('## Sample tool component: ' + sample.componentRel + ' (first 140 lines)');
      L.push('```tsx');
      L.push(head(sample.componentRel, 140));
      L.push('```');
    }
  }
  L.push('');
  L.push('## lib/tools/index.ts (first 80 lines)');
  L.push('```ts');
  L.push(head('lib/tools/index.ts', 80));
  L.push('```');
  L.push('');
  L.push('## components/tools/tool-map.tsx (first 80 lines)');
  L.push('```tsx');
  L.push(head('components/tools/tool-map.tsx', 80));
  L.push('```');
  L.push('');
  L.push('## Design classes in app/globals.css');
  for (const k of ['card', 'input', 'btn-primary', 'btn-secondary', 'btn-ghost', 'chip']) {
    L.push('- .' + k + ': ' + (new RegExp('\\.' + k + '\\b').test(cssText) ? 'defined' : 'MISSING'));
  }
  L.push('');
  L.push('## File tree with status');
  for (const [rel, s] of statusOf) L.push('- ' + s.status + ' ' + rel);
  for (const n of newFiles) L.push('- NEW ' + n.path);
  L.push('');
  L.push('## Current top issues');
  for (const fd of [...findings].sort((a, b) => sevOrder(a.sev) - sevOrder(b.sev)).filter((x) => x.sev !== 'info').slice(0, 60)) {
    L.push('- [' + fd.sev + '][' + fd.area + '] ' + (fd.file === '' ? '' : fd.file + ': ') + fd.msg);
  }
  L.push('');
  L.push('## Add-a-tool checklist');
  for (const s of [
    'Choose a slug (kebab-case) and an existing category slug.',
    'Create lib/tools/<slug>.ts (or folder) matching the sample definition and typed as ToolDefinition.',
    'Create the component (and a worker if it handles files or heavy text) following the sample component.',
    'Import and add the tool in lib/tools/index.ts; add the mapping in components/tools/tool-map.tsx.',
    'Run: node scripts/audit-repo.mjs --strict and npm run build before pushing.',
    'Verify git status shows every new file as added before git push.',
  ]) L.push('1. ' + s);
  L.push('');
  L.push('## Task');
  L.push('Add tool: <SLUG> in category <CATEGORY>. Deliver complete files and the exact index.ts and tool-map.tsx edits.');
  return L.join('\n');
}

const report = buildReport();
const context = buildContext();
const summary = { generatedAt: new Date().toISOString(), commit, errors, warnings: warns, info: infos, tools: tools.length, categories: catSet.size, findings, newFiles };

if (!NO_WRITE) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'REPORT.md'), report);
  fs.writeFileSync(path.join(OUT_DIR, 'PROJECT_CONTEXT.md'), context);
  fs.writeFileSync(path.join(OUT_DIR, 'audit.json'), JSON.stringify(summary, null, 2));
}

if (PRINT_CONTEXT) {
  console.log(context);
} else if (!QUIET) {
  console.log('ToolGlobe Pro audit  commit ' + commit);
  console.log('Tools: ' + tools.length + '  Categories: ' + catSet.size + '  Files: ' + files.size);
  console.log('Errors: ' + errors + '  Warnings: ' + warns + '  Info: ' + infos);
  console.log('');
  for (const n of newFiles) console.log('NEW      ' + n.path + '  (' + n.why + ')');
  for (const [rel, s] of statusOf) {
    if (s.status !== 'OK') console.log(s.status.padEnd(8) + ' ' + rel + '  ' + (s.notes[0] === undefined ? '' : s.notes[0]));
  }
  console.log('');
  for (const fd of [...findings].sort((a, b) => sevOrder(a.sev) - sevOrder(b.sev)).filter((x) => x.sev === 'error').slice(0, 40)) {
    console.log('ERROR [' + fd.area + '] ' + fd.file + ': ' + fd.msg);
  }
  if (!NO_WRITE) console.log('\nWrote audit-report/REPORT.md, PROJECT_CONTEXT.md, audit.json');
}

if (STRICT && errors > 0) process.exitCode = 1;
