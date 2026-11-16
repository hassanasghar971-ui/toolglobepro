import { useCallback, useSyncExternalStore } from "react";

export type Region = "eu" | "us-ca" | "us" | "other";
export type Consent = "granted" | "denied" | "unknown";

const STORAGE_KEY = "tgp:consent:v1";
const CHANGE_EVENT = "tgp:consent-change";

let memoryConsent: Consent = "unknown";

function readConsent(): Consent {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : "unknown";
  } catch {
    return memoryConsent;
  }
}

function writeConsent(value: Consent): void {
  memoryConsent = value;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribeConsent(cb: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

const subscribeNone = () => () => {};

export function detectRegion(): Region {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (
      tz.startsWith("Europe/") ||
      [
        "Atlantic/Reykjavik",
        "Atlantic/Madeira",
        "Atlantic/Canary",
        "Atlantic/Azores",
        "Atlantic/Faroe",
      ].includes(tz)
    ) {
      return "eu";
    }
    if (tz === "America/Los_Angeles") return "us-ca";
    if (tz.startsWith("America/") || tz.startsWith("US/")) return "us";
  } catch {
    /* fall through */
  }
  return "other";
}

function readGpc(): boolean {
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

export function computeAdsAllowed(region: Region, consent: Consent, gpc: boolean): boolean {
  if (region === "eu") return consent === "granted";
  if ((region === "us" || region === "us-ca") && gpc) return false;
  return consent !== "denied";
}

export function useConsent() {
  const consent = useSyncExternalStore<Consent>(subscribeConsent, readConsent, () => "unknown");
  const region = useSyncExternalStore<Region>(subscribeNone, detectRegion, () => "other");
  const gpc = useSyncExternalStore(subscribeNone, readGpc, () => false);
  const ready = useSyncExternalStore(subscribeNone, () => true, () => false);

  const setConsent = useCallback((value: Consent) => writeConsent(value), []);
  const adsAllowed = ready && computeAdsAllowed(region, consent, gpc);

  return { consent, region, gpc, ready, adsAllowed, setConsent };
}
