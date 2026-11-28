"use client";

import { useEffect, useState } from "react";
import {
  NOT_SUPPORTED,
  SUPPORTED,
  collectGroups,
  collectScreenGroup,
  findValue,
  readStorageGroup,
  toJson,
  toText,
} from "@/lib/browser-info-engine";
import type { InfoGroup } from "@/lib/browser-info-engine";

const GLANCE = ["Browser", "Operating system", "Device type", "Screen size", "Language", "Time zone"] as const;

function valueClass(value: string): string {
  if (value === SUPPORTED) return "font-medium text-emerald-600 dark:text-emerald-400";
  if (value === NOT_SUPPORTED) return "font-medium text-slate-500 dark:text-slate-400";
  return "text-slate-900 dark:text-white";
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function BrowserInfoTool() {
  const [groups, setGroups] = useState<InfoGroup[]>([]);
  const [notice, setNotice] = useState<string>("");
  const [round, setRound] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    setGroups(collectGroups());
    void readStorageGroup().then((g) => {
      if (cancelled) return;
      setGroups((prev) => prev.filter((x) => x.id !== g.id).concat([g]));
    });
    const onResize = () => {
      setGroups((prev) => prev.map((x) => (x.id === "screen" ? collectScreenGroup() : x)));
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
    };
  }, [round]);

  async function copyValue(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(message);
    } catch {
      setNotice("Copy failed. Select the text and copy it manually.");
    }
    window.setTimeout(() => setNotice(""), 2200);
  }

  if (groups.length === 0) {
    return (
      <div className="card p-6" role="status">
        <p className="text-sm text-slate-600 dark:text-slate-400">Reading your browser...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Your browser at a glance</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GLANCE.map((label) => (
            <div key={label} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <div className="text-xs text-slate-600 dark:text-slate-400">{label}</div>
              <div className="mt-1 break-words text-base font-semibold text-slate-900 dark:text-white">
                {findValue(groups, label)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primary" onClick={() => void copyValue(toText(groups), "Copied as text")}>
            Copy as text
          </button>
          <button type="button" className="btn-secondary" onClick={() => void copyValue(toJson(groups), "Copied as JSON")}>
            Copy as JSON
          </button>
          <button type="button" className="btn-secondary" onClick={() => downloadText(toJson(groups), "browser-info.json")}>
            Download JSON
          </button>
          <button type="button" className="btn-ghost" onClick={() => setRound((r) => r + 1)}>
            Refresh
          </button>
          {notice ? <span className="text-sm text-slate-600 dark:text-slate-400">{notice}</span> : null}
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          This is what any website can read from your browser. It is gathered on your device and nothing is sent to a
          server. Privacy settings, extensions and some browsers hide or round certain values.
        </p>
      </div>

      {groups.map((g) => (
        <div key={g.id} className="card p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{g.title}</h2>
          <dl className="mt-3">
            {g.rows.map((row) => (
              <div
                key={row.label}
                className="flex flex-col gap-1 border-t border-slate-100 py-2 text-sm first:border-t-0 sm:flex-row sm:justify-between sm:gap-6 dark:border-slate-800"
              >
                <dt className="text-slate-600 dark:text-slate-400">{row.label}</dt>
                <dd className={"break-all sm:max-w-[60%] sm:text-right " + valueClass(row.value)}>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

export default BrowserInfoTool;
