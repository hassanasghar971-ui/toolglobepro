"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";

interface IpData {
  ip: string;
  city?: string;
  region?: string;
  country_name?: string;
  org?: string;
  timezone?: string;
}

export function IpLookupTool() {
  const [data, setData] = useState<IpData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchIp() {
      try {
        setLoading(true);
        const res = await fetch("https://ipapi.co/json/");
        if (!res.ok) throw new Error("Failed to fetch IP details");
        const json = await res.json();
        setData(json);
      } catch {
        setError("Could not retrieve IP information. Please check your network connection.");
      } finally {
        setLoading(false);
      }
    }
    void fetchIp();
  }, []);

  async function copyIp() {
    if (!data?.ip) return;
    await navigator.clipboard.writeText(data.ip);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Your active public connection details are displayed below:
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <Icon name="refresh" size={16} /> Refresh
        </button>
      </div>

      {loading && (
        <div className="py-16 text-center text-slate-500 dark:text-slate-400">
          Detecting your IP address and location...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 dark:border-indigo-900 dark:bg-indigo-950/30">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your Public IP Address</p>
              <p className="mt-1 text-3xl font-extrabold font-mono text-slate-900 dark:text-white">{data.ip}</p>
            </div>
            <button
              type="button"
              onClick={copyIp}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              <Icon name={copied ? "check" : "copy"} size={16} />
              {copied ? "Copied!" : "Copy IP Address"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">City / Region</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                {data.city || "Unknown"}, {data.region || "Unknown"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Country</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{data.country_name || "Unknown"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Internet Service Provider (ISP)</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{data.org || "Unknown"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Timezone</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{data.timezone || "Unknown"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IpLookupTool;
