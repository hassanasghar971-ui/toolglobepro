"use client";

import { useMemo, useState } from "react";
import {
  buttonClass,
  cardClass,
  textareaClass,
  useCopy,
} from "@/components/tools/shared";

export function WordCounterTool() {
  const [text, setText] = useState("");
  const { copied, copy } = useCopy();

  const stats = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s/g, "").length;
    const sentences = trimmed ? trimmed.split(/[.!?]+/).filter(Boolean).length : 0;
    const paragraphs = trimmed ? trimmed.split(/\n+/).filter(Boolean).length : 0;
    const readingTimeMinutes = Math.ceil(words / 225);

    return {
      words,
      chars,
      charsNoSpaces,
      sentences,
      paragraphs,
      readingTimeMinutes,
    };
  }, [text]);

  return (
    <div className="space-y-6">
      <section className={cardClass} aria-label="Word counter input">
        <div className="mb-2 flex items-center justify-between gap-2">
          <label htmlFor="word-input" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Text to analyze
          </label>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {stats.chars.toLocaleString()} characters
          </span>
        </div>
        <textarea
          id="word-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type or paste your text here..."
          className={`${textareaClass} h-48 resize-y`}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass}
            onClick={() => setText("")}
            disabled={!text}
          >
            Clear
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => void copy(text)}
            disabled={!text}
          >
            {copied ? "Copied!" : "Copy text"}
          </button>
        </div>
      </section>

      <section className={`${cardClass} space-y-4`} aria-label="Statistics results">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Statistics</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-950">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.words.toLocaleString()}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Words</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-950">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.chars.toLocaleString()}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Characters</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-950">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.charsNoSpaces.toLocaleString()}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Chars (no spaces)</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-950">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.sentences.toLocaleString()}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Sentences</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-950">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.paragraphs.toLocaleString()}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Paragraphs</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-950">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">~{stats.readingTimeMinutes} min</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Reading time</div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default WordCounterTool;
