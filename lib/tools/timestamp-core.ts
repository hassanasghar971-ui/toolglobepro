/**
 * timestamp-core.ts
 * Unix timestamp and date helpers. Pure functions. Uses the browser's Intl
 * time zone database, so no time zone data is bundled.
 * Supported range: year 0001 to 9999.
 */

export type TsUnit = "auto" | "s" | "ms" | "us" | "ns";
export type ConcreteUnit = Exclude<TsUnit, "auto">;
export type BatchFormat = "iso" | "zone" | "rfc";

export const MIN_MS = -62135596800000; // 0001-01-01T00:00:00Z
export const MAX_MS = 253402300799999; // 9999-12-31T23:59:59.999Z
export const MAX_BATCH_LINES = 100_000;
export const MAX_BATCH_CHARS = 5_000_000;

export const UNIT_LABELS: Record<ConcreteUnit, string> = {
  s: "seconds",
  ms: "milliseconds",
  us: "microseconds",
  ns: "nanoseconds",
};

export const TIME_ZONES: string[] = [
  "UTC",
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Toronto",
  "America/Mexico_City",
  "America/Bogota",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "Atlantic/Reykjavik",
  "Europe/London",
  "Europe/Dublin",
  "Europe/Lisbon",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Stockholm",
  "Europe/Athens",
  "Europe/Istanbul",
  "Europe/Moscow",
  "Africa/Cairo",
  "Africa/Lagos",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Tehran",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Jakarta",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Manila",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Perth",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function pad(value: number, length = 2): string {
  const text = String(Math.abs(Math.trunc(value)));
  return (value < 0 ? "-" : "") + text.padStart(length, "0");
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  const lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return lengths[month - 1] ?? 31;
}

/** Builds a UTC timestamp, correct for years below 100 as well. */
export function makeUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, millisecond);
  return date.getTime();
}

export function detectUnit(integerDigits: string): ConcreteUnit {
  const length = integerDigits.replace(/^0+/, "").length;
  if (length <= 11) return "s";
  if (length <= 14) return "ms";
  if (length <= 17) return "us";
  return "ns";
}

export type ParseResult =
  | { ok: true; ms: number; unit: ConcreteUnit; detected: boolean }
  | { ok: false; error: string };

/**
 * Parses a Unix timestamp into milliseconds. Integer input is handled as text
 * so long microsecond and nanosecond values keep their exact millisecond.
 */
export function parseTimestamp(raw: string, unit: TsUnit): ParseResult {
  const text = raw.trim().replace(/[\s_,]/g, "");
  if (!text) return { ok: false, error: "Enter a Unix timestamp." };

  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) {
    return {
      ok: false,
      error: "That doesn't look like a timestamp. Use digits only, for example 1700000000.",
    };
  }

  const negative = match[1] === "-";
  const integerPart = match[2];
  const fraction = match[3];
  const detected = unit === "auto";
  const resolved: ConcreteUnit = detected ? detectUnit(integerPart) : unit;

  let ms: number;
  if (fraction === undefined) {
    const digits = integerPart.replace(/^0+(?=\d)/, "");
    let msDigits: string;
    if (resolved === "s") msDigits = `${digits}000`;
    else if (resolved === "ms") msDigits = digits;
    else if (resolved === "us") msDigits = digits.length > 3 ? digits.slice(0, -3) : "0";
    else msDigits = digits.length > 6 ? digits.slice(0, -6) : "0";
    ms = Number(msDigits);
  } else {
    const value = Number(`${integerPart}.${fraction}`);
    const factor =
      resolved === "s" ? 1000 : resolved === "ms" ? 1 : resolved === "us" ? 0.001 : 0.000001;
    ms = Math.round(value * factor);
  }
  if (negative) ms = -ms;

  if (!Number.isFinite(ms) || ms < MIN_MS || ms > MAX_MS) {
    return {
      ok: false,
      error:
        "That timestamp is outside the supported range (year 0001 to 9999). Try a different unit.",
    };
  }
  return { ok: true, ms: ms === 0 ? 0 : ms, unit: resolved, detected };
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(zone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      weekday: "long",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatterCache.set(zone, formatter);
  }
  return formatter;
}

export function isValidZone(zone: string): boolean {
  try {
    getFormatter(zone);
    return true;
  } catch {
    return false;
  }
}

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  weekday: string;
  offsetMinutes: number;
}

export function getZonedParts(ms: number, zone: string): ZonedParts {
  const millisecond = ((ms % 1000) + 1000) % 1000;
  const flooredMs = ms - millisecond;

  if (zone === "UTC" || !isValidZone(zone)) {
    const d = new Date(flooredMs);
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      second: d.getUTCSeconds(),
      millisecond,
      weekday: WEEKDAYS[d.getUTCDay()],
      offsetMinutes: 0,
    };
  }

  const parts = getFormatter(zone).formatToParts(new Date(flooredMs));
  const read = (type: string): string => parts.find((p) => p.type === type)?.value ?? "0";
  let hour = Number(read("hour"));
  if (hour === 24) hour = 0;
  const year = Number(read("year"));
  const month = Number(read("month"));
  const day = Number(read("day"));
  const minute = Number(read("minute"));
  const second = Number(read("second"));
  const asUtc = makeUtc(year, month, day, hour, minute, second, 0);

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    weekday: read("weekday"),
    offsetMinutes: Math.round((asUtc - flooredMs) / 60000),
  };
}

export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  return `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

export function formatZoned(ms: number, zone: string): string {
  const p = getZonedParts(ms, zone);
  const base = `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
  return p.millisecond !== 0 ? `${base}.${pad(p.millisecond, 3)}` : base;
}

export function toIso(ms: number): string {
  return new Date(ms).toISOString();
}

export function toUtcString(ms: number): string {
  return new Date(ms).toUTCString();
}

export function dayOfYear(year: number, month: number, day: number): number {
  const start = makeUtc(year, 1, 1, 0, 0, 0, 0);
  const current = makeUtc(year, month, day, 0, 0, 0, 0);
  return Math.round((current - start) / 86400000) + 1;
}

export function isoWeek(
  year: number,
  month: number,
  day: number,
): { week: number; weekYear: number } {
  const date = new Date(makeUtc(year, month, day, 0, 0, 0, 0));
  const dayNumber = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNumber);
  const weekYear = date.getUTCFullYear();
  const yearStart = makeUtc(weekYear, 1, 1, 0, 0, 0, 0);
  const week = Math.ceil(((date.getTime() - yearStart) / 86400000 + 1) / 7);
  return { week, weekYear };
}

export function relativeTime(ms: number, nowMs: number): string {
  const diffSeconds = (ms - nowMs) / 1000;
  const abs = Math.abs(diffSeconds);
  if (abs < 1) return "just now";
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31557600],
    ["month", 2629800],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ];
  const step = steps.find(([, seconds]) => abs >= seconds) ?? steps[steps.length - 1];
  const value = Math.round(diffSeconds / step[1]);
  try {
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(value, step[0]);
  } catch {
    return value < 0 ? `${Math.abs(value)} ${step[0]}s ago` : `in ${value} ${step[0]}s`;
  }
}

/** Converts a "wall clock" time (as if it were UTC) in a zone into a real timestamp. */
export function zonedToMs(naiveUtcMs: number, zone: string): number {
  if (zone === "UTC" || !isValidZone(zone)) return naiveUtcMs;
  let guess = naiveUtcMs;
  for (let i = 0; i < 3; i++) {
    const offset = getZonedParts(guess, zone).offsetMinutes;
    const next = naiveUtcMs - offset * 60000;
    if (next === guess) break;
    guess = next;
  }
  return guess;
}

export type DateParse =
  | { ok: true; ms: number; note?: string }
  | { ok: false; error: string };

const DATE_RE =
  /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i;

/**
 * Parses ISO-style dates ("2024-03-05 14:30:00", "2024-03-05T14:30:00+05:00").
 * Text without an offset is read in the given zone. Other formats fall back to
 * the browser's own parser.
 */
export function parseDateInput(raw: string, zone: string): DateParse {
  const text = raw.trim();
  if (!text) return { ok: false, error: "Enter a date and time." };

  const m = DATE_RE.exec(text);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const hour = m[4] ? Number(m[4]) : 0;
    const minute = m[5] ? Number(m[5]) : 0;
    const second = m[6] ? Number(m[6]) : 0;
    const millisecond = m[7] ? Number(m[7].slice(0, 3).padEnd(3, "0")) : 0;

    if (month < 1 || month > 12) return { ok: false, error: "The month must be between 1 and 12." };
    if (day < 1 || day > daysInMonth(year, month)) {
      return { ok: false, error: "That day doesn't exist in the chosen month." };
    }
    if (hour > 23 || minute > 59 || second > 59) {
      return { ok: false, error: "The time must be between 00:00:00 and 23:59:59." };
    }

    const naive = makeUtc(year, month, day, hour, minute, second, millisecond);
    let ms: number;
    const offset = m[8];
    if (offset) {
      if (offset.toUpperCase() === "Z") {
        ms = naive;
      } else {
        const sign = offset[0] === "-" ? -1 : 1;
        const digits = offset.slice(1).replace(":", "");
        const offsetHours = Number(digits.slice(0, 2));
        const offsetMinutes = digits.length > 2 ? Number(digits.slice(2, 4)) : 0;
        ms = naive - sign * (offsetHours * 60 + offsetMinutes) * 60000;
      }
    } else {
      ms = zonedToMs(naive, zone);
    }
    if (ms < MIN_MS || ms > MAX_MS) {
      return { ok: false, error: "That date is outside the supported range (year 0001 to 9999)." };
    }
    return { ok: true, ms };
  }

  const fallback = Date.parse(text);
  if (Number.isFinite(fallback) && fallback >= MIN_MS && fallback <= MAX_MS) {
    return {
      ok: true,
      ms: fallback,
      note: "Read with your browser's date parser. Text without a time zone is treated as your browser's local time.",
    };
  }
  return {
    ok: false,
    error: "I couldn't read that date. Try a format like 2024-03-05 14:30:00 or 2024-03-05T14:30:00Z.",
  };
}

export type BatchResult =
  | { ok: true; output: string; converted: number; failed: number }
  | { ok: false; error: string };

export function convertBatch(
  text: string,
  unit: TsUnit,
  format: BatchFormat,
  zone: string,
): BatchResult {
  if (text.length > MAX_BATCH_CHARS) {
    return { ok: false, error: "The list is above 5 MB. Split it into smaller batches." };
  }
  const lines = text.split(/\r?\n/);
  if (lines.length > MAX_BATCH_LINES) {
    return {
      ok: false,
      error: `The list has more than ${MAX_BATCH_LINES.toLocaleString("en-US")} lines. Split it into smaller batches.`,
    };
  }

  let converted = 0;
  let failed = 0;
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      out.push("");
      continue;
    }
    const parsed = parseTimestamp(trimmed, unit);
    if (!parsed.ok) {
      failed++;
      out.push(`${trimmed}\t# could not be read`);
      continue;
    }
    converted++;
    const value =
      format === "iso"
        ? toIso(parsed.ms)
        : format === "rfc"
          ? toUtcString(parsed.ms)
          : formatZoned(parsed.ms, zone);
    out.push(`${trimmed}\t${value}`);
  }
  return { ok: true, output: out.join("\n"), converted, failed };
}
