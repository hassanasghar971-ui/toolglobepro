"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useConsent, type Consent } from "@/lib/consent";

const OPEN_EVENT = "tgp:privacy-open";

export function openPrivacyChoices() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/** Footer / policy-page trigger that reopens the consent panel (CCPA "Do Not Sell or Share" link). */
export function PrivacyChoicesButton({
  className = "",
  label = "Your Privacy Choices",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <button type="button" onClick={openPrivacyChoices} className={className}>
      {label}
    </button>
  );
}

export default function ConsentBanner() {
  const { consent, region, gpc, ready, setConsent } = useConsent();
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    const open = () => setPanelOpen(true);
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  const isEu = region === "eu";
  const show = ready && (panelOpen || (isEu && consent === "unknown"));

  if (!show) return null;

  function choose(value: Consent) {
    setConsent(value);
    setPanelOpen(false);
    // Third-party scripts can't be cleanly unloaded, so reload to guarantee they stop.
    if (value === "denied" && window.__tgpAdsLoaded) window.location.reload();
  }

  const statusText =
    consent === "granted"
      ? "Current choice: ads allowed."
      : consent === "denied"
      ? "Current choice: ads limited / opted out."
      : "No choice saved yet.";

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      className="animate-fade-in fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:bottom-5 dark:border-slate-700 dark:bg-slate-900"
    >
      <h2 id="consent-title" className="text-base font-bold text-slate-900 dark:text-white">
        {isEu ? "Your privacy choices" : "Do Not Sell or Share My Personal Information"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
        {isEu
          ? "ToolGlobe Pro is free thanks to advertising. Our ad partner (Adsterra) may use cookies and similar technologies. We only load ads if you agree. Your text and files are never uploaded either way."
          : "We show ads from Adsterra to keep the tools free. You can opt out of the sale or sharing of your personal information at any time. We also honour the Global Privacy Control signal."}{" "}
        <Link href="/privacy-policy" className="font-medium text-brand-700 underline dark:text-brand-300">
          Privacy Policy
        </Link>
      </p>
      {panelOpen && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {statusText} {gpc && !isEu ? " A Global Privacy Control signal was detected and is being honoured." : ""}
        </p>
      )}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {isEu ? (
          <>
            <button type="button" className="btn-secondary flex-1" onClick={() => choose("denied")}>
              Reject
            </button>
            <button type="button" className="btn-primary flex-1" onClick={() => choose("granted")}>
              Accept
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn-secondary flex-1" onClick={() => choose("denied")}>
              Opt out
            </button>
            <button type="button" className="btn-primary flex-1" onClick={() => choose("granted")}>
              Allow ads
            </button>
          </>
        )}
        {panelOpen && (
          <button type="button" className="btn-ghost" onClick={() => setPanelOpen(false)}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}
