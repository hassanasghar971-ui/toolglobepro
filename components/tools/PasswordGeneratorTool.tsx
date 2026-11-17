"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";
const AMBIGUOUS = /[il1Lo0O|]/g;

export function PasswordGeneratorTool() {
  const [password, setPassword] = useState("");
  const [length, setLength] = useState(16);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [noAmbiguous, setNoAmbiguous] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(() => {
    let chars = "";
    if (useUpper) chars += UPPER;
    if (useLower) chars += LOWER;
    if (useNumbers) chars += NUMBERS;
    if (useSymbols) chars += SYMBOLS;

    if (noAmbiguous) {
      chars = chars.replace(AMBIGUOUS, "");
    }

    if (!chars) {
      setPassword("Please select at least one character type.");
      return;
    }

    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
    setPassword(result);
  }, [length, useUpper, useLower, useNumbers, useSymbols, noAmbiguous]);

  useEffect(() => {
    generate();
  }, [generate]);

  async function copyPassword() {
    if (!password || password.startsWith("Please")) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Basic strength score
  let strengthScore = 0;
  if (length >= 12) strengthScore++;
  if (length >= 16) strengthScore++;
  if (useUpper && useLower) strengthScore++;
  if (useNumbers) strengthScore++;
  if (useSymbols) strengthScore++;

  const strengthLabel = strengthScore >= 4 ? "Very Strong" : strengthScore === 3 ? "Strong" : strengthScore === 2 ? "Moderate" : "Weak";
  const strengthColor = strengthScore >= 4 ? "bg-emerald-500" : strengthScore === 3 ? "bg-indigo-500" : strengthScore === 2 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 dark:border-indigo-900 dark:bg-indigo-950/30">
        <div className="w-full truncate">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Generated Password</p>
          <p className="mt-1 text-2xl sm:text-3xl font-extrabold font-mono tracking-wider text-slate-900 break-all dark:text-white">
            {password}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={generate}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            title="Generate new"
          >
            <Icon name="refresh" size={16} />
          </button>
          <button
            type="button"
            onClick={copyPassword}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            <Icon name={copied ? "check" : "copy"} size={16} />
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm font-medium">
          <span className="text-slate-700 dark:text-slate-300">Strength: <strong className="text-slate-900 dark:text-white">{strengthLabel}</strong></span>
          <span className="text-slate-500">{length} characters</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className={`h-full transition-all ${strengthColor}`} style={{ width: `${(strengthScore / 5) * 100}%` }} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex justify-between text-sm font-medium mb-2">
            <label htmlFor="password-length" className="text-slate-700 dark:text-slate-300">Password Length</label>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{length}</span>
          </div>
          <input
            id="password-length"
            type="range"
            min={8}
            max={64}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" checked={useUpper} onChange={(e) => setUseUpper(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            Uppercase Letters (A-Z)
          </label>
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" checked={useLower} onChange={(e) => setUseLower(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            Lowercase Letters (a-z)
          </label>
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" checked={useNumbers} onChange={(e) => setUseNumbers(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            Numbers (0-9)
          </label>
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" checked={useSymbols} onChange={(e) => setUseSymbols(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            Symbols (!@#$...)
          </label>
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer sm:col-span-2">
            <input type="checkbox" checked={noAmbiguous} onChange={(e) => setNoAmbiguous(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            Exclude Ambiguous Characters (i, l, 1, L, o, 0, O)
          </label>
        </div>
      </div>
    </div>
  );
}

export default PasswordGeneratorTool;
