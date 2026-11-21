/**
 * Pure URL encoding / decoding helpers (no DOM dependencies except the
 * standard URL / URLSearchParams / TextEncoder / TextDecoder globals).
 */

export const MAX_URL_INPUT_BYTES = 50 * 1024 * 1024;

export type Direction = "encode" | "decode";
/** "all" is encode-only (percent-encodes every byte). */
export type CodecMode = "component" | "uri" | "form" | "all";

export interface CodecOptions {
  direction: Direction;
  mode: CodecMode;
  /** Also encode ! ' ( ) * (RFC 3986 strict). Component and form modes. */
  strict: boolean;
  /** Leave existing %XX sequences untouched when encoding. */
  keepEscapes: boolean;
  /** Process each line independently, preserving line endings. */
  perLine: boolean;
  /** Decode repeatedly (up to 5 passes) for double-encoded text. */
  repeat: boolean;
}

export interface CodecResult {
  output: string;
  invalidSequences: number;
  passes: number;
}

const hex = (byte: number): string => `%${byte < 16 ? "0" : ""}${byte.toString(16).toUpperCase()}`;

function sanitizeSurrogates(text: string): string {
  return text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDFFF]/g, (match) =>
    match.length === 2 ? match : "\uFFFD",
  );
}

function applyStrict(value: string, strict: boolean): string {
  return strict ? value.replace(/[!'()*]/g, (ch) => hex(ch.charCodeAt(0))) : value;
}

function encodePlain(text: string, mode: CodecMode, strict: boolean): string {
  const safe = sanitizeSurrogates(text);
  switch (mode) {
    case "uri":
      return encodeURI(safe);
    case "all": {
      const bytes = new TextEncoder().encode(safe);
      const parts: string[] = [];
      for (let i = 0; i < bytes.length; i++) parts.push(hex(bytes[i]));
      return parts.join("");
    }
    case "form":
      return applyStrict(encodeURIComponent(safe), strict).replace(/%20/g, "+");
    default:
      return applyStrict(encodeURIComponent(safe), strict);
  }
}

function encodeSegment(text: string, options: CodecOptions): string {
  if (options.keepEscapes && options.mode !== "all") {
    return text
      .split(/(%[0-9A-Fa-f]{2})/)
      .map((piece, index) => (index % 2 === 1 ? piece : encodePlain(piece, options.mode, options.strict)))
      .join("");
  }
  return encodePlain(text, options.mode, options.strict);
}

const RESERVED_RE = /[;/?:@&=+$,#]/g;
const ESCAPE_RUN_RE = /(?:%[0-9A-Fa-f]{2})+/g;

interface Counter {
  invalid: number;
}

function decodeRun(run: string, mode: CodecMode, counter: Counter): string {
  let decoded: string;
  try {
    decoded = decodeURIComponent(run);
  } catch {
    const bytes = new Uint8Array(run.length / 3);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(run.slice(i * 3 + 1, i * 3 + 3), 16);
    }
    decoded = new TextDecoder("utf-8").decode(bytes);
    counter.invalid += (decoded.match(/\uFFFD/g) ?? []).length;
  }
  if (mode === "uri") {
    decoded = decoded.replace(RESERVED_RE, (ch) => hex(ch.charCodeAt(0)));
  }
  return decoded;
}

function decodeOnce(text: string, mode: CodecMode, counter: Counter): string {
  const source = mode === "form" ? text.replace(/\+/g, " ") : text;
  return source.replace(ESCAPE_RUN_RE, (run) => decodeRun(run, mode, counter));
}

function decodeSegment(text: string, options: CodecOptions, counter: Counter): { text: string; passes: number } {
  const mode: CodecMode = options.mode === "all" ? "component" : options.mode;
  let current = decodeOnce(text, mode, counter);
  let passes = 1;
  if (options.repeat) {
    while (passes < 5) {
      const next = decodeOnce(current, mode, counter);
      if (next === current) break;
      current = next;
      passes++;
    }
  }
  return { text: current, passes };
}

export function processText(input: string, options: CodecOptions): CodecResult {
  const counter: Counter = { invalid: 0 };
  let passes = options.direction === "decode" ? 1 : 0;

  const handle = (segment: string): string => {
    if (options.direction === "encode") return encodeSegment(segment, options);
    const decoded = decodeSegment(segment, options, counter);
    passes = Math.max(passes, decoded.passes);
    return decoded.text;
  };

  let output: string;
  if (options.perLine) {
    output = input
      .split(/(\r\n|\n|\r)/)
      .map((piece, index) => (index % 2 === 1 ? piece : handle(piece)))
      .join("");
  } else {
    output = handle(input);
  }

  return { output, invalidSequences: counter.invalid, passes };
}

/* -------------------------------------------------------------------------- */
/*  URL parsing                                                               */
/* -------------------------------------------------------------------------- */

export interface QueryPair {
  key: string;
  value: string;
}

export interface ParsedUrl {
  href: string;
  assumedScheme: boolean;
  protocol: string;
  username: string;
  password: string;
  host: string;
  hostname: string;
  port: string;
  origin: string;
  pathname: string;
  decodedPathname: string;
  search: string;
  hash: string;
  decodedHash: string;
  params: QueryPair[];
}

function safeDecode(value: string): string {
  return decodeOnce(value, "component", { invalid: 0 });
}

export function parseUrl(raw: string): ParsedUrl | null {
  const input = raw.trim();
  if (!input) return null;

  let url: URL | null = null;
  let assumedScheme = false;
  try {
    url = new URL(input);
  } catch {
    if (!/^[a-z][a-z0-9+.-]*:/i.test(input)) {
      try {
        url = new URL(`https://${input}`);
        assumedScheme = true;
      } catch {
        url = null;
      }
    }
  }
  if (!url) return null;

  return {
    href: url.href,
    assumedScheme,
    protocol: url.protocol,
    username: safeDecode(url.username),
    password: safeDecode(url.password),
    host: url.host,
    hostname: url.hostname,
    port: url.port,
    origin: url.origin === "null" ? "" : url.origin,
    pathname: url.pathname,
    decodedPathname: safeDecode(url.pathname),
    search: url.search,
    hash: url.hash,
    decodedHash: safeDecode(url.hash),
    params: Array.from(url.searchParams.entries()).map(([key, value]) => ({ key, value })),
  };
}

export function parseQuery(input: string): QueryPair[] {
  let query = input.trim();
  const questionMark = query.indexOf("?");
  if (questionMark >= 0) query = query.slice(questionMark + 1);
  const hashIndex = query.indexOf("#");
  if (hashIndex >= 0) query = query.slice(0, hashIndex);
  if (!query) return [];
  return Array.from(new URLSearchParams(query).entries()).map(([key, value]) => ({ key, value }));
}

/** Build a query string from `key=value` lines. Lines without `=` become empty values. */
export function buildQuery(lines: string, spaceAsPlus: boolean): string {
  const encode = (value: string): string => {
    const encoded = encodeURIComponent(sanitizeSurrogates(value));
    return spaceAsPlus ? encoded.replace(/%20/g, "+") : encoded;
  };

  return lines
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const eq = line.indexOf("=");
      const key = eq === -1 ? line : line.slice(0, eq);
      const value = eq === -1 ? "" : line.slice(eq + 1);
      return `${encode(key.trim())}=${encode(value)}`;
    })
    .join("&");
}
