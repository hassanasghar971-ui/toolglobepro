export const MAX_FILE_BYTES = 600 * 1024 * 1024;
export const SMALL_FILE_BYTES = 1024 * 1024;
export const LIVE_LIMIT_CHARS = 1000000;
export const COPY_LIMIT_CHARS = 8000000;
export const PREVIEW_CHARS = 20000;

export interface Choice {
  key: string;
  label: string;
  hint: string;
}

export const ENCODE_MODES: ReadonlyArray<Choice> = [
  {
    key: "component",
    label: "Component (encodeURIComponent)",
    hint: "Best for a single query value or path segment. Encodes reserved characters such as slash, question mark, ampersand and equals.",
  },
  {
    key: "uri",
    label: "Full URL (encodeURI)",
    hint: "Keeps the URL structure intact. Leaves : / ? # & = and similar characters alone and encodes spaces and non-ASCII text.",
  },
  {
    key: "strict",
    label: "Strict RFC 3986",
    hint: "Like Component, but also encodes ! ' ( ) and * for APIs and signature schemes that require it.",
  },
  {
    key: "form",
    label: "Form data (space as +)",
    hint: "Matches application/x-www-form-urlencoded as sent by HTML forms. Spaces become plus signs.",
  },
];

export const DECODE_MODES: ReadonlyArray<Choice> = [
  {
    key: "component",
    label: "Percent-decode",
    hint: "Turns %XX sequences back into characters. Plus signs are left as they are.",
  },
  {
    key: "form",
    label: "Form data (+ as space)",
    hint: "Treats plus signs as spaces first, then decodes %XX sequences. Use for query strings from forms.",
  },
];

export interface UrlOptions {
  action: string;
  encodeMode: string;
  decodeMode: string;
  lines: boolean;
  keepEscapes: boolean;
}

export function defaultUrlOptions(): UrlOptions {
  return { action: "encode", encodeMode: "component", decodeMode: "component", lines: false, keepEscapes: false };
}

export interface UrlResult {
  text: string;
  stray: number;
  invalid: number;
}

export interface WorkerRequest {
  type: string;
  id: number;
  options: UrlOptions;
  file?: Blob;
}

export interface WorkerResponse {
  type: string;
  id: number;
  loaded?: number;
  total?: number;
  blob?: Blob;
  text?: string;
  preview?: string;
  bytes?: number;
  ms?: number;
  stray?: number;
  invalid?: number;
  message?: string;
}

const HEX_RE = /^[0-9A-Fa-f]$/;

function isHex(ch: string): boolean {
  return ch.length === 1 && HEX_RE.test(ch);
}

function pct(ch: string): string {
  return "%" + ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
}

function wellFormed(s: string): { text: string; replaced: number } {
  let out = "";
  let replaced = 0;
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const d = s.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) {
        out += s.charAt(i) + s.charAt(i + 1);
        i += 1;
      } else {
        out += "\ufffd";
        replaced += 1;
      }
    } else if (c >= 0xdc00 && c <= 0xdfff) {
      out += "\ufffd";
      replaced += 1;
    } else {
      out += s.charAt(i);
    }
  }
  return { text: out, replaced };
}

function encodeWith(mode: string, s: string): string {
  if (mode === "uri") return encodeURI(s);
  const base = encodeURIComponent(s);
  if (mode === "strict") return base.replace(/[!'()*]/g, pct);
  if (mode === "form") return base.replace(/[!'()~]/g, pct).replace(/%20/g, "+");
  return base;
}

function decodeRun(run: string): string {
  try {
    return decodeURIComponent(run);
  } catch {
    let out = "";
    let i = 0;
    while (i < run.length) {
      let done = false;
      for (let len = 1; len <= 4 && !done; len += 1) {
        const part = run.slice(i, i + len * 3);
        if (part.length < len * 3) break;
        try {
          out += decodeURIComponent(part);
          i += len * 3;
          done = true;
        } catch {
          done = false;
        }
      }
      if (!done) {
        out += run.slice(i, i + 3);
        i += 3;
      }
    }
    return out;
  }
}

function countStray(s: string): number {
  const found = s.match(/%(?![0-9A-Fa-f]{2})/g);
  return found ? found.length : 0;
}

function tripleAt(s: string, pos: number): boolean {
  return pos >= 0 && s.charAt(pos) === "%" && isHex(s.charAt(pos + 1)) && isHex(s.charAt(pos + 2));
}

function byteAt(s: string, pos: number): number {
  return parseInt(s.slice(pos + 1, pos + 3), 16);
}

function tailStart(data: string): number {
  let end = data.length;
  if (data.charAt(end - 1) === "%") {
    end -= 1;
  } else if (end >= 2 && data.charAt(end - 2) === "%" && isHex(data.charAt(end - 1))) {
    end -= 2;
  }
  let start = end;
  let count = 0;
  while (count < 1000 && tripleAt(data, start - 3)) {
    start -= 3;
    count += 1;
  }
  let back = 0;
  while (
    back < 3 &&
    tripleAt(data, start) &&
    byteAt(data, start) >= 128 &&
    byteAt(data, start) < 192 &&
    tripleAt(data, start - 3)
  ) {
    start -= 3;
    back += 1;
  }
  return start;
}

export function looksDoubleEncoded(text: string): boolean {
  return /%25[0-9A-Fa-f]{2}/.test(text);
}

export class UrlProcessor {
  private opts: UrlOptions;
  private sink: (text: string) => void;
  private carry = "";
  stray = 0;
  invalid = 0;

  constructor(options: UrlOptions, sink: (text: string) => void) {
    this.opts = options;
    this.sink = sink;
  }

  private encodePart(s: string): string {
    let out = "";
    try {
      out = encodeWith(this.opts.encodeMode, s);
    } catch {
      const fixed = wellFormed(s);
      this.invalid += fixed.replaced;
      out = encodeWith(this.opts.encodeMode, fixed.text);
    }
    if (this.opts.keepEscapes) out = out.replace(/%25([0-9A-Fa-f]{2})/g, "%$1");
    return out;
  }

  private encodeLines(data: string): string {
    const lines = data.split("\n");
    let out = "";
    for (let k = 0; k < lines.length; k += 1) {
      let line = lines[k];
      let cr = false;
      if (line.endsWith("\r")) {
        cr = true;
        line = line.slice(0, -1);
      }
      out += (k > 0 ? "\n" : "") + this.encodePart(line) + (cr ? "\r" : "");
    }
    return out;
  }

  private decodePart(s: string): string {
    let t = s;
    if (this.opts.decodeMode === "form") t = t.replace(/\+/g, " ");
    this.stray += countStray(t);
    return t.replace(/(?:%[0-9A-Fa-f]{2})+/g, (run) => decodeRun(run));
  }

  push(chunk: string): void {
    let data = this.carry + chunk;
    this.carry = "";
    if (data === "") return;
    if (this.opts.action === "decode") {
      const cut = tailStart(data);
      this.carry = data.slice(cut);
      data = data.slice(0, cut);
      if (data !== "") this.sink(this.decodePart(data));
      return;
    }
    if (this.opts.lines) {
      const nl = data.lastIndexOf("\n");
      if (nl < 0) {
        this.carry = data;
        return;
      }
      this.carry = data.slice(nl + 1);
      this.sink(this.encodeLines(data.slice(0, nl + 1)));
      return;
    }
    const last = data.charCodeAt(data.length - 1);
    if (last >= 0xd800 && last <= 0xdbff) {
      this.carry = data.slice(-1);
      data = data.slice(0, -1);
    }
    if (data !== "") this.sink(this.encodePart(data));
  }

  finish(): void {
    const rest = this.carry;
    this.carry = "";
    if (rest === "") return;
    if (this.opts.action === "decode") {
      this.sink(this.decodePart(rest));
    } else if (this.opts.lines) {
      this.sink(this.encodeLines(rest));
    } else {
      this.sink(this.encodePart(rest));
    }
  }
}

export function transformText(input: string, options: UrlOptions): UrlResult {
  let out = "";
  const p = new UrlProcessor(options, (s) => {
    out += s;
  });
  p.push(input);
  p.finish();
  return { text: out, stray: p.stray, invalid: p.invalid };
}

export interface UrlPart {
  label: string;
  value: string;
  decoded: string;
}

export interface UrlParam {
  key: string;
  value: string;
}

export interface InspectResult {
  ok: boolean;
  message: string;
  assumed: boolean;
  parts: UrlPart[];
  params: UrlParam[];
}

function decodedOrEmpty(value: string): string {
  const d = decodeRun(value);
  return d === value ? "" : d;
}

export function inspectUrl(raw: string): InspectResult {
  const input = raw.trim();
  if (input === "") return { ok: false, message: "", assumed: false, parts: [], params: [] };
  let url = new URL("http://localhost/");
  let parsed = false;
  let assumed = false;
  try {
    url = new URL(input);
    parsed = true;
  } catch {
    parsed = false;
  }
  if (!parsed) {
    try {
      url = new URL("https://" + input);
      parsed = true;
      assumed = true;
    } catch {
      parsed = false;
    }
  }
  if (!parsed) {
    return {
      ok: false,
      message: "This does not look like a valid URL. Check for spaces, a missing host or stray characters.",
      assumed: false,
      parts: [],
      params: [],
    };
  }
  const parts: UrlPart[] = [];
  const add = (label: string, value: string, decode: boolean): void => {
    if (value === "") return;
    parts.push({ label, value, decoded: decode ? decodedOrEmpty(value) : "" });
  };
  add("Protocol", url.protocol, false);
  add("Username", url.username, true);
  add("Password", url.password, true);
  add("Host", url.host, false);
  add("Hostname", url.hostname, false);
  add("Port", url.port, false);
  add("Path", url.pathname, true);
  add("Query string", url.search, true);
  add("Fragment", url.hash, true);
  add("Origin", url.origin === "null" ? "" : url.origin, false);
  const params: UrlParam[] = [];
  url.searchParams.forEach((value, key) => {
    params.push({ key, value });
  });
  return { ok: true, message: "", assumed, parts, params };
}
