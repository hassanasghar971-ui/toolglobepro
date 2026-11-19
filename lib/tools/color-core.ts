/**
 * Colour parsing, conversion and analysis. All channels are sRGB.
 * r, g, b: 0–255 (may be fractional), a: 0–1.
 */

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type FormatId = "hex" | "rgb" | "hsl" | "hsv" | "hwb" | "cmyk" | "oklch";

export interface Harmony {
  name: string;
  colors: RGBA[];
}

export const MAX_BULK_BYTES = 5 * 1024 * 1024;
export const MAX_BULK_LINES = 50_000;

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
const round = (v: number, digits = 0): number => {
  const f = Math.pow(10, digits);
  return Math.round(v * f) / f + 0;
};

const NAMED_SOURCE =
  "aliceblue:f0f8ff,antiquewhite:faebd7,aqua:00ffff,aquamarine:7fffd4,azure:f0ffff,beige:f5f5dc,bisque:ffe4c4,black:000000,blanchedalmond:ffebcd,blue:0000ff,blueviolet:8a2be2,brown:a52a2a,burlywood:deb887,cadetblue:5f9ea0,chartreuse:7fff00,chocolate:d2691e,coral:ff7f50,cornflowerblue:6495ed,cornsilk:fff8dc,crimson:dc143c,cyan:00ffff,darkblue:00008b,darkcyan:008b8b,darkgoldenrod:b8860b,darkgray:a9a9a9,darkgreen:006400,darkgrey:a9a9a9,darkkhaki:bdb76b,darkmagenta:8b008b,darkolivegreen:556b2f,darkorange:ff8c00,darkorchid:9932cc,darkred:8b0000,darksalmon:e9967a,darkseagreen:8fbc8f,darkslateblue:483d8b,darkslategray:2f4f4f,darkslategrey:2f4f4f,darkturquoise:00ced1,darkviolet:9400d3,deeppink:ff1493,deepskyblue:00bfff,dimgray:696969,dimgrey:696969,dodgerblue:1e90ff,firebrick:b22222,floralwhite:fffaf0,forestgreen:228b22,fuchsia:ff00ff,gainsboro:dcdcdc,ghostwhite:f8f8ff,gold:ffd700,goldenrod:daa520,gray:808080,green:008000,greenyellow:adff2f,grey:808080,honeydew:f0fff0,hotpink:ff69b4,indianred:cd5c5c,indigo:4b0082,ivory:fffff0,khaki:f0e68c,lavender:e6e6fa,lavenderblush:fff0f5,lawngreen:7cfc00,lemonchiffon:fffacd,lightblue:add8e6,lightcoral:f08080,lightcyan:e0ffff,lightgoldenrodyellow:fafad2,lightgray:d3d3d3,lightgreen:90ee90,lightgrey:d3d3d3,lightpink:ffb6c1,lightsalmon:ffa07a,lightseagreen:20b2aa,lightskyblue:87cefa,lightslategray:778899,lightslategrey:778899,lightsteelblue:b0c4de,lightyellow:ffffe0,lime:00ff00,limegreen:32cd32,linen:faf0e6,magenta:ff00ff,maroon:800000,mediumaquamarine:66cdaa,mediumblue:0000cd,mediumorchid:ba55d3,mediumpurple:9370db,mediumseagreen:3cb371,mediumslateblue:7b68ee,mediumspringgreen:00fa9a,mediumturquoise:48d1cc,mediumvioletred:c71585,midnightblue:191970,mintcream:f5fffa,mistyrose:ffe4e1,moccasin:ffe4b5,navajowhite:ffdead,navy:000080,oldlace:fdf5e6,olive:800000,olivedrab:6b8e23,orange:ffa500,orangered:ff4500,orchid:da70d6,palegoldenrod:eee8aa,palegreen:98fb98,paleturquoise:afeeee,palevioletred:db7093,papayawhip:ffefd5,peachpuff:ffdab9,peru:cd853f,pink:ffc0cb,plum:dda0dd,powderblue:b0e0e6,purple:800080,rebeccapurple:663399,red:ff0000,rosybrown:bc8f8f,royalblue:4169e1,saddlebrown:8b4513,salmon:fa8072,sandybrown:f4a460,seagreen:2e8b57,seashell:fff5ee,sienna:a0522d,silver:c0c0c0,skyblue:87ceeb,slateblue:6a5acd,slategray:708090,slategrey:708090,snow:fffafa,springgreen:00ff7f,steelblue:4682b4,tan:d2b48c,teal:008080,thistle:d8bfd8,tomato:ff6347,turquoise:40e0d0,violet:ee82ee,wheat:f5deb3,white:ffffff,whitesmoke:f5f5f5,yellow:ffff00,yellowgreen:9acd32";

const NAMED = new Map<string, string>();
const NAME_BY_HEX = new Map<string, string>();
for (const entry of NAMED_SOURCE.split(",")) {
  const [name, hex] = entry.split(":");
  NAMED.set(name, hex);
  if (!NAME_BY_HEX.has(hex)) NAME_BY_HEX.set(hex, name);
}

/* ---------- colour-space maths ---------- */

function toLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function fromLinear(x: number): number {
  const v = clamp(x, 0, 1);
  return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

export function rgbToHsl(c: RGBA): { h: number; s: number; l: number } {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (d > 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb(h: number, s: number, l: number, a = 1): RGBA {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp(s, 0, 100) / 100;
  const ll = clamp(l, 0, 100) / 100;
  const amp = ss * Math.min(ll, 1 - ll);
  const f = (n: number): number => {
    const k = (n + hh / 30) % 12;
    return ll - amp * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255, a };
}

function rgbToHsv(c: RGBA): { h: number; s: number; v: number } {
  const max = Math.max(c.r, c.g, c.b) / 255;
  const min = Math.min(c.r, c.g, c.b) / 255;
  const { h } = rgbToHsl(c);
  return { h, s: max === 0 ? 0 : ((max - min) / max) * 100, v: max * 100 };
}

function hsvToRgb(h: number, s: number, v: number, a = 1): RGBA {
  const ss = clamp(s, 0, 100) / 100;
  const vv = clamp(v, 0, 100) / 100;
  const l = vv * (1 - ss / 2);
  const sl = l === 0 || l === 1 ? 0 : (vv - l) / Math.min(l, 1 - l);
  return hslToRgb(h, sl * 100, l * 100, a);
}

function rgbToHwb(c: RGBA): { h: number; w: number; b: number } {
  const { h } = rgbToHsl(c);
  const max = Math.max(c.r, c.g, c.b) / 255;
  const min = Math.min(c.r, c.g, c.b) / 255;
  return { h, w: min * 100, b: (1 - max) * 100 };
}

function hwbToRgb(h: number, w: number, bl: number, a = 1): RGBA {
  let ww = clamp(w, 0, 100) / 100;
  let bb = clamp(bl, 0, 100) / 100;
  if (ww + bb >= 1) {
    const gray = (ww / (ww + bb)) * 255;
    return { r: gray, g: gray, b: gray, a };
  }
  const base = hslToRgb(h, 100, 50, a);
  const scale = 1 - ww - bb;
  ww *= 255;
  bb *= 255;
  return {
    r: (base.r / 255) * scale * 255 + ww,
    g: (base.g / 255) * scale * 255 + ww,
    b: (base.b / 255) * scale * 255 + ww,
    a,
  };
}

function rgbToCmyk(c: RGBA): { c: number; m: number; y: number; k: number } {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: ((1 - r - k) / (1 - k)) * 100,
    m: ((1 - g - k) / (1 - k)) * 100,
    y: ((1 - b - k) / (1 - k)) * 100,
    k: k * 100,
  };
}

export function rgbToOklch(c: RGBA): { l: number; c: number; h: number } {
  const r = toLinear(c.r / 255);
  const g = toLinear(c.g / 255);
  const b = toLinear(c.b / 255);
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const C = Math.hypot(A, B);
  let h = (Math.atan2(B, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  if (C < 0.0001) h = 0;
  return { l: L, c: C, h };
}

export function oklchToRgb(l: number, c: number, h: number, a = 1): RGBA {
  const hr = (h * Math.PI) / 180;
  const A = c * Math.cos(hr);
  const B = c * Math.sin(hr);
  const l_ = l + 0.3963377774 * A + 0.2158037573 * B;
  const m_ = l - 0.1055613458 * A - 0.0638541728 * B;
  const s_ = l - 0.0894841775 * A - 1.291485548 * B;
  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;
  const r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const b = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;
  return { r: fromLinear(r) * 255, g: fromLinear(g) * 255, b: fromLinear(b) * 255, a };
}

/* ---------- parsing ---------- */

function fromHexDigits(digits: string): RGBA {
  let h = digits;
  if (h.length === 3 || h.length === 4) {
    h = h
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    a: h.length === 8 ? round(parseInt(h.slice(6, 8), 16) / 255, 3) : 1,
  };
}

interface Quantity {
  n: number;
  unit: string;
}

function quantity(token: string): Quantity | null {
  if (token === "none") return { n: 0, unit: "" };
  const m = /^([+-]?(?:\d+\.?\d*|\.\d+))(%|deg|grad|rad|turn)?$/.exec(token);
  if (!m) return null;
  return { n: parseFloat(m[1]), unit: m[2] ?? "" };
}

function hueOf(q: Quantity): number {
  switch (q.unit) {
    case "grad":
      return q.n * 0.9;
    case "rad":
      return (q.n * 180) / Math.PI;
    case "turn":
      return q.n * 360;
    default:
      return q.n;
  }
}

function alphaOf(token: string | undefined): number | null {
  if (token === undefined) return 1;
  const q = quantity(token);
  if (!q) return null;
  return clamp(q.unit === "%" ? q.n / 100 : q.n, 0, 1);
}

export function roundColor(c: RGBA): RGBA {
  return {
    r: Math.round(clamp(c.r, 0, 255)),
    g: Math.round(clamp(c.g, 0, 255)),
    b: Math.round(clamp(c.b, 0, 255)),
    a: round(clamp(c.a, 0, 1), 3),
  };
}

export function parseColor(input: string): RGBA | null {
  const s = input.trim().toLowerCase();
  if (s === "") return null;
  if (s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

  const named = NAMED.get(s);
  if (named !== undefined) return fromHexDigits(named);

  const hex = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(s);
  if (hex) return fromHexDigits(hex[1]);

  const fn = /^(rgba?|hsla?|hwb|oklch)\(\s*([^)]*?)\s*\)$/.exec(s);
  if (!fn) return null;
  const args = fn[2].split(/[\s,/]+/).filter((part) => part !== "");
  if (args.length < 3 || args.length > 4) return null;

  const q0 = quantity(args[0]);
  const q1 = quantity(args[1]);
  const q2 = quantity(args[2]);
  const alpha = alphaOf(args[3]);
  if (!q0 || !q1 || !q2 || alpha === null) return null;

  const kind = fn[1];
  if (kind === "rgb" || kind === "rgba") {
    const ch = (q: Quantity): number => clamp(q.unit === "%" ? q.n * 2.55 : q.n, 0, 255);
    return { r: ch(q0), g: ch(q1), b: ch(q2), a: alpha };
  }
  if (kind === "hsl" || kind === "hsla") {
    return hslToRgb(hueOf(q0), q1.n, q2.n, alpha);
  }
  if (kind === "hwb") {
    return hwbToRgb(hueOf(q0), q1.n, q2.n, alpha);
  }
  const L = q0.unit === "%" ? q0.n / 100 : q0.n;
  const C = q1.unit === "%" ? (q1.n * 0.4) / 100 : q1.n;
  return oklchToRgb(clamp(L, 0, 1), Math.max(0, C), hueOf(q2), alpha);
}

/* ---------- formatting ---------- */

const hex2 = (v: number): string =>
  Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0");

export function toHex(c: RGBA, upper = false, withAlpha = true): string {
  let out = `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`;
  if (withAlpha && c.a < 1) out += hex2(c.a * 255);
  return upper ? out.toUpperCase() : out;
}

export function formatColor(c: RGBA, id: FormatId, upper = false): string {
  const a = round(clamp(c.a, 0, 1), 3);
  switch (id) {
    case "hex":
      return toHex(c, upper);
    case "rgb": {
      const r = Math.round(clamp(c.r, 0, 255));
      const g = Math.round(clamp(c.g, 0, 255));
      const b = Math.round(clamp(c.b, 0, 255));
      return a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
    }
    case "hsl": {
      const { h, s, l } = rgbToHsl(c);
      const hh = Math.round(h) % 360;
      return a < 1
        ? `hsla(${hh}, ${Math.round(s)}%, ${Math.round(l)}%, ${a})`
        : `hsl(${hh}, ${Math.round(s)}%, ${Math.round(l)}%)`;
    }
    case "hsv": {
      const { h, s, v } = rgbToHsv(c);
      return `hsv(${Math.round(h) % 360}, ${Math.round(s)}%, ${Math.round(v)}%)`;
    }
    case "hwb": {
      const { h, w, b } = rgbToHwb(c);
      const alpha = a < 1 ? ` / ${a}` : "";
      return `hwb(${Math.round(h) % 360} ${Math.round(w)}% ${Math.round(b)}%${alpha})`;
    }
    case "cmyk": {
      const k = rgbToCmyk(c);
      return `cmyk(${Math.round(k.c)}%, ${Math.round(k.m)}%, ${Math.round(k.y)}%, ${Math.round(k.k)}%)`;
    }
    case "oklch": {
      const o = rgbToOklch(c);
      const alpha = a < 1 ? ` / ${a}` : "";
      return `oklch(${round(o.l * 100, 1)}% ${round(o.c, 3)} ${round(o.h, 1)}${alpha})`;
    }
    default:
      return toHex(c, upper);
  }
}

/** Exact CSS colour name for an opaque colour, or null. */
export function nameOf(c: RGBA): string | null {
  if (c.a < 1) return null;
  return NAME_BY_HEX.get(toHex(c, false, false).slice(1)) ?? null;
}

/* ---------- analysis ---------- */

export function luminance(c: RGBA): number {
  return (
    0.2126 * toLinear(clamp(c.r, 0, 255) / 255) +
    0.7152 * toLinear(clamp(c.g, 0, 255) / 255) +
    0.0722 * toLinear(clamp(c.b, 0, 255) / 255)
  );
}

export function contrastRatio(x: RGBA, y: RGBA): number {
  const l1 = luminance(x);
  const l2 = luminance(y);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

export function wcag(ratio: number): {
  aa: boolean;
  aaLarge: boolean;
  aaa: boolean;
  aaaLarge: boolean;
} {
  return { aa: ratio >= 4.5, aaLarge: ratio >= 3, aaa: ratio >= 7, aaaLarge: ratio >= 4.5 };
}

export function tintsAndShades(c: RGBA): RGBA[] {
  const { h, s } = rgbToHsl(c);
  return [95, 85, 75, 65, 55, 45, 35, 25, 15].map((l) => hslToRgb(h, s, l, c.a));
}

export function harmonies(c: RGBA): Harmony[] {
  const { h, s, l } = rgbToHsl(c);
  const rot = (deg: number): RGBA => hslToRgb(h + deg, s, l, c.a);
  return [
    { name: "Complementary", colors: [c, rot(180)] },
    { name: "Analogous", colors: [rot(-30), c, rot(30)] },
    { name: "Triadic", colors: [c, rot(120), rot(240)] },
    { name: "Split-complementary", colors: [c, rot(150), rot(210)] },
    { name: "Tetradic", colors: [c, rot(90), rot(180), rot(270)] },
  ];
}

/* ---------- bulk conversion ---------- */

export interface BulkResult {
  output: string;
  converted: number;
  invalid: number;
  truncated: boolean;
}

const INLINE_COLOR_RE = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|oklch)\([^)]*\)/gi;

export function convertBulk(text: string, id: FormatId, upper: boolean): BulkResult {
  const allLines = text.split(/\r\n|\r|\n/);
  const truncated = allLines.length > MAX_BULK_LINES;
  const lines = truncated ? allLines.slice(0, MAX_BULK_LINES) : allLines;
  let converted = 0;
  let invalid = 0;

  const out = lines.map((line) => {
    if (line.trim() === "") return line;
    const whole = parseColor(line);
    if (whole) {
      converted += 1;
      return formatColor(whole, id, upper);
    }
    let hits = 0;
    const replaced = line.replace(INLINE_COLOR_RE, (match) => {
      const parsed = parseColor(match);
      if (!parsed) return match;
      hits += 1;
      return formatColor(parsed, id, upper);
    });
    if (hits > 0) {
      converted += 1;
      return replaced;
    }
    invalid += 1;
    return `${line} /* not a colour */`;
  });

  return { output: out.join("\n"), converted, invalid, truncated };
}
