"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MAX_BATCH_CHARS,
  MAX_BATCH_LINES,
  TIME_ZONES,
  UNIT_LABELS,
  convertBatch,
  dayOfYear,
  formatOffset,
  formatZoned,
  getZonedParts,
  isLeapYear,
  isValidZone,
  isoWeek,
  parseDateInput,
  parseTimestamp,
  relativeTime,
  toIso,
  toUtcString,
  type BatchFormat,
  type TsUnit,
} from "@/lib/tools/timestamp-core";

interface ResultRow {
  key: string;
  label: string;
  value: string;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy method
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

function downloadText(text: string, filename: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function zoneLabel(zone: string): string {
  return zone.replace(/_/g, " ");
}

const UNIT_OPTIONS: { value: TsUnit; label: string }[] = [
  { value: "auto", label: "Auto-detect" },
  { value: "s", label: "Seconds" },
  { value: "ms", label: "Milliseconds" },
  { value: "us", label: "Microseconds" },
  { value: "ns", label: "Nanoseconds" },
];

const BATCH_FORMATS: { value: BatchFormat; label: string }[] = [
  { value: "iso", label: "ISO 8601 (UTC)" },
  { value: "rfc", label: "RFC 2822 (UTC)" },
  { value: "zone", label: "Selected time zone" },
];

export default function TimestampConverterTool() {
  const [now, setNow] = useState<number | null>(null);
  const [zone, setZone] = useState("UTC");
  const [browserZone, setBrowserZone] = useState<string | null>(null);
  const [tsInput, setTsInput] = useState("");
  const [tsUnit, setTsUnit] = useState<TsUnit>("auto");
  const [dateInput, setDateInput] = useState("");
  const [batchInput, setBatchInput] = useState("");
  const [batchFormat, setBatchFormat] = useState<BatchFormat>("iso");
  const [batchOutput, setBatchOutput] = useState("");
  const [batchMessage, setBatchMessage] = useState<{ type: "ok" | "error"; text: string } | null>(
    null,
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyTimer = useRef<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    let detected: string | undefined;
    try {
      detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      detected = undefined;
    }
    if (detected && isValidZone(detected)) {
      setBrowserZone(detected);
      setZone(detected);
    }
    return () => {
      window.clearInterval(interval);
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    };
  }, []);

  const zoneOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    if (browserZone) {
      options.push({ value: browserZone, label: `Your time zone (${zoneLabel(browserZone)})` });
    }
    for (const z of TIME_ZONES) {
      if (z === browserZone) continue;
      options.push({ value: z, label: zoneLabel(z) });
    }
    return options;
  }, [browserZone]);

  const copy = useCallback(async (key: string, text: string) => {
    const ok = await copyText(text);
    if (!ok) return;
    setCopiedKey(key);
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopiedKey(null), 1500);
  }, []);

  const tsResult = useMemo(
    () => (tsInput.trim() === "" ? null : parseTimestamp(tsInput, tsUnit)),
    [tsInput, tsUnit],
  );

  const tsRows = useMemo<ResultRow[] | null>(() => {
    if (!tsResult || !tsResult.ok) return null;
    const ms = tsResult.ms;
    const p = getZonedParts(ms, zone);
    const week = isoWeek(p.year, p.month, p.day);
    return [
      { key: "iso", label: "ISO 8601 (UTC)", value: toIso(ms) },
      { key: "rfc", label: "RFC 2822 (UTC)", value: toUtcString(ms) },
      {
        key: "zone",
        label: `${zoneLabel(zone)} (${formatOffset(p.offsetMinutes)})`,
        value: formatZoned(ms, zone),
      },
      {
        key: "rel",
        label: "Relative to now",
        value: now === null ? "…" : relativeTime(ms, now),
      },
      { key: "dow", label: "Day of week", value: p.weekday },
      { key: "week", label: "ISO week", value: `Week ${week.week} of ${week.weekYear}` },
      {
        key: "doy",
        label: "Day of year",
        value: `${dayOfYear(p.year, p.month, p.day)}${isLeapYear(p.year) ? " (leap year)" : ""}`,
      },
      { key: "s", label: "Unix seconds", value: String(Math.floor(ms / 1000)) },
      { key: "ms", label: "Unix milliseconds", value: String(ms) },
    ];
  }, [tsResult, zone, now]);

  const dateResult = useMemo(
    () => (dateInput.trim() === "" ? null : parseDateInput(dateInput, zone)),
    [dateInput, zone],
  );

  const dateRows = useMemo<ResultRow[] | null>(() => {
    if (!dateResult || !dateResult.ok) return null;
    const ms = dateResult.ms;
    const p = getZonedParts(ms, zone);
    return [
      { key: "d-s", label: "Unix seconds", value: String(Math.floor(ms / 1000)) },
      { key: "d-ms", label: "Unix milliseconds", value: String(ms) },
      { key: "d-iso", label: "ISO 8601 (UTC)", value: toIso(ms) },
      {
        key: "d-zone",
        label: `${zoneLabel(zone)} (${formatOffset(p.offsetMinutes)})`,
        value: formatZoned(ms, zone),
      },
    ];
  }, [dateResult, zone]);

  const runBatch = useCallback(() => {
    if (batchInput.trim() === "") {
      setBatchOutput("");
      setBatchMessage({ type: "error", text: "Paste at least one timestamp first." });
      return;
    }
    const result = convertBatch(batchInput, tsUnit, batchFormat, zone);
    if (!result.ok) {
      setBatchOutput("");
      setBatchMessage({ type: "error", text: result.error });
      return;
    }
    setBatchOutput(result.output);
    setBatchMessage({
      type: result.failed > 0 ? "error" : "ok",
      text: `${result.converted.toLocaleString("en-US")} converted${
        result.failed > 0 ? `, ${result.failed.toLocaleString("en-US")} could not be read` : ""
      }.`,
    });
  }, [batchInput, tsUnit, batchFormat, zone]);

  const useNow = () => {
    const current = Date.now();
    setNow(current);
    setTsInput(String(Math.floor(current / 1000)));
    setTsUnit("s");
  };

  const renderRows = (rows: ResultRow[]) => (
    <ul className="divide-y divide-slate-200 dark:divide-slate-800">
      {rows.map((row) => (
        <li key={row.key} className="flex items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="text-xs text-slate-600 dark:text-slate-400">{row.label}</p>
            <p className="break-all font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
              {row.value}
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost shrink-0"
            onClick={() => void copy(row.key, row.value)}
            aria-label={`Copy ${row.label}`}
          >
            {copiedKey === row.key ? "Copied" : "Copy"}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-6">
      {/* Live clock */}
      <section className="card space-y-3 p-5" aria-label="Current Unix time">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400">
              Current Unix time
            </p>
            <p
              className="font-mono text-3xl font-bold text-slate-900 dark:text-slate-100"
              aria-live="off"
            >
              {now === null ? "—" : Math.floor(now / 1000)}
            </p>
            <p className="font-mono text-sm text-slate-600 dark:text-slate-400">
              {now === null ? "" : `${now} ms · ${toIso(now)}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              disabled={now === null}
              onClick={() => now !== null && void copy("now-s", String(Math.floor(now / 1000)))}
            >
              {copiedKey === "now-s" ? "Copied" : "Copy seconds"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={now === null}
              onClick={() => now !== null && void copy("now-ms", String(now))}
            >
              {copiedKey === "now-ms" ? "Copied" : "Copy milliseconds"}
            </button>
            <button type="button" className="btn-primary" disabled={now === null} onClick={useNow}>
              Convert this
            </button>
          </div>
        </div>
      </section>

      {/* Shared settings */}
      <section className="card grid gap-4 p-5 sm:grid-cols-2" aria-label="Settings">
        <div>
          <label htmlFor="ts-zone" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Time zone
          </label>
          <select
            id="ts-zone"
            className="input mt-2 w-full"
            value={zone}
            onChange={(event) => setZone(event.target.value)}
          >
            {zoneOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Used for displayed times and for dates typed without an offset.
          </p>
        </div>
        <div>
          <label htmlFor="ts-unit" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Timestamp unit
          </label>
          <select
            id="ts-unit"
            className="input mt-2 w-full"
            value={tsUnit}
            onChange={(event) => setTsUnit(event.target.value as TsUnit)}
          >
            {UNIT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Auto-detect uses the digit count: 10 = seconds, 13 = milliseconds.
          </p>
        </div>
      </section>

      {/* Timestamp to date */}
      <section className="card space-y-3 p-5" aria-label="Timestamp to date">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Timestamp to date
        </h2>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          value={tsInput}
          onChange={(event) => setTsInput(event.target.value)}
          placeholder="e.g. 1700000000 or 1700000000000"
          className="input w-full font-mono"
          aria-label="Unix timestamp"
          aria-invalid={tsResult !== null && !tsResult.ok}
        />
        {tsResult && !tsResult.ok && (
          <p className="text-sm text-red-700 dark:text-red-300" role="alert">
            {tsResult.error}
          </p>
        )}
        {tsResult && tsResult.ok && (
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Read as {UNIT_LABELS[tsResult.unit]}
            {tsResult.detected ? " (auto-detected)" : ""}.
          </p>
        )}
        {tsRows && renderRows(tsRows)}
        {!tsInput.trim() && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Paste a Unix timestamp above, or press &ldquo;Convert this&rdquo; to use the current time.
          </p>
        )}
      </section>

      {/* Date to timestamp */}
      <section className="card space-y-3 p-5" aria-label="Date to timestamp">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Date to timestamp
        </h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={dateInput}
            onChange={(event) => setDateInput(event.target.value)}
            placeholder="e.g. 2024-03-05 14:30:00 or 2024-03-05T14:30:00Z"
            className="input w-full font-mono"
            aria-label="Date and time"
            aria-invalid={dateResult !== null && !dateResult.ok}
          />
          <input
            type="datetime-local"
            step={1}
            onChange={(event) => setDateInput(event.target.value.replace("T", " "))}
            className="input"
            aria-label="Pick a date and time"
          />
        </div>
        {dateResult && !dateResult.ok && (
          <p className="text-sm text-red-700 dark:text-red-300" role="alert">
            {dateResult.error}
          </p>
        )}
        {dateResult && dateResult.ok && dateResult.note && (
          <p className="text-xs text-amber-700 dark:text-amber-300">{dateResult.note}</p>
        )}
        {dateRows && renderRows(dateRows)}
        {!dateInput.trim() && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Type a date or use the picker. Add Z or an offset such as +05:00 to override the time zone.
          </p>
        )}
      </section>

      {/* Batch */}
      <section className="card space-y-3 p-5" aria-label="Batch conversion">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Batch conversion
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          One timestamp per line, up to {MAX_BATCH_LINES.toLocaleString("en-US")} lines and{" "}
          {Math.round(MAX_BATCH_CHARS / 1_000_000)} MB. Uses the unit setting above.
        </p>
        <textarea
          value={batchInput}
          onChange={(event) => setBatchInput(event.target.value)}
          rows={6}
          spellCheck={false}
          placeholder={"1700000000\n1700003600\n1700007200"}
          className="input w-full font-mono"
          aria-label="Timestamps, one per line"
        />
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="ts-batch-format" className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Output
          </label>
          <select
            id="ts-batch-format"
            className="input"
            value={batchFormat}
            onChange={(event) => setBatchFormat(event.target.value as BatchFormat)}
          >
            {BATCH_FORMATS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="button" className="btn-primary" onClick={runBatch}>
            Convert
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setBatchInput("");
              setBatchOutput("");
              setBatchMessage(null);
            }}
          >
            Clear
          </button>
        </div>
        {batchMessage && (
          <p
            className={`text-sm ${
              batchMessage.type === "ok"
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-red-700 dark:text-red-300"
            }`}
            role={batchMessage.type === "error" ? "alert" : "status"}
          >
            {batchMessage.text}
          </p>
        )}
        {batchOutput && (
          <>
            <textarea
              readOnly
              value={batchOutput}
              rows={8}
              className="input w-full font-mono"
              aria-label="Converted output"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void copy("batch", batchOutput)}
              >
                {copiedKey === "batch" ? "Copied" : "Copy output"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => downloadText(batchOutput, "converted-timestamps.txt")}
              >
                Download .txt
              </button>
            </div>
          </>
        )}
      </section>

      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        Everything runs in your browser. Nothing you type is uploaded.
      </p>
    </div>
  );
}
