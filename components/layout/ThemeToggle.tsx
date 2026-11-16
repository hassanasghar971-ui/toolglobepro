"use client";

import { useSyncExternalStore } from "react";
import Icon from "@/components/ui/Icon";

const EVENT = "tgp:theme-change";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

const getSnapshot = () => document.documentElement.classList.contains("dark");
const getServerSnapshot = () => false;

export default function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("tgp-theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn-ghost size-10 px-0"
      aria-label="Toggle light and dark theme"
      title="Toggle theme"
    >
      <Icon name={isDark ? "sun" : "moon"} size={20} />
    </button>
  );
}
