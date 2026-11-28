export interface InfoRow {
  label: string;
  value: string;
}

export interface InfoGroup {
  id: string;
  title: string;
  rows: InfoRow[];
}

export interface ParsedUa {
  browser: string;
  os: string;
  device: string;
}

interface NavExtra {
  deviceMemory?: number;
  doNotTrack?: string;
  globalPrivacyControl?: boolean;
  pdfViewerEnabled?: boolean;
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
  userAgentData?: {
    platform?: string;
    mobile?: boolean;
    brands?: { brand: string; version: string }[];
  };
  storage?: {
    estimate?: () => Promise<{ quota?: number; usage?: number }>;
  };
}

export const SUPPORTED = "Supported";
export const NOT_SUPPORTED = "Not supported";
const NA = "Not available";

const BROWSERS = [
  { name: "Edge", token: "Edg/" },
  { name: "Opera", token: "OPR/" },
  { name: "Samsung Internet", token: "SamsungBrowser/" },
  { name: "Firefox", token: "Firefox/" },
  { name: "Firefox (iOS)", token: "FxiOS/" },
  { name: "Chrome (iOS)", token: "CriOS/" },
  { name: "Chrome", token: "Chrome/" },
  { name: "Safari", token: "Version/" },
] as const;

function navExtra(): NavExtra {
  return navigator as unknown as NavExtra;
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

function supportRow(label: string, ok: boolean): InfoRow {
  return { label, value: ok ? SUPPORTED : NOT_SUPPORTED };
}

function versionAfter(ua: string, token: string): string {
  const idx = ua.indexOf(token);
  if (idx < 0) return "";
  const m = /^[0-9][0-9._]*/.exec(ua.slice(idx + token.length));
  return m ? String(m[0]).replace(/_/g, ".") : "";
}

export function parseUserAgent(ua: string): ParsedUa {
  let browser = "Unknown";
  for (const b of BROWSERS) {
    if (ua.includes(b.token)) {
      if (b.name === "Safari" && !ua.includes("Safari/")) continue;
      const v = versionAfter(ua, b.token);
      browser = v === "" ? b.name : b.name + " " + v;
      break;
    }
  }

  const isIos = ua.includes("iPhone") ? true : ua.includes("iPad");
  let os = "Unknown";
  if (ua.includes("Windows NT")) {
    const v = versionAfter(ua, "Windows NT ");
    os =
      v === "10.0"
        ? "Windows 10 or 11"
        : v === "6.3"
          ? "Windows 8.1"
          : v === "6.1"
            ? "Windows 7"
            : v === ""
              ? "Windows"
              : "Windows (NT " + v + ")";
  } else if (ua.includes("Android")) {
    const v = versionAfter(ua, "Android ");
    os = v === "" ? "Android" : "Android " + v;
  } else if (isIos) {
    const v = versionAfter(ua, "OS ");
    os = v === "" ? "iOS or iPadOS" : "iOS or iPadOS " + v;
  } else if (ua.includes("Mac OS X")) {
    os = "macOS";
  } else if (ua.includes("CrOS")) {
    os = "ChromeOS";
  } else if (ua.includes("Linux")) {
    os = "Linux";
  }

  let device = "Desktop or laptop";
  if (ua.includes("iPad")) {
    device = "Tablet";
  } else if (ua.includes("Mobi")) {
    device = "Phone";
  } else if (ua.includes("iPhone")) {
    device = "Phone";
  } else if (ua.includes("Android")) {
    device = "Tablet";
  }

  return { browser, os, device };
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return NA;
  if (n < 1024) return n + " B";
  const units = ["KB", "MB", "GB", "TB"];
  let value = n / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return value.toFixed(value >= 100 ? 0 : 1) + " " + units[i];
}

function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const h = String(Math.floor(abs / 60)).padStart(2, "0");
  const m = String(abs % 60).padStart(2, "0");
  return "UTC" + sign + h + ":" + m;
}

function media(query: string): boolean {
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

function browserGroup(): InfoGroup {
  const ua = navigator.userAgent;
  const parsed = parseUserAgent(ua);
  const x = navExtra();
  const uad = x.userAgentData;
  const brands =
    uad && uad.brands && uad.brands.length > 0
      ? uad.brands.map((b) => b.brand + " " + b.version).join(", ")
      : NA;
  const hintPlatform = uad && uad.platform ? uad.platform : NA;
  const dntRaw = x.doNotTrack;
  const dnt = dntRaw === "1" ? "On" : dntRaw === "0" ? "Off" : "Not set";
  const gpc = typeof x.globalPrivacyControl === "boolean" ? (x.globalPrivacyControl ? "On" : "Off") : NA;
  const pdf = typeof x.pdfViewerEnabled === "boolean" ? yesNo(x.pdfViewerEnabled) : NA;
  const languages = navigator.languages.length > 0 ? navigator.languages.join(", ") : navigator.language;

  return {
    id: "browser",
    title: "Browser and operating system",
    rows: [
      { label: "Browser", value: parsed.browser },
      { label: "Operating system", value: parsed.os },
      { label: "Device type", value: parsed.device },
      { label: "Browser brands (client hints)", value: brands },
      { label: "Platform (client hints)", value: hintPlatform },
      { label: "Platform (navigator)", value: navigator.platform === "" ? NA : navigator.platform },
      { label: "Language", value: navigator.language },
      { label: "Preferred languages", value: languages },
      { label: "Cookies enabled", value: yesNo(navigator.cookieEnabled) },
      { label: "Do Not Track", value: dnt },
      { label: "Global Privacy Control", value: gpc },
      { label: "Built-in PDF viewer", value: pdf },
      { label: "Automated browser", value: navigator.webdriver ? "Yes" : "No" },
      { label: "User agent", value: ua },
    ],
  };
}

export function collectScreenGroup(): InfoGroup {
  const s = window.screen;
  const dpr = window.devicePixelRatio;
  const orientation = s.orientation ? s.orientation.type : NA;
  return {
    id: "screen",
    title: "Screen and window",
    rows: [
      { label: "Screen size", value: s.width + " x " + s.height },
      { label: "Available screen area", value: s.availWidth + " x " + s.availHeight },
      { label: "Window (viewport) size", value: window.innerWidth + " x " + window.innerHeight },
      { label: "Browser window outer size", value: window.outerWidth + " x " + window.outerHeight },
      { label: "Pixel ratio", value: String(dpr) },
      { label: "Physical pixels (estimate)", value: Math.round(s.width * dpr) + " x " + Math.round(s.height * dpr) },
      { label: "Color depth", value: s.colorDepth + " bit" },
      { label: "Orientation", value: orientation },
      { label: "Touch points", value: String(navigator.maxTouchPoints) },
      { label: "Prefers dark mode", value: yesNo(media("(prefers-color-scheme: dark)")) },
      { label: "Prefers reduced motion", value: yesNo(media("(prefers-reduced-motion: reduce)")) },
      { label: "Main pointer is touch", value: yesNo(media("(pointer: coarse)")) },
      { label: "Can hover", value: yesNo(media("(hover: hover)")) },
    ],
  };
}

function systemGroup(): InfoGroup {
  const x = navExtra();
  const opts = Intl.DateTimeFormat().resolvedOptions();
  const memory =
    typeof x.deviceMemory === "number" ? "About " + x.deviceMemory + " GB (rounded by the browser)" : NA;
  const threads = navigator.hardwareConcurrency > 0 ? String(navigator.hardwareConcurrency) : NA;
  return {
    id: "system",
    title: "Device, time and locale",
    rows: [
      { label: "CPU threads", value: threads },
      { label: "Device memory", value: memory },
      { label: "Time zone", value: opts.timeZone },
      { label: "UTC offset", value: formatOffset(-new Date().getTimezoneOffset()) },
      { label: "Formatting locale", value: opts.locale },
      { label: "Local time", value: new Date().toLocaleString() },
      { label: "Online", value: yesNo(navigator.onLine) },
    ],
  };
}

function networkGroup(): InfoGroup {
  const c = navExtra().connection;
  if (!c) {
    return {
      id: "network",
      title: "Connection",
      rows: [{ label: "Network Information API", value: NOT_SUPPORTED }],
    };
  }
  return {
    id: "network",
    title: "Connection",
    rows: [
      { label: "Connection type", value: c.effectiveType ?? NA },
      { label: "Estimated download speed", value: typeof c.downlink === "number" ? c.downlink + " Mbps" : NA },
      { label: "Estimated round trip", value: typeof c.rtt === "number" ? c.rtt + " ms" : NA },
      { label: "Data saver", value: typeof c.saveData === "boolean" ? yesNo(c.saveData) : NA },
    ],
  };
}

function webglRows(): InfoRow[] {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("webgl");
    if (!ctx) return [{ label: "WebGL", value: NOT_SUPPORTED }];
    const gl = ctx as WebGLRenderingContext;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = ext ? String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)) : String(gl.getParameter(gl.VENDOR));
    const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    const maxTexture = String(gl.getParameter(gl.MAX_TEXTURE_SIZE));
    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
    return [
      { label: "WebGL", value: SUPPORTED },
      { label: "Graphics vendor", value: vendor },
      { label: "Graphics renderer", value: renderer },
      { label: "Max texture size", value: maxTexture },
    ];
  } catch {
    return [{ label: "WebGL", value: NOT_SUPPORTED }];
  }
}

function localStorageWorks(): boolean {
  try {
    return typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function graphicsGroup(): InfoGroup {
  return { id: "graphics", title: "Graphics", rows: webglRows() };
}

function featuresGroup(): InfoGroup {
  return {
    id: "features",
    title: "Browser features",
    rows: [
      supportRow("Web Workers", typeof Worker !== "undefined"),
      supportRow("Service workers", "serviceWorker" in navigator),
      supportRow("WebAssembly", typeof WebAssembly !== "undefined"),
      supportRow("OffscreenCanvas", typeof OffscreenCanvas !== "undefined"),
      supportRow("Streams API", typeof ReadableStream !== "undefined"),
      supportRow("IndexedDB", typeof indexedDB !== "undefined"),
      supportRow("Local storage", localStorageWorks()),
      supportRow("Clipboard API", "clipboard" in navigator),
      supportRow("Web Share", "share" in navigator),
      supportRow("Notifications", typeof Notification !== "undefined"),
      supportRow("Geolocation API", "geolocation" in navigator),
      supportRow("WebGPU", "gpu" in navigator),
      supportRow("File System Access", "showOpenFilePicker" in window),
      supportRow("WebRTC", typeof RTCPeerConnection !== "undefined"),
      supportRow("Web Audio", typeof AudioContext !== "undefined"),
      supportRow("Intl.Segmenter", "Segmenter" in Intl),
    ],
  };
}

export function collectGroups(): InfoGroup[] {
  return [
    browserGroup(),
    collectScreenGroup(),
    systemGroup(),
    networkGroup(),
    graphicsGroup(),
    featuresGroup(),
  ];
}

export async function readStorageGroup(): Promise<InfoGroup> {
  const rows: InfoRow[] = [];
  try {
    const store = navExtra().storage;
    if (store && store.estimate) {
      const est = await store.estimate();
      rows.push({ label: "Storage quota for this site", value: typeof est.quota === "number" ? formatBytes(est.quota) : NA });
      rows.push({ label: "Storage used by this site", value: typeof est.usage === "number" ? formatBytes(est.usage) : NA });
    }
  } catch {
    /* storage estimate is optional */
  }
  if (rows.length === 0) rows.push({ label: "Storage estimate", value: NOT_SUPPORTED });
  return { id: "storage", title: "Storage", rows };
}

export function findValue(groups: readonly InfoGroup[], label: string): string {
  for (const g of groups) {
    for (const r of g.rows) {
      if (r.label === label) return r.value;
    }
  }
  return NA;
}

export function toText(groups: readonly InfoGroup[]): string {
  const lines: string[] = [];
  for (const g of groups) {
    lines.push("## " + g.title);
    for (const r of g.rows) lines.push(r.label + ": " + r.value);
    lines.push("");
  }
  return lines.join("\n").trim();
}

export function toJson(groups: readonly InfoGroup[]): string {
  const out: Record<string, Record<string, string>> = {};
  for (const g of groups) {
    const section: Record<string, string> = {};
    for (const r of g.rows) section[r.label] = r.value;
    out[g.title] = section;
  }
  return JSON.stringify(out, null, 2);
}
