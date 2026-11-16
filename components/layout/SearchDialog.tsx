"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { searchEntries, type SearchEntry } from "@/lib/search";

export default function SearchDialog({ entries }: { entries: SearchEntry[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => searchEntries(entries, query, 8), [entries, query]);
  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));

  const openDialog = useCallback(() => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
  }, []);

  const closeDialog = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openDialog();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openDialog]);

  function go(slug: string) {
    closeDialog();
    router.push(`/tools/${slug}`);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(activeIndex + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      go(results[activeIndex].slug);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="btn-secondary h-10 gap-2 px-3 text-slate-500 dark:text-slate-400"
        aria-label="Search tools"
        aria-haspopup="dialog"
      >
        <Icon name="search" size={18} />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded border border-slate-300 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 md:inline dark:border-slate-600 dark:text-slate-400">
          Ctrl K
        </kbd>
      </button>
      <dialog
        ref={dialogRef}
        aria-label="Search tools"
        onClose={() => {
          setQuery("");
          setActive(0);
        }}
        onClick={(e) => {
          if (e.target === dialogRef.current) closeDialog();
        }}
        className="mx-auto mt-[12vh] w-[min(92vw,640px)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-700">
          <Icon name="search" size={20} className="text-slate-400" />
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKey}
            placeholder="Search tools, e.g. “json” or “password”"
            aria-label="Search tools"
            className="h-14 w-full bg-transparent text-base outline-none placeholder:text-slate-400"
          />
          <button type="button" onClick={closeDialog} className="btn-ghost size-9 px-0" aria-label="Close search">
            <Icon name="x" size={18} />
          </button>
        </div>
        <ul role="listbox" aria-label="Search results" className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No tools match “{query}”. Try a different word.
            </li>
          )}
          {results.map((r, i) => (
            <li key={r.slug} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                onClick={() => go(r.slug)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                  i === activeIndex ? "bg-brand-50 dark:bg-brand-950" : ""
                }`}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-brand-600 dark:bg-slate-800 dark:text-brand-300">
                  <Icon name={r.icon} size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{r.name}</span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                    {r.categoryName} · {r.tagline}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </dialog>
    </>
  );
}
