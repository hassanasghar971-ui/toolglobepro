"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";

type Json = Record<string, unknown>;

interface IpInfo {
  ip: string;
  version: "IPv4" | "IPv6";
  city: string;
  region: string;
  postal: string;
  country: string;
  countryCode: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  isp: string;
  asn: string;
  provider: string;
  partial: boolean;
}

interface BrowserInfo {
  timeZone: string;
  language: string;
  screen: string;
  cookies: boolean;
  userAgent: string;
}

interface Provider {
  name: string;
  url: (ip: string | null) => string;
  parse: (data: unknown) => IpInfo | null;
}

const REQUEST_TIMEOUT_MS = 8000;

function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function asNumber(value: unknown): number | null {
  const parsed =
    typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function ipVersion(ip: string): "IPv4" | "IPv6" {
  return ip.includes(":") ? "IPv6" : "IPv4";
}

function asnLabel(value: unknown): string {
  const text = asString(value);
  if (!text) return "";
  return /^as/i.test(text) ? text.toUpperCase() : `AS${text}`;
}

function parseIpwho(data: unknown): IpInfo | null {
  if (!isRecord(data) || data.success === false) return null;
  const ip = asString(data.ip);
  if (!ip) return null;
  const connection: Json = isRecord(data.connection) ? data.connection : {};
  const zone: Json = isRecord(data.timezone) ? data.timezone : {};
  return {
    ip,
    version: ipVersion(ip),
    city: asString(data.city),
    region: asString(data.region),
    postal: asString(data.postal),
    country: asString(data.country),
    countryCode: asString(data.country_code),
    latitude: asNumber(data.latitude),
    longitude: asNumber(data.longitude),
    timezone: asString(zone.id),
    isp: asString(connection.isp) || asString(connection.org),
    asn: asnLabel(connection.asn),
    provider: "ipwho.is",
    partial: false,
  };
}

function parseIpapi(data: unknown): IpInfo | null {
  if (!isRecord(data) || data.error === true) return null;
  const ip = asString(data.ip);
  if (!ip) return null;
  return {
    ip,
    version: ipVersion(ip),
    city: asString(data.city),
    region: asString(data.region),
    postal: asString(data.postal),
    country: asString(data.country_name),
    countryCode: asString(data.country_code),
    latitude: asNumber(data.latitude),
    longitude: asNumber(data.longitude),
    timezone: asString(data.timezone),
    isp: asString(data.org),
    asn: asnLabel(data.asn),
    provider: "ipapi.co",
    partial: false,
  };
}

function parseGeojs(data: unknown): IpInfo | null {
  if (!isRecord(data)) return null;
  const ip = asString(data.ip);
  if (!ip) return null;
  return {
    ip,
    version: ipVersion(ip),
    city: asString(data.city),
    region: asString(data.region),
    postal: "",
    country: asString(data.country),
    countryCode: asString(data.country_code),
    latitude: asNumber(data.latitude),
    longitude: asNumber(data.longitude),
    timezone: asString(data.timezone),
    isp: asString(data.organization_name),
    asn: asnLabel(data.asn),
    provider: "geojs.io",
    partial: false,
  };
}

const PROVIDERS: Provider[] = [
  { name: "ipwho.is", url: (ip) => `https://ipwho.is/${ip ?? ""}`, parse: parseIpwho },
  { name: "ipapi.co", url: (ip) => (ip ? `https://ipapi.co/${ip}/json/` : "https://ipapi.co/json/"), parse: parseIpapi },
  {
    name: "geojs.io",
    url: (ip) => (ip ? `https://get.geojs.io/v1/ip/geo/${ip}.json` : "https://get.geojs.io/v1/ip/geo.json"),
    parse: parseGeojs,
  },
];

const IP_ONLY_ENDPOINTS = ["https://api64.ipify.org?format=json", "https://api.ipify.org?format=json"];

function abortError(): DOMException {
  return new DOMException("Aborted", "AbortError");
}

async function fetchJson(url: string, outer: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (outer.aborted) controller.abort();
  else outer.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timer);
    outer.removeEventListener("abort", onAbort);
  }
}

async function lookupIp(ip: string | null, signal: AbortSignal): Promise<IpInfo> {
  for (const provider of PROVIDERS) {
    if (signal.aborted) throw abortError();
    try {
      const info = provider.parse(await fetchJson(provider.url(ip), signal));
      if (info) return info;
    } catch {
      if (signal.aborted) throw abortError();
    }
  }

  if (ip === null) {
    for (const endpoint of IP_ONLY_ENDPOINTS) {
      if (signal.aborted) throw abortError();
      try {
        const data = await fetchJson(endpoint, signal);
        const found = isRecord(data) ? asString(data.ip) : "";
        if (found) {
          return {
            ip: found,
            version: ipVersion(found),
            city: "",
            region: "",
            postal: "",
            country: "",
            countryCode: "",
            latitude: null,
            longitude: null,
            timezone: "",
            isp: "",
            asn: "",
            provider: "ipify.org",
            partial: true,
          };
        }
      } catch {
        if (signal.aborted) throw abortError();
      }
    }
  }

  throw new Error(
    "Every lookup service is unreachable right now. An ad blocker, VPN or firewall may be blocking them. Pause the blocker or try again in a moment.",
  );
}

function isValidIpv4(value: string): boolean {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

function isValidIpv6(value: string): boolean {
  if (!value.includes(":") || !/^[0-9a-fA-F:.]+$/.test(value)) return false;
  try {
    new URL(`http://[${value}]/`);
    return true;
  } catch {
    return false;
  }
}

function reservedReason(ip: string): string | null {
  if (isValidIpv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return "private-network";
    if (a === 127) return "loopback";
    if (a === 169 && b === 254) return "link-local";
    if (a === 100 && b >= 64 && b <= 127) return "carrier-grade NAT";
    if (a === 0) return "reserved";
    if (a >= 224) return "multicast or reserved";
    return null;
  }
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return "loopback";
  if (/^fe[89ab]/.test(lower)) return "link-local";
  if (/^f[cd]/.test(lower)) return "private (unique-local)";
  return null;
}

function flagEmoji(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...Array.from(code.toUpperCase()).map((char) => 127397 + char.charCodeAt(0)));
}

function localTime(timeZone: string, ms: number): string {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone, dateStyle: "medium", timeStyle: "medium" }).format(ms);
  } catch {
    return "";
  }
}

function readBrowser(): BrowserInfo {
  let timeZone = "";
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    timeZone = "";
  }
  return {
    timeZone,
    language: navigator.language || "",
    screen: `${window.screen.width} × ${window.screen.height}`,
    cookies: navigator.cookieEnabled,
    userAgent: navigator.userAgent,
  };
}

function buildReport(info: IpInfo): string {
  const lines: Array<[string, string]> = [
    ["IP address", info.ip],
    ["Version", info.version],
    ["ISP / organization", info.isp],
    ["ASN", info.asn],
    ["City", info.city],
    ["Region", info.region],
    ["Postal code", info.postal],
    ["Country", info.country],
    ["Time zone", info.timezone],
    [
      "Coordinates",
      info.latitude !== null && info.longitude !== null ? `${info.latitude}, ${info.longitude}` : "",
    ],
  ];
  return lines
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}

const cardClass =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900";
const buttonClass =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";
const primaryButtonClass =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-50";

export function IpLookupTool() {
  const inputId = useId();
  const abortRef = useRef<AbortController | null>(null);

  const [info, setInfo] = useState<IpInfo | null>(null);
  const [target, setTarget] = useState<"mine" | "custom">("mine");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [browser, setBrowser] = useState<BrowserInfo | null>(null);
  const [tick, setTick] = useState(0);

  const run = useCallback(async (ip: string | null) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const result = await lookupIp(ip, controller.signal);
      if (abortRef.current !== controller) return;
      setInfo(result);
    } catch (err) {
      if (abortRef.current !== controller) return;
      setError(err instanceof Error ? err.message : "The lookup failed. Please try again.");
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void run(null);
    queueMicrotask(() => setBrowser(readBrowser()));
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [run]);

  useEffect(() => {
    if (!info?.timezone) return;
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [info?.timezone]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleLookup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) {
      setError("Enter an IPv4 or IPv6 address to look up.");
      return;
    }
    if (!isValidIpv4(value) && !isValidIpv6(value)) {
      setError(`"${value}" isn't a valid IPv4 or IPv6 address.`);
      return;
    }
    const reason = reservedReason(value);
    if (reason) {
      setError(`${value} is a ${reason} address, so it has no public location. Try a public IP address.`);
      return;
    }
    setTarget("custom");
    void run(value);
  };

  const handleMine = () => {
    setTarget("mine");
    setQuery("");
    void run(null);
  };

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
    } catch {
      setError("Couldn't access the clipboard. Select the text and copy it manually.");
    }
  };

  const downloadJson = () => {
    if (!info) return;
    const blob = new Blob([JSON.stringify(info, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ip-${info.ip.replace(/[^0-9a-zA-Z.-]/g, "_")}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const hasCoordinates = info !== null && info.latitude !== null && info.longitude !== null;
  const flag = info ? flagEmoji(info.countryCode) : "";
  const now = tick || 0;

  const rows: Array<{ label: string; value: string }> = info
    ? [
        { label: "Version", value: info.version },
        { label: "ISP / organization", value: info.isp },
        { label: "ASN", value: info.asn },
        { label: "City", value: info.city },
        { label: "Region", value: info.region },
        { label: "Postal code", value: info.postal },
        { label: "Country", value: info.country ? `${flag} ${info.country}`.trim() : "" },
        { label: "Time zone", value: info.timezone },
        { label: "Local time there", value: info.timezone && now ? localTime(info.timezone, now) : "" },
        {
          label: "Coordinates",
          value: hasCoordinates ? `${info.latitude?.toFixed(4)}, ${info.longitude?.toFixed(4)}` : "",
        },
      ].filter((row) => row.value)
    : [];

  const zoneMismatch =
    target === "mine" &&
    info !== null &&
    browser !== null &&
    info.timezone !== "" &&
    browser.timeZone !== "" &&
    info.timezone !== browser.timeZone;

  const blurClass = hidden ? "select-none blur-md" : "";

  return (
    <div className="space-y-6">
      <section className={cardClass} aria-label="IP address result" aria-busy={loading}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {target === "mine" ? "Your public IP address" : "IP address lookup"}
          </h2>
          <div className="flex flex-wrap gap-2">
            {target === "custom" && (
              <button type="button" className={buttonClass} onClick={handleMine} disabled={loading}>
                Show my IP
              </button>
            )}
            <button type="button" className={buttonClass} onClick={() => setHidden((value) => !value)} aria-pressed={hidden}>
              {hidden ? "Show details" : "Hide details"}
            </button>
          </div>
        </div>

        {loading && !info ? (
          <div role="status" className="mt-4 animate-pulse space-y-3">
            <div className="h-12 w-3/4 rounded-xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-4 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Detecting your IP address…</p>
          </div>
        ) : info ? (
          <div className="mt-3">
            <p
              className={`break-all font-mono text-3xl font-bold tracking-tight text-slate-900 transition sm:text-4xl dark:text-slate-50 ${blurClass}`}
              aria-live="polite"
            >
              {info.ip}
            </p>
            {loading && (
              <p role="status" className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Updating…
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className={primaryButtonClass} onClick={() => copy("ip", info.ip)}>
                {copied === "ip" ? "Copied ✓" : "Copy IP"}
              </button>
              <button type="button" className={buttonClass} onClick={() => copy("all", buildReport(info))}>
                {copied === "all" ? "Copied ✓" : "Copy all details"}
              </button>
              <button type="button" className={buttonClass} onClick={downloadJson}>
                Download JSON
              </button>
              {hasCoordinates && (
                <a
                  className={buttonClass}
                  href={`https://www.openstreetmap.org/?mlat=${info.latitude}&mlon=${info.longitude}#map=10/${info.latitude}/${info.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on map ↗
                </a>
              )}
            </div>
          </div>
        ) : null}

        {error && (
          <div
            role="alert"
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
          >
            <span>{error}</span>
            <button
              type="button"
              className={buttonClass}
              onClick={() => void run(target === "custom" && query.trim() ? query.trim() : null)}
              disabled={loading}
            >
              Retry
            </button>
          </div>
        )}

        {info?.partial && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            Location services couldn&apos;t be reached, so only your IP address is shown. Try again later for the full
            details.
          </p>
        )}

        {rows.length > 0 && (
          <dl className={`mt-5 grid gap-3 transition sm:grid-cols-2 ${blurClass}`}>
            {rows.map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
              >
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {row.label}
                </dt>
                <dd className="mt-0.5 break-words text-base font-semibold text-slate-900 dark:text-slate-100">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {info && !info.partial && (
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Data from {info.provider}. Location is approximate (usually accurate to the country or region, rarely to the
            street).
          </p>
        )}

        {zoneMismatch && info && browser && (
          <p className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
            Heads up: the IP&apos;s time zone ({info.timezone}) differs from your browser&apos;s ({browser.timeZone}). That
            often means a VPN or proxy is active, though some zones simply have more than one name.
          </p>
        )}
      </section>

      <section className={cardClass} aria-label="Look up another IP address">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Look up any IP address</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Paste an IPv4 or IPv6 address from a server log, an email header or a firewall alert.
        </p>
        <form onSubmit={handleLookup} className="mt-4 flex flex-col gap-3 sm:flex-row" noValidate>
          <label htmlFor={inputId} className="sr-only">
            IP address to look up
          </label>
          <input
            id={inputId}
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. 8.8.8.8 or 2001:4860:4860::8888"
            className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-mono text-base text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-indigo-500 focus:outline-2 focus:outline-offset-0 focus:outline-indigo-500/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <button type="submit" className={`${primaryButtonClass} px-5 py-2.5`} disabled={loading}>
            Look up
          </button>
        </form>
      </section>

      {browser && (
        <section className={cardClass} aria-label="Browser details">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">What your browser reports</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Read locally from your device and never sent anywhere by this page.
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-slate-500 dark:text-slate-400">Time zone</dt>
              <dd className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">{browser.timeZone || "Unknown"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500 dark:text-slate-400">Language</dt>
              <dd className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">{browser.language || "Unknown"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500 dark:text-slate-400">Screen size</dt>
              <dd className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">{browser.screen}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500 dark:text-slate-400">Cookies enabled</dt>
              <dd className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">{browser.cookies ? "Yes" : "No"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-medium text-slate-500 dark:text-slate-400">User agent</dt>
              <dd className="mt-0.5 break-words font-mono text-xs text-slate-700 dark:text-slate-300">
                {browser.userAgent}
              </dd>
            </div>
          </dl>
        </section>
      )}

      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        🔒 Requests go from your browser directly to the lookup providers with no cookies and no referrer. ToolGlobe Pro
        stores nothing.
      </p>
    </div>
  );
}

export default IpLookupTool;
