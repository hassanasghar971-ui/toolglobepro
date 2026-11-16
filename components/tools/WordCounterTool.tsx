"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";

export default function WordCounterTool() {
  const [text, setText] = useState("");
  const deferredText = useDeferredValue(text);

  const stats = useMemo(() => {
    const trimmed = deferredText.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = deferredText.length;
    const charsNoSpace = deferredText.replace(/\s/g, "").length;
    const sentences = trimmed ? (deferredText.match(/[.!?]+/g) || []).length : 0;
    const paragraphs = trimmed ? deferredText.split(/\n+/).filter(Boolean).length : 0;
    return { words, chars, charsNoSpace, sentences, paragraphs };
  }, [deferredText]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Type or paste your text below to count words and characters instantly.
        </p>
        <button
          type="button"
          className="btn-secondary text-xs"
          onClick={() => setText("")}
          disabled={!text}
        >
          <Icon name="trash" size={14} /> Clear
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type or paste your content here..."
        className="input min-h-[220px] font-mono text-sm leading-relaxed"
        rows={8}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Words</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{stats.words}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Characters</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{stats.chars}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Without Spaces</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{stats.charsNoSpace}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Paragraphs</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{stats.paragraphs}</p>
        </div>
      </div>
    </div>
  );
}
