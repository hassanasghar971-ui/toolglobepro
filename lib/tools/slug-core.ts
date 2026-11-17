export type Separator = "-" | "_" | ".";

export interface SlugOptions {
  separator: Separator;
  lowercase: boolean;
  /** true = transliterate to ASCII; false = keep letters and digits from any script */
  ascii: boolean;
  /** ä→ae, ö→oe, ü→ue (only used when ascii is true) */
  german: boolean;
  stopWords: boolean;
  /** "&" becomes the word "and" */
  ampersand: boolean;
  /** 0 = unlimited */
  maxLength: number;
}

export const DEFAULT_OPTIONS: SlugOptions = {
  separator: "-",
  lowercase: true,
  ascii: true,
  german: false,
  stopWords: false,
  ampersand: true,
  maxLength: 0,
};

export const MAX_LINES = 20_000;
export const MAX_INPUT_CHARS = 2_000_000;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MIN_LIMIT = 10;
export const MAX_LIMIT = 200;

export interface BulkRow {
  title: string;
  slug: string;
}

export interface BulkResult {
  rows: BulkRow[];
  truncated: boolean;
  dropped: string[];
  renamed: number;
  empty: number;
}

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "nor", "of", "in", "on", "at", "to", "for", "with", "by",
  "from", "as", "is", "are", "was", "were", "be", "been", "it", "its", "this", "that", "these", "those",
]);

const MAP = new Map<string, string>();

/** Space-separated "char=replacement" tokens. An empty replacement removes the character. */
function define(spec: string): void {
  for (const token of spec.split(/\s+/)) {
    if (!token) continue;
    const i = token.indexOf("=");
    if (i < 0) continue;
    MAP.set(token.slice(0, i), token.slice(i + 1));
  }
}

// Latin letters that do not decompose with Unicode normalisation
define("ß=ss æ=ae œ=oe ø=o đ=d ð=d þ=th ł=l ħ=h ı=i ŧ=t ĸ=k ŋ=ng ſ=s ŀ=l");
// Cyrillic (Russian, Ukrainian, Belarusian, Serbian)
define(
  "а=a б=b в=v г=g д=d е=e ё=yo ж=zh з=z и=i й=y к=k л=l м=m н=n о=o п=p р=r с=s т=t у=u ф=f х=kh ц=ts ч=ch ш=sh щ=shch ъ= ы=y ь= э=e ю=yu я=ya є=ye і=i ї=yi ґ=g ў=u ј=j љ=lj њ=nj ћ=c џ=dz ђ=dj",
);
// Greek
define("α=a β=v γ=g δ=d ε=e ζ=z η=i θ=th ι=i κ=k λ=l μ=m ν=n ξ=x ο=o π=p ρ=r σ=s ς=s τ=t υ=y φ=f χ=ch ψ=ps ω=o");
// Arabic and Urdu (basic consonant mapping; short vowel marks are stripped)
define(
  "ا=a أ=a إ=i آ=aa ٱ=a ب=b پ=p ت=t ٹ=tt ث=th ج=j چ=ch ح=h خ=kh د=d ڈ=dd ذ=z ر=r ڑ=rr ز=z ژ=zh س=s ش=sh ص=s ض=z ط=t ظ=z ع=a غ=gh ف=f ق=q ک=k ك=k گ=g ل=l م=m ن=n ں=n و=w ؤ=w ہ=h ھ=h ه=h ة=h ء= ئ=y ی=y ي=y ى=a ے=e ـ=",
);
// Arabic-Indic and Persian digits
for (let i = 0; i < 10; i++) {
  MAP.set(String.fromCharCode(0x660 + i), String(i));
  MAP.set(String.fromCharCode(0x6f0 + i), String(i));
}

const GERMAN = new Map<string, string>([
  ["ä", "ae"],
  ["ö", "oe"],
  ["ü", "ue"],
]);

const MARKS = /[\u0300-\u036f\u064b-\u065f\u0670]/g;

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function mapChar(ch: string, german: boolean): string {
  if (ch.charCodeAt(0) < 128) return ch;
  const lower = ch.toLowerCase();
  const isUpper = lower !== ch;
  let rep = german ? GERMAN.get(lower) : undefined;
  if (rep === undefined) rep = MAP.get(lower);
  if (rep !== undefined) return isUpper ? capitalize(rep) : rep;
  const base = ch.normalize("NFD").replace(MARKS, "");
  if (base === ch) return ch;
  let out = "";
  for (const c of base) out += mapChar(c, german);
  return out;
}

function transliterate(text: string, german: boolean): string {
  if (/^[\x00-\x7f]*$/.test(text)) return text;
  let out = "";
  for (const ch of text) out += mapChar(ch, german);
  return out;
}

function limitWords(words: string[], sep: string, max: number): string {
  let out = "";
  for (const w of words) {
    const next = out === "" ? w : out + sep + w;
    if (next.length > max) break;
    out = next;
  }
  if (out === "" && words.length > 0) out = Array.from(words[0]).slice(0, max).join("");
  return out;
}

export function slugifyDetailed(input: string, o: SlugOptions): { slug: string; dropped: string[] } {
  let text = o.ascii ? input.normalize("NFKC") : input.normalize("NFC");
  text = text.replace(/['\u2018\u2019\u02bc`\u00b4]/g, "");
  if (o.ampersand) text = text.replace(/\s*&\s*/g, " and ");

  const dropped = new Set<string>();
  let words: string[];
  if (o.ascii) {
    text = transliterate(text, o.german);
    for (const ch of text) {
      if (ch.charCodeAt(0) > 127 && /[\p{L}\p{N}]/u.test(ch)) dropped.add(ch);
    }
    words = text.match(/[A-Za-z0-9]+/g) ?? [];
  } else {
    words = text.match(/[\p{L}\p{N}\p{M}]+/gu) ?? [];
  }

  if (o.lowercase) words = words.map((w) => w.toLowerCase());

  if (o.stopWords) {
    const kept = words.filter((w) => !STOP_WORDS.has(w.toLowerCase()));
    if (kept.length > 0) words = kept;
  }

  let slug: string;
  if (o.maxLength > 0) slug = words.length > 0 ? limitWords(words, o.separator, o.maxLength) : "";
  else slug = words.join(o.separator);

  return { slug, dropped: Array.from(dropped).slice(0, 20) };
}

export function slugify(input: string, o: SlugOptions): string {
  return slugifyDetailed(input, o).slug;
}

export function uniquify(
  slugs: string[],
  separator: string,
  maxLength: number,
): { slugs: string[]; renamed: number } {
  const used = new Set<string>();
  const counters = new Map<string, number>();
  let renamed = 0;
  const out = slugs.map((s) => {
    if (s === "") return s;
    if (!used.has(s)) {
      used.add(s);
      counters.set(s, 1);
      return s;
    }
    let n = counters.get(s) ?? 1;
    let candidate: string;
    do {
      n++;
      const suffix = `${separator}${n}`;
      let base = s;
      if (maxLength > 0 && base.length + suffix.length > maxLength) {
        base = Array.from(base)
          .slice(0, Math.max(1, maxLength - suffix.length))
          .join("");
        while (base.length > 1 && base.endsWith(separator)) base = base.slice(0, -1);
      }
      candidate = base + suffix;
    } while (used.has(candidate));
    counters.set(s, n);
    used.add(candidate);
    renamed++;
    return candidate;
  });
  return { slugs: out, renamed };
}

export function slugifyBulk(text: string, o: SlugOptions, unique: boolean): BulkResult {
  const rows: BulkRow[] = [];
  const dropped = new Set<string>();
  let truncated = false;

  for (const raw of text.split(/\r\n|\r|\n/)) {
    const title = raw.trim();
    if (title === "") continue;
    if (rows.length >= MAX_LINES) {
      truncated = true;
      break;
    }
    const r = slugifyDetailed(title, o);
    for (const d of r.dropped) dropped.add(d);
    rows.push({ title, slug: r.slug });
  }

  let renamed = 0;
  if (unique) {
    const res = uniquify(
      rows.map((r) => r.slug),
      o.separator,
      o.maxLength,
    );
    res.slugs.forEach((s, i) => {
      rows[i].slug = s;
    });
    renamed = res.renamed;
  }

  let empty = 0;
  for (const r of rows) if (r.slug === "") empty++;

  return { rows, truncated, dropped: Array.from(dropped).slice(0, 20), renamed, empty };
}

function csvCell(value: string): string {
  let s = value;
  // Prevent spreadsheet formula injection
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: BulkRow[]): string {
  const lines = ["title,slug"];
  for (const r of rows) lines.push(`${csvCell(r.title)},${csvCell(r.slug)}`);
  return lines.join("\r\n");
}
