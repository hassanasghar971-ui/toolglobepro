"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useConsent } from "@/lib/consent";
import {
  SOCIAL_BAR_CAP,
  SOCIAL_BAR_SRC,
  canShowSocialBar,
  isAdFreePath,
  recordSocialBarImpression,
} from "@/lib/ads";

/**
 * Loads the Adsterra Social Bar with frequency capping:
 * - max 1 load per session AND at most one per 30 minutes across sessions
 * - only after consent (EU) / no opt-out (elsewhere), and never on legal/contact pages
 * - only after a user interaction + minimum dwell time (fallback timer if none)
 */
export default function AdsterraSocialBar() {
  const { adsAllowed } = useConsent();
  const pathname = usePathname();

  useEffect(() => {
    if (!SOCIAL_BAR_SRC || !adsAllowed || isAdFreePath(pathname)) return;
    if (!canShowSocialBar()) return;

    const src = SOCIAL_BAR_SRC;
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    const started = performance.now();
    let loaded = false;
    let timers: number[] = [];

    const detach = () => events.forEach((e) => window.removeEventListener(e, onInteract));

    const load = () => {
      if (loaded) return;
      loaded = true;
      detach();
      if (!canShowSocialBar()) return; // re-check: another tab may have shown it meanwhile

      recordSocialBarImpression();
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.setAttribute("data-cfasync", "false");
      s.dataset.tgp = "social-bar";
      document.body.appendChild(s);
      window.__tgpAdsLoaded = true;
    };

    function onInteract() {
      detach();
      const wait = Math.max(0, SOCIAL_BAR_CAP.minDwellMs - (performance.now() - started));
      timers.push(window.setTimeout(load, wait));
    }

    events.forEach((e) => window.addEventListener(e, onInteract, { passive: true, once: true }));
    timers.push(window.setTimeout(load, SOCIAL_BAR_CAP.fallbackDelayMs));

    return () => {
      detach();
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];
    };
  }, [adsAllowed, pathname]);

  return null;
}
