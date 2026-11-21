/** URL encoding core: pure functions, safe to unit test and to reuse in workers. */

export type UrlMode = "encode" | "decode";
export type EncodeMethod = "component" | "uri" | "form" | "strict";

export interface UrlTransformOptions {
  mode: UrlMode;
  method: EncodeMethod;
  plusAsSpace: boolean;
  repeatDecode: boolean;
  perLine: boolean;
}

export interface TransformResult {
  output: string;
  /** Number of problems fixed or skipped (lone surrogates, malformed % sequences). */
  errors: number;
  /** Decode passes used (1 unless "decode repeatedly" is on). */
  passes: number;
}

export const METHOD_INFO: Record<EncodeMethod, { label: string; hint: string }> = {
  component: {
    label: "Component",
    hint: "encodeURIComponent: best for query values and path segments.",
  },
  uri: {
    label: "Full URL",
    hint: "encodeURI: keeps : / ? # & = so a whole address stays valid.",
  },
  form: {
    label: "Form (+)",
    hint: "application/x-www-form-urlencoded: spaces become +, like HTML forms.",
  },
  strict: {
    label: "Strict RFC 3986",
    hint: "Also encodes ! ' ( ) * for signatures and strict APIs.",
  },
};

function hex(ch: string): string {
  const h = ch.charCodeAt(0).toString(16).toUpperCase();
  return "%" + (h.length < 2 ? "0" + h : h);
}

function replaceLoneSurrogates(s: string): { text: string; count: number } {
  let out = "";
  let count = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = s.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += s.charAt(i) + s.charAt(i + 1);
        i++;
      } else {
        out += "\ufffd";
        count++;
      }
    } else if (c >= 0xdc00 && c <= 0xdfff) {
      out += "\ufffd";
      count++;
    } else {
      out += s.charAt(i);
    }
  }
  return { text: out, count };
}

function encodeRaw(s: string, method: EncodeMethod): string {
  switch (method) {
    case "uri":
      return encodeURI(s);
    case "form":
      return encodeURIComponent(s).replace(/[!'()~]/g, hex).replace(/%20/g, "+");
    case "strict":
      return encodeURIComponent(s).replace(/[!'()*]/g, hex);
    default:
      return encodeURIComponent(s);
  }
}

export function encodeText(s: string, method: EncodeMethod): { text: string; errors: number } {
  try {
    return { text: encodeRaw(s, method), errors: 0 };
  } catch {
    const fixed = replaceLoneSurrogates(s);
    return { text: encodeRaw(fixed.text, method), errors: fixed.count };
  }
}

/** Decodes percent sequences. Malformed ones are left alone and counted. */
export function decodeLenient(s: string): { text: string; errors: number } {
  try {
    return { text: decodeURIComponent(s), errors: 0 };
  } catch {
    // fall through to the lenient path
  }
  let errors = 0;
  const text = s.replace(/(?:%[0-9a-fA-F]{2})+/g, (run) => {
    try {
      return decodeURIComponent(run);
    } catch {
      errors++;
      return run.replace(/%([0-7][0-9a-fA-F])/g, (_m: string, h: string) =>
        String.fromCharCode(parseInt(h, 16))
      );
    }
  });
  const stray = text.match(/%(?![0-9a-fA-F]{2})/g);
  return { text, errors: errors + (stray ? stray.length : 0) };
}

export function decodeText(
  s: string,
  plusAsSpace: boolean,
  repeat: boolean
): { text: string; errors: number; passes: number } {
  let current = s;
  let errors = 0;
  let passes = 0;
  const maxPasses = repeat ? 5 : 1;
  for (let p = 0; p < maxPasses; p++) {
    const input = plusAsSpace ? current.replace(/\+/g, " ") : current;
    const res = decodeLenient(input);
    passes++;
    errors += res.errors;
    if (res.text === current) break;
    current = res.text;
    if (!/%[0-9a-fA-F]{2}/.test(current)) break;
  }
  return { text: current, errors, passes };
}

export function transformUrlText(input: string, opts: UrlTransformOptions): TransformResult {
  const parts = opts.perLine ? input.split(/\r?\n/) : [input];
  let errors = 0;
  let passes = 1;
  const out = parts.map((part) => {
    if (opts.mode === "encode") {
      const res = encodeText(part, opts.method);
      errors += res.errors;
      return res.text;
    }
    const res = decodeText(part, opts.plusAsSpace, opts.repeatDecode);
    errors += res.errors;
    if (res.passes > passes) passes = res.passes;
    return res.text;
  });
  return { output: out.join("\n"), errors, passes };
}

export interface QueryParam {
  key: string;
  value: string;
  rawKey: string;
  rawValue: string;
}

export interface ParsedUrl {
  href: string;
  origin: string;
  protocol: string;
  username: string;
  password: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  pathSegments: string[];
  params: QueryParam[];
}

export type ParseResult =
  | { ok: true; url: ParsedUrl; assumedScheme: boolean }
  | { ok: false; error: string };

export function parseUrl(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "Enter a URL to break it into parts." };
  let url: URL | null = null;
  let assumed = false;
  try {
    url = new URL(trimmed);
  } catch {
    url = null;
  }
  if (
    url === null ||
    (!/^[a-zA-Z][a-zA-Z0-9+.\-]*:\/\//.test(trimmed) && !/^(mailto|tel|data|urn):/i.test(trimmed))
  ) {
    try {
      url = new URL("https://" + trimmed.replace(/^\/\//, ""));
      assumed = true;
    } catch {
      return { ok: false, error: "That does not look like a valid URL." };
    }
  }

  const params: QueryParam[] = [];
  const query = url.search.charAt(0) === "?" ? url.search.slice(1) : url.search;
  if (query) {
    const pairs = query.split("&");
    for (let i = 0; i < pairs.length; i++) {
      if (pairs[i] === "") continue;
      const eq = pairs[i].indexOf("=");
      const rawKey = eq === -1 ? pairs[i] : pairs[i].slice(0, eq);
      const rawValue = eq === -1 ? "" : pairs[i].slice(eq + 1);
      params.push({
        key: decodeText(rawKey, true, false).text,
        value: decodeText(rawValue, true, false).text,
        rawKey,
        rawValue,
      });
    }
  }

  const segments = url.pathname
    .split("/")
    .filter((s) => s.length > 0)
    .map((s) => decodeLenient(s).text);

  return {
    ok: true,
    assumedScheme: assumed,
    url: {
      href: url.href,
      origin: url.origin,
      protocol: url.protocol,
      username: url.username,
      password: url.password,
      host: url.host,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      pathSegments: segments,
      params,
    },
  };
}
