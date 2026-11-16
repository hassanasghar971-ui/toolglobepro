"use client";

import { useEffect, useRef } from "react";
import { useConsent } from "@/lib/consent";
import type { NativeUnit } from "@/lib/ads";

export default function AdsterraNativeBanner({
  unit,
  className = "",
}: {
  unit: NativeUnit;
  className?: string;
}) {
  const { adsAllowed } = useConsent();
  const hostRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!adsAllowed) return;
    const host = hostRef.current;
    const container = containerRef.current;
    if (!host || !container) return;

    let script: HTMLScriptElement | null = null;
    let observer: IntersectionObserver | undefined;

    const inject = () => {
      if (script) return;
      script = document.createElement("script");
      script.async = true;
      script.setAttribute("data-cfasync", "false");
      script.src = unit.src;
      host.appendChild(script);
      window.__tgpAdsLoaded = true;
    };

    // Lazy-load when the slot approaches the viewport to protect Core Web Vitals.
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            inject();
            observer?.disconnect();
          }
        },
        { rootMargin: "300px" },
      );
      observer.observe(host);
    } else {
      inject();
    }

    return () => {
      observer?.disconnect();
      script?.remove();
      container.replaceChildren();
    };
  }, [adsAllowed, unit.src]);

  if (!adsAllowed) return null;

  return (
    <aside ref={hostRef} aria-label="Advertisement" className={`mx-auto w-full max-w-5xl ${className}`}>
      <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-widest text-slate-400">
        Advertisement
      </p>
      <div ref={containerRef} id={unit.containerId} className="min-h-[100px]" />
    </aside>
  );
}
