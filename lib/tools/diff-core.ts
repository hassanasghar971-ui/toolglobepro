/**
 * Text diff engine: Myers O(ND) shortest-edit-script on interned tokens,
 * with line, word and character modes plus intra-line refinement.
 * Pure and synchronous, so it runs inside a Web Worker or on the main thread.
 */

export type DiffMode = "lines" | "words" | "chars";
export type OpType = "equal" | "insert" | "delete";

export interface DiffOptions {
  mode: DiffMode;
  ignoreCase: boolean;
  ignoreWhitespace: boolean;
}

export interface DiffSegment {
  type: OpType;
  text: string;
}

export interface LineRow {
  type: OpType;
  aNo: number | null;
  bNo: number | null;
  text: string;
  /** Word-level highlighting for paired changed lines, otherwise null. */
  inline: DiffSegment[] | null;
}

export interface DiffStats {
  added: number;
  removed: number;
  unchanged: number;
  aTotal: number;
  bTotal: number;
  unit: "lines" | "words" | "characters";
}

export interface DiffResult {
  mode: DiffMode;
  identical: boolean;
  /** True when the files were too different for a minimal diff and a region is shown as one replaced block. */
  approximate: boolean;
  stats: DiffStats;
  rows: LineRow[];
  segments: DiffSegment[];
}

export interface DiffWorkerRequest {
  id: number;
  a: string;
  b: string;
  options: DiffOptions;
}

export type DiffWorkerResponse =
  | { id: number; type: "progress"; stage: string; fraction: number }
  | { id: number; type: "done"; result: DiffResult }
  | { id: number; type: "error"; message: string };

export const MAX_TEXT_BYTES = 20 * 1024 * 1024;
export const MAX_INLINE_CHARS = 1_000_000;
export const MAX_EDIT_DISTANCE = 3000;

const MAX_REFINE_CHARS = 3000;
const MAX_REFINED_PAIRS = 3000;
const REFINE_EDIT_DISTANCE = 400;

const EQ = 0;
const DEL = 1;
const INS = 2;

interface Run {
  t: number;
  n: number;
}

const WS_ONLY = /^\s+$/;
// Built with the RegExp constructor so Unicode property escapes never depend on the TS target.
const WORD_TOKEN_RE = new RegExp("\\s+|[\\p{L}\\p{M}\\p{N}_]+|[^\\s\\p{L}\\p{M}\\p{N}_]", "gu");

export function splitLines(text: string): string[] {
  if (text === "") return [];
  const lines = text.split(/\r\n|\r|\n/);
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

export function tokenizeWords(text: string): string[] {
  return text.match(WORD_TOKEN_RE) ?? [];
}

function lineKey(line: string, o: DiffOptions): string {
  let s = line;
  if (o.ignoreWhitespace) s = s.replace(/\s+/g, " ").trim();
  if (o.ignoreCase) s = s.toLowerCase();
  return s;
}

function tokenKey(token: string, o: DiffOptions): string {
  if (o.ignoreWhitespace && WS_ONLY.test(token)) return " ";
  return o.ignoreCase ? token.toLowerCase() : token;
}

function intern(strings: string[], map: Map<string, number>): Int32Array {
  const out = new Int32Array(strings.length);
  for (let i = 0; i < strings.length; i++) {
    const s = strings[i];
    let id = map.get(s);
    if (id === undefined) {
      id = map.size;
      map.set(s, id);
    }
    out[i] = id;
  }
  return out;
}

function pushRun(runs: Run[], t: number, n: number): void {
  if (n <= 0) return;
  const last = runs[runs.length - 1];
  if (last && last.t === t) last.n += n;
  else runs.push({ t, n });
}

function backtrack(trace: Int32Array[], D: number, n: number, m: number): Run[] {
  const rev: Run[] = [];
  let x = n;
  let y = m;
  for (let d = D; d > 0; d--) {
    const w = trace[d];
    const k = x - y;
    let prevK: number;
    if (k === -d || (k !== d && w[k - 1 + d + 1] < w[k + 1 + d + 1])) prevK = k + 1;
    else prevK = k - 1;
    const prevX = w[prevK + d + 1];
    const prevY = prevX - prevK;
    const down = prevK === k + 1;
    const midX = down ? prevX : prevX + 1;
    pushRun(rev, EQ, x - midX);
    pushRun(rev, down ? INS : DEL, 1);
    x = prevX;
    y = prevY;
  }
  pushRun(rev, EQ, x);
  rev.reverse();
  return rev;
}

function myers(
  a: Int32Array,
  b: Int32Array,
  maxD: number,
  onProgress?: (fraction: number) => void,
): Run[] | null {
  const n = a.length;
  const m = b.length;
  const max = Math.min(n + m, maxD);
  const off = max + 1;
  const v = new Int32Array(2 * max + 3);
  const trace: Int32Array[] = [];

  for (let d = 0; d <= max; d++) {
    trace.push(v.slice(off - d - 1, off + d + 2));
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[off + k - 1] < v[off + k + 1])) x = v[off + k + 1];
      else x = v[off + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[off + k] = x;
      if (x >= n && y >= m) return backtrack(trace, d, n, m);
    }
    if (onProgress && (d & 63) === 0) onProgress(d / max);
  }
  return null;
}

function diffRuns(
  a: Int32Array,
  b: Int32Array,
  maxD: number,
  onProgress?: (fraction: number) => void,
): { runs: Run[]; approximate: boolean } {
  const runs: Run[] = [];
  const minLen = Math.min(a.length, b.length);
  let pre = 0;
  while (pre < minLen && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < minLen - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;

  pushRun(runs, EQ, pre);
  const n = a.length - pre - suf;
  const m = b.length - pre - suf;
  let approximate = false;

  if (n === 0) {
    pushRun(runs, INS, m);
  } else if (m === 0) {
    pushRun(runs, DEL, n);
  } else {
    const mid = myers(a.subarray(pre, pre + n), b.subarray(pre, pre + m), maxD, onProgress);
    if (mid) {
      for (const r of mid) pushRun(runs, r.t, r.n);
    } else {
      approximate = true;
      pushRun(runs, DEL, n);
      pushRun(runs, INS, m);
    }
  }
  pushRun(runs, EQ, suf);
  return { runs, approximate };
}

/**
 * Walks runs block by block. Consecutive delete/insert runs between two equal runs
 * are reported together as one change (deletions first, then insertions).
 */
function walkRuns(
  runs: Run[],
  onEqual: (ai: number, bi: number, n: number) => void,
  onChange: (ai: number, bi: number, dels: number, ins: number) => void,
): void {
  let ai = 0;
  let bi = 0;
  let dels = 0;
  let ins = 0;
  const flush = () => {
    if (dels > 0 || ins > 0) {
      onChange(ai, bi, dels, ins);
      ai += dels;
      bi += ins;
      dels = 0;
      ins = 0;
    }
  };
  for (const run of runs) {
    if (run.t === EQ) {
      flush();
      onEqual(ai, bi, run.n);
      ai += run.n;
      bi += run.n;
    } else if (run.t === DEL) {
      dels += run.n;
    } else {
      ins += run.n;
    }
  }
  flush();
}

function buildSides(
  aTok: string[],
  bTok: string[],
  runs: Run[],
): { left: DiffSegment[]; right: DiffSegment[]; combined: DiffSegment[] } {
  const left: DiffSegment[] = [];
  const right: DiffSegment[] = [];
  const combined: DiffSegment[] = [];
  walkRuns(
    runs,
    (ai, bi, n) => {
      const at = aTok.slice(ai, ai + n).join("");
      const bt = bTok.slice(bi, bi + n).join("");
      left.push({ type: "equal", text: at });
      right.push({ type: "equal", text: bt });
      combined.push({ type: "equal", text: bt });
    },
    (ai, bi, dels, ins) => {
      if (dels > 0) {
        const t = aTok.slice(ai, ai + dels).join("");
        left.push({ type: "delete", text: t });
        combined.push({ type: "delete", text: t });
      }
      if (ins > 0) {
        const t = bTok.slice(bi, bi + ins).join("");
        right.push({ type: "insert", text: t });
        combined.push({ type: "insert", text: t });
      }
    },
  );
  return { left, right, combined };
}

function refinePair(
  aText: string,
  bText: string,
  o: DiffOptions,
): { left: DiffSegment[]; right: DiffSegment[] } | null {
  if (aText.length > MAX_REFINE_CHARS || bText.length > MAX_REFINE_CHARS) return null;
  const aTok = tokenizeWords(aText);
  const bTok = tokenizeWords(bText);
  if (aTok.length === 0 || bTok.length === 0) return null;
  const map = new Map<string, number>();
  const aKeys = intern(aTok.map((t) => tokenKey(t, o)), map);
  const bKeys = intern(bTok.map((t) => tokenKey(t, o)), map);
  const { runs, approximate } = diffRuns(aKeys, bKeys, REFINE_EDIT_DISTANCE);
  if (approximate) return null;
  let common = 0;
  for (const r of runs) if (r.t === EQ) common += r.n;
  if (common / Math.max(aTok.length, bTok.length) < 0.3) return null;
  const sides = buildSides(aTok, bTok, runs);
  return { left: sides.left, right: sides.right };
}

function countUnits(tokens: string[], start: number, n: number, mode: DiffMode): number {
  if (mode === "chars") return n;
  let count = 0;
  for (let i = start; i < start + n; i++) if (!WS_ONLY.test(tokens[i])) count++;
  return count;
}

type Report = (stage: string, fraction: number) => void;

function diffLines(a: string, b: string, o: DiffOptions, report: Report): DiffResult {
  const aLines = splitLines(a);
  const bLines = splitLines(b);
  report("Indexing lines", 0.2);
  const map = new Map<string, number>();
  const aKeys = intern(aLines.map((l) => lineKey(l, o)), map);
  const bKeys = intern(bLines.map((l) => lineKey(l, o)), map);

  report("Comparing", 0.35);
  const { runs, approximate } = diffRuns(aKeys, bKeys, MAX_EDIT_DISTANCE, (f) =>
    report("Comparing", 0.35 + f * 0.5),
  );

  report("Building view", 0.9);
  const rows: LineRow[] = [];
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  let refined = 0;

  walkRuns(
    runs,
    (ai, bi, n) => {
      for (let i = 0; i < n; i++) {
        rows.push({ type: "equal", aNo: ai + i + 1, bNo: bi + i + 1, text: aLines[ai + i], inline: null });
      }
      unchanged += n;
    },
    (ai, bi, dels, ins) => {
      const start = rows.length;
      for (let i = 0; i < dels; i++) {
        rows.push({ type: "delete", aNo: ai + i + 1, bNo: null, text: aLines[ai + i], inline: null });
      }
      for (let i = 0; i < ins; i++) {
        rows.push({ type: "insert", aNo: null, bNo: bi + i + 1, text: bLines[bi + i], inline: null });
      }
      removed += dels;
      added += ins;
      const pairs = Math.min(dels, ins);
      for (let p = 0; p < pairs && refined < MAX_REFINED_PAIRS; p++) {
        const left = rows[start + p];
        const right = rows[start + dels + p];
        refined += 1;
        const pair = refinePair(left.text, right.text, o);
        if (pair) {
          left.inline = pair.left;
          right.inline = pair.right;
        }
      }
    },
  );

  return {
    mode: "lines",
    identical: !runs.some((r) => r.t !== EQ),
    approximate,
    stats: {
      added,
      removed,
      unchanged,
      aTotal: aLines.length,
      bTotal: bLines.length,
      unit: "lines",
    },
    rows,
    segments: [],
  };
}

function diffInline(a: string, b: string, o: DiffOptions, report: Report): DiffResult {
  if (a.length > MAX_INLINE_CHARS || b.length > MAX_INLINE_CHARS) {
    throw new Error(
      `Word and character comparison is limited to ${MAX_INLINE_CHARS.toLocaleString("en-US")} characters per side. Switch to line mode for larger texts.`,
    );
  }
  report("Splitting text", 0.15);
  const aTok = o.mode === "words" ? tokenizeWords(a) : Array.from(a);
  const bTok = o.mode === "words" ? tokenizeWords(b) : Array.from(b);

  report("Indexing", 0.3);
  const map = new Map<string, number>();
  const aKeys = intern(aTok.map((t) => tokenKey(t, o)), map);
  const bKeys = intern(bTok.map((t) => tokenKey(t, o)), map);

  report("Comparing", 0.4);
  const { runs, approximate } = diffRuns(aKeys, bKeys, MAX_EDIT_DISTANCE, (f) =>
    report("Comparing", 0.4 + f * 0.45),
  );

  report("Building view", 0.9);
  const sides = buildSides(aTok, bTok, runs);
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  walkRuns(
    runs,
    (ai, _bi, n) => {
      unchanged += countUnits(aTok, ai, n, o.mode);
    },
    (ai, bi, dels, ins) => {
      removed += countUnits(aTok, ai, dels, o.mode);
      added += countUnits(bTok, bi, ins, o.mode);
    },
  );

  return {
    mode: o.mode,
    identical: !runs.some((r) => r.t !== EQ),
    approximate,
    stats: {
      added,
      removed,
      unchanged,
      aTotal: countUnits(aTok, 0, aTok.length, o.mode),
      bTotal: countUnits(bTok, 0, bTok.length, o.mode),
      unit: o.mode === "words" ? "words" : "characters",
    },
    rows: [],
    segments: sides.combined,
  };
}

export function runDiff(
  a: string,
  b: string,
  options: DiffOptions,
  onProgress?: (stage: string, fraction: number) => void,
): DiffResult {
  const report: Report = (stage, fraction) => {
    if (onProgress) onProgress(stage, fraction);
  };
  report("Preparing", 0.05);
  const result =
    options.mode === "lines" ? diffLines(a, b, options, report) : diffInline(a, b, options, report);
  report("Done", 1);
  return result;
}

/** Standard unified diff (works with `git apply` and `patch`). Returns "" when nothing changed. */
export function toUnifiedDiff(
  rows: LineRow[],
  nameA: string,
  nameB: string,
  context = 3,
): string {
  const n = rows.length;
  const changed: number[] = [];
  for (let i = 0; i < n; i++) if (rows[i].type !== "equal") changed.push(i);
  if (changed.length === 0) return "";

  const aBefore = new Int32Array(n + 1);
  const bBefore = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) {
    aBefore[i + 1] = aBefore[i] + (rows[i].type !== "insert" ? 1 : 0);
    bBefore[i + 1] = bBefore[i] + (rows[i].type !== "delete" ? 1 : 0);
  }

  const out: string[] = [`--- ${nameA}`, `+++ ${nameB}`];
  let idx = 0;
  while (idx < changed.length) {
    const start = Math.max(0, changed[idx] - context);
    let end = Math.min(n - 1, changed[idx] + context);
    idx += 1;
    while (idx < changed.length && changed[idx] - context <= end + 1) {
      end = Math.min(n - 1, changed[idx] + context);
      idx += 1;
    }
    const aCount = aBefore[end + 1] - aBefore[start];
    const bCount = bBefore[end + 1] - bBefore[start];
    const aStart = aCount === 0 ? aBefore[start] : aBefore[start] + 1;
    const bStart = bCount === 0 ? bBefore[start] : bBefore[start] + 1;
    out.push(`@@ -${aStart},${aCount} +${bStart},${bCount} @@`);
    for (let i = start; i <= end; i++) {
      const row = rows[i];
      const sign = row.type === "delete" ? "-" : row.type === "insert" ? "+" : " ";
      out.push(sign + row.text);
    }
  }
  return out.join("\n") + "\n";
}
