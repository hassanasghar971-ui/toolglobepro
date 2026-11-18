export type CaseMode =
  | "upper"
  | "lower"
  | "title"
  | "sentence"
  | "capitalize"
  | "alternating"
  | "inverse"
  | "camel"
  | "pascal"
  | "snake"
  | "constant"
  | "kebab"
  | "dot"
  | "path";

export interface CaseModeInfo {
  mode: CaseMode;
  label: string;
  example: string;
  group: "writing" | "developer";
}

export const CASE_MODES: CaseModeInfo[] = [
  { mode: "upper", label: "UPPERCASE", example: "HELLO WORLD", group: "writing" },
  { mode: "lower", label: "lowercase", example: "hello world", group: "writing" },
  { mode: "sentence", label: "Sentence case", example: "Hello world. It works.", group: "writing" },
  { mode: "title", label: "Title Case", example: "The Art of War", group: "writing" },
  { mode: "capitalize", label: "Capitalize Each Word", example: "Hello World Of Words", group: "writing" },
  { mode: "alternating", label: "aLtErNaTiNg", example: "hElLo WoRlD", group: "writing" },
  { mode: "inverse", label: "iNVERSE", example: "hELLO wORLD", group: "writing" },
  { mode: "camel", label: "camelCase", example: "helloWorld", group: "developer" },
  { mode: "pascal", label: "PascalCase", example: "HelloWorld", group: "developer" },
  { mode: "snake", label: "snake_case", example: "hello_world", group: "developer" },
  { mode: "constant", label: "CONSTANT_CASE", example: "HELLO_WORLD", group: "developer" },
  { mode: "kebab", label: "kebab-case", example: "hello-world", group: "developer" },
  { mode: "dot", label: "dot.case", example: "hello.world", group: "developer" },
  { mode: "path", label: "path/case", example: "hello/world", group: "developer" },
];

export interface CaseOptions {
  keepAcronyms: boolean;
}

export interface ConvertState {
  sentenceStart: boolean;
}

export const MAX_TEXT_BYTES = 10 * 1024 * 1024;
export const CHUNK_CHARS = 250_000;

const WORD_RE = new RegExp("[\\p{L}\\p{M}\\p{N}]+(?:['\\u2019][\\p{L}\\p{M}]+)*", "gu");
const IDENT_WORD_RE = new RegExp("[\\p{L}\\p{M}\\p{N}]+", "gu");
const LOWER_UPPER_RE = new RegExp("([\\p{Ll}\\p{N}])(\\p{Lu})", "gu");
const ACRONYM_RE = new RegExp("(\\p{Lu})(\\p{Lu}\\p{Ll})", "gu");
const LONE_I_RE = new RegExp("(^|[^\\p{L}\\p{N}'\\u2019])i(?=$|[^\\p{L}\\p{N}])", "gu");

const SMALL_WORDS: ReadonlySet<string> = new Set([
  "a", "an", "and", "as", "at", "but", "by", "en", "for", "if", "in", "nor",
  "of", "off", "on", "or", "per", "so", "the", "to", "up", "via", "vs", "yet",
]);

function capFirst(word: string): string {
  const cp = word.codePointAt(0);
  if (cp === undefined) return word;
  const first = String.fromCodePoint(cp);
  return first.toUpperCase() + word.slice(first.length).toLowerCase();
}

function isProtected(word: string): boolean {
  const rest = word.slice(1);
  return rest !== rest.toLowerCase();
}

function isLetter(ch: string): boolean {
  return ch.toLowerCase() !== ch.toUpperCase();
}

function mapLines(text: string, fn: (line: string) => string): string {
  return text
    .split("\n")
    .map((raw) => {
      const cr = raw.endsWith("\r");
      const line = cr ? raw.slice(0, -1) : raw;
      const out = fn(line);
      return cr ? `${out}\r` : out;
    })
    .join("\n");
}

function titleLine(line: string, options: CaseOptions, useSmallWords: boolean): string {
  const total = (line.match(WORD_RE) ?? []).length;
  let count = 0;
  let prevEnd = 0;
  return line.replace(WORD_RE, (word: string, offset: number) => {
    const index = count;
    count += 1;
    const gap = line.slice(prevEnd, offset);
    prevEnd = offset + word.length;
    if (options.keepAcronyms && isProtected(word)) return word;
    const lower = word.toLowerCase();
    if (useSmallWords) {
      const forceCap = index === 0 || index === total - 1 || gap.includes(":");
      if (!forceCap && SMALL_WORDS.has(lower)) return lower;
    }
    return capFirst(lower);
  });
}

function sentenceCase(text: string, state: ConvertState): string {
  const lower = text.toLowerCase();
  let out = "";
  let cap = state.sentenceStart;
  let sawTerminator = false;
  let newlines = 0;

  for (const ch of lower) {
    if (ch === "\n") {
      newlines += 1;
      if (sawTerminator || newlines >= 2) {
        cap = true;
        sawTerminator = false;
      }
      out += ch;
      continue;
    }
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\u00a0") {
      if (sawTerminator) {
        cap = true;
        sawTerminator = false;
      }
      out += ch;
      continue;
    }

    newlines = 0;
    if (ch === "." || ch === "!" || ch === "?" || ch === "\u2026") {
      sawTerminator = true;
      out += ch;
    } else if ('"\'\u201c\u201d\u2018\u2019([{\u00ab\u00bb)]}'.includes(ch)) {
      out += ch;
    } else if (isLetter(ch)) {
      if (cap) {
        out += ch.toUpperCase();
        cap = false;
      } else {
        out += ch;
      }
      sawTerminator = false;
    } else {
      cap = false;
      sawTerminator = false;
      out += ch;
    }
  }

  state.sentenceStart = cap;
  return out.replace(LONE_I_RE, "$1I");
}

function alternatingCase(text: string): string {
  let out = "";
  let upper = false;
  for (const ch of text) {
    if (isLetter(ch)) {
      out += upper ? ch.toUpperCase() : ch.toLowerCase();
      upper = !upper;
    } else {
      out += ch;
    }
  }
  return out;
}

function inverseCase(text: string): string {
  let out = "";
  for (const ch of text) {
    const up = ch.toUpperCase();
    const low = ch.toLowerCase();
    out += up === low ? ch : ch === up ? low : up;
  }
  return out;
}

function splitWords(line: string): string[] {
  const spaced = line
    .replace(/['\u2019]/g, "")
    .replace(LOWER_UPPER_RE, "$1 $2")
    .replace(ACRONYM_RE, "$1 $2");
  return spaced.match(IDENT_WORD_RE) ?? [];
}

function identifierLine(line: string, mode: CaseMode): string {
  const words = splitWords(line);
  if (words.length === 0) return "";
  switch (mode) {
    case "camel":
      return words.map((w, i) => (i === 0 ? w.toLowerCase() : capFirst(w))).join("");
    case "pascal":
      return words.map(capFirst).join("");
    case "snake":
      return words.map((w) => w.toLowerCase()).join("_");
    case "constant":
      return words.map((w) => w.toUpperCase()).join("_");
    case "kebab":
      return words.map((w) => w.toLowerCase()).join("-");
    case "dot":
      return words.map((w) => w.toLowerCase()).join(".");
    case "path":
      return words.map((w) => w.toLowerCase()).join("/");
    default:
      return line;
  }
}

export function convertChunk(
  mode: CaseMode,
  text: string,
  options: CaseOptions,
  state: ConvertState,
): string {
  switch (mode) {
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "sentence":
      return sentenceCase(text, state);
    case "title":
      return mapLines(text, (line) => titleLine(line, options, true));
    case "capitalize":
      return mapLines(text, (line) => titleLine(line, options, false));
    case "alternating":
      return alternatingCase(text);
    case "inverse":
      return inverseCase(text);
    default:
      return mapLines(text, (line) => identifierLine(line, mode));
  }
}

export async function convertText(
  mode: CaseMode,
  text: string,
  options: CaseOptions,
  onProgress?: (fraction: number) => void,
  shouldStop?: () => boolean,
): Promise<string | null> {
  const state: ConvertState = { sentenceStart: true };
  if (text.length <= CHUNK_CHARS) return convertChunk(mode, text, options, state);

  const parts: string[] = [];
  let pos = 0;
  while (pos < text.length) {
    if (shouldStop?.()) return null;
    let end = Math.min(text.length, pos + CHUNK_CHARS);
    if (end < text.length) {
      const newline = text.indexOf("\n", end);
      end = newline === -1 ? text.length : newline + 1;
    }
    parts.push(convertChunk(mode, text.slice(pos, end), options, state));
    pos = end;
    onProgress?.(pos / text.length);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  return parts.join("");
}

export interface TextStats {
  chars: number;
  words: number;
  lines: number;
}

export function countStats(text: string): TextStats {
  if (text.length === 0) return { chars: 0, words: 0, lines: 0 };
  let words = 0;
  let lines = 1;
  let inWord = false;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code === 10) lines += 1;
    const space = code <= 32 || code === 160;
    if (space) {
      inWord = false;
    } else if (!inWord) {
      inWord = true;
      words += 1;
    }
  }
  return { chars: text.length, words, lines };
}
