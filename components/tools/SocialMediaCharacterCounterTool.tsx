"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_TARGET,
  PLATFORM_NAMES,
  TARGETS,
  analyze,
  formatNumber,
  levelFor,
  trimToLimit,
  usedFor,
} from "@/lib/social-counter-engine";

const MAX_INPUT = 300000;

const LEVEL_TEXT: Record<string, string> = {
  ok: "Within the limit",
  near: "Almost full",
  over: "Over the limit",
};

const LEVEL_BAR: Record<string, string> = {
  ok: "bg-emerald-500",
  near: "bg-amber-500",
  over: "bg-red-500",
};

const LEVEL_SHORT: Record<string, string> = {
  ok: "OK",
  near: "Near",
  over: "Over",
};

export function SocialMediaCharacterCounterTool() {
  const [text, setText] = useState("");
  const [targetId, setTargetId] = useState(DEFAULT_TARGET.id);
  const [notice, setNotice] = useState("");
  const timer = useRef(0);

  useEffect(() => {
    return () => window.clearTimeout(timer.current);
  }, []);

  const flash = (message: string) => {
    setNotice(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(""), 2500);
  };

  const stats = useMemo(() => analyze(text), [text]);
  const target = TARGETS.find((t) => t.id === targetId) ?? DEFAULT_TARGET;
  const used = usedFor(target, text, stats.parts);
  const level = levelFor(used, target.limit);
  const pct = target.limit > 0 ? Math.min(100, (used / target.limit) * 100) : 0;
  const diff = target.limit - used;

  const rows = useMemo(
    () =>
      TARGETS.map((t) => {
        const u = usedFor(t, text, stats.parts);
        return { target: t, used: u, level: levelFor(u, t.limit) };
      }),
    [text, stats.parts],
  );

  const onChange = (value: string) => {
    if (value.length > MAX_INPUT) {
      setText(value.slice(0, MAX_INPUT));
      flash("Input was cut at " + formatNumber(MAX_INPUT) + " characters.");
    } else {
      setText(value);
    }
  };

  const copy = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      flash(message);
    } catch {
      flash("Copy failed. Select the text and copy it by hand.");
    }
  };

  const showFold = target.foldAt > 0 && stats.parts.length > 0;
  const foldBefore = showFold ? stats.parts.slice(0, target.foldAt).join("") : "";
  const foldAfter = showFold ? stats.parts.slice(target.foldAt).join("") : "";
  const tooManyTags = target.hashtagMax > 0 && stats.hashtags > target.hashtagMax;

  const statItems = [
    { label: "Characters", value: stats.chars },
    { label: "Words", value: stats.words },
    { label: "Lines", value: stats.lines },
    { label: "Hashtags", value: stats.hashtags },
    { label: "Mentions", value: stats.mentions },
    { label: "Links", value: stats.links },
  ];

  return (
    <div className="space-y-6">
      <div className="card p-5 sm:p-6">
        <label htmlFor="sm-target" className="text-sm font-semibold text-slate-900 dark:text-white">
          Where will you post?
        </label>
        <select
          id="sm-target"
          className="input mt-2"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        >
          {PLATFORM_NAMES.map((p) => (
            <optgroup key={p} label={p}>
              {TARGETS.filter((t) => t.platform === p).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.platform + " " + t.label + " (" + formatNumber(t.limit) + ")"}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <label htmlFor="sm-text" className="mt-5 block text-sm font-semibold text-slate-900 dark:text-white">
          Your text
        </label>
        <textarea
          id="sm-text"
          className="input mt-2 min-h-48 w-full resize-y"
          rows={8}
          placeholder="Type or paste your caption, post or bio here"
          value={text}
          onChange={(e) => onChange(e.target.value)}
        />

        <div className="mt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
              {formatNumber(used)}
              <span className="text-base font-semibold text-slate-500 dark:text-slate-400">
                {" / " + formatNumber(target.limit)}
              </span>
            </p>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {LEVEL_TEXT[level] ?? ""}
              {": "}
              {diff >= 0 ? formatNumber(diff) + " left" : formatNumber(0 - diff) + " over"}
            </p>
          </div>
          <div
            className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={target.limit}
            aria-valuenow={Math.min(used, target.limit)}
            aria-label={target.platform + " " + target.label + " length"}
          >
            <div
              className={"h-full rounded-full transition-all " + (LEVEL_BAR[level] ?? "")}
              style={{ width: String(pct) + "%" }}
            />
          </div>
          {target.note !== "" && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{target.note}</p>
          )}
          {tooManyTags && (
            <p className="mt-2 text-sm font-semibold text-red-600 dark:text-red-400" role="alert">
              {"You used " +
                String(stats.hashtags) +
                " hashtags. " +
                target.platform +
                " allows up to " +
                String(target.hashtagMax) +
                "."}
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-primary"
            disabled={text === ""}
            onClick={() => void copy(text, "Text copied.")}
          >
            Copy text
          </button>
          {level === "over" && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void copy(trimToLimit(text, target), "Trimmed text copied.")}
            >
              Copy trimmed to fit
            </button>
          )}
          <button type="button" className="btn-ghost" disabled={text === ""} onClick={() => setText("")}>
            Clear
          </button>
        </div>
        <p className="mt-3 min-h-5 text-sm text-slate-600 dark:text-slate-400" aria-live="polite">
          {notice}
        </p>
      </div>

      <div className="card p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Text details</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {statItems.map((s) => (
            <div key={s.label} className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/60">
              <p className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                {formatNumber(s.value)}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {showFold && (
        <div className="card p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Before the more link</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {"Roughly the first " +
              String(target.foldAt) +
              " characters are visible in the feed. The rest is greyed out here."}
          </p>
          <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm text-slate-900 dark:bg-slate-800/60 dark:text-white">
            {foldBefore}
            <span className="text-slate-400 dark:text-slate-500">{foldAfter}</span>
          </p>
        </div>
      )}

      <div className="card p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">All platforms at a glance</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Tap a row to switch the counter to that limit.
        </p>
        <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-700">
          {rows.map((r) => (
            <li key={r.target.id}>
              <button
                type="button"
                aria-current={r.target.id === target.id}
                onClick={() => setTargetId(r.target.id)}
                className="flex w-full items-center justify-between gap-3 px-1 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <span
                  className={
                    r.target.id === target.id
                      ? "font-semibold text-brand-700 dark:text-brand-300"
                      : "text-slate-700 dark:text-slate-300"
                  }
                >
                  {r.target.platform + " " + r.target.label}
                </span>
                <span className="shrink-0 tabular-nums text-slate-600 dark:text-slate-400">
                  {formatNumber(r.used) + " / " + formatNumber(r.target.limit) + "  "}
                  <span className="font-semibold">{LEVEL_SHORT[r.level] ?? ""}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default SocialMediaCharacterCounterTool;
