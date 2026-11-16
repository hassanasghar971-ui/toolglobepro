/**
 * Adsterra configuration + Social Bar frequency capping.
 * NOTE: process.env.NEXT_PUBLIC_* must be referenced literally so Next can inline them.
 */

declare global {
  interface Window {
    /** True once any ad script has been injected (used to reload on consent withdrawal). */
    __tgpAdsLoaded?: boolean;
    /** In-memory fallback flag if storage is blocked. */
    __tgpSb?: boolean;
  }
}

export interface NativeUnit {
  src: string;
  containerId: string;
}

export type NativeSlot = "inline" | "footer";

function normalizeSrc(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function parseNativeUnit(raw?: string): NativeUnit | null {
  const src = normalizeSrc(raw);
  if (!src) return null;
  const match = new URL(src).pathname.match(/\/([A-Za-z0-9]+)\/invoke\.js$/);
  if (!match) return null;
  return { src, containerId: `container-${match[1]}` };
}

const NATIVE_UNITS: Record<NativeSlot, NativeUnit | null> = {
  inline: parseNativeUnit(process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_SRC_INLINE),
  footer: parseNativeUnit(process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_SRC_FOOTER),
};

export function getNativeUnit(slot: NativeSlot): NativeUnit | null {
  return NATIVE_UNITS[slot];
}

export const SOCIAL_BAR_SRC: string | null = normalizeSrc(
  process.env.NEXT_PUBLIC_ADSTERRA_SOCIAL_BAR_SRC,
);

/* ── Frequency capping ─────────────────────────────── */
export const SOCIAL_BAR_CAP = {
  /** Max loads per browser session (tab lifetime). */
  maxPerSession: 1,
  /** Minimum gap between loads across sessions. */
  minIntervalMs: 30 * 60 * 1000,
  /** Minimum time on page before loading, in ms. */
  minDwellMs: 3000,
  /** Load anyway after this long without interaction, in ms. */
  fallbackDelayMs: 15000,
} as const;

const LAST_KEY = "tgp:sb:last";
const SESSION_KEY = "tgp:sb:session";

/** Pages where we never show intrusive ad formats (trust + policy pages). */
const AD_FREE_PATHS = ["/privacy-policy", "/terms-and-conditions", "/disclaimer", "/contact"];

export function isAdFreePath(pathname: string): boolean {
  return AD_FREE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function canShowSocialBar(now: number = Date.now()): boolean {
  try {
    const sessionCount = Number(sessionStorage.getItem(SESSION_KEY) || 0);
    if (sessionCount >= SOCIAL_BAR_CAP.maxPerSession) return false;
    const last = Number(localStorage.getItem(LAST_KEY) || 0);
    if (last && now - last < SOCIAL_BAR_CAP.minIntervalMs) return false;
    return !window.__tgpSb;
  } catch {
    return !window.__tgpSb;
  }
}

export function recordSocialBarImpression(now: number = Date.now()): void {
  window.__tgpSb = true;
  try {
    const sessionCount = Number(sessionStorage.getItem(SESSION_KEY) || 0);
    sessionStorage.setItem(SESSION_KEY, String(sessionCount + 1));
    localStorage.setItem(LAST_KEY, String(now));
  } catch {
    /* storage blocked */
  }
}
