"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  UNIT_CATEGORIES,
  convertValue,
  formatNumber,
  getUnitCategory,
  parseQuantity,
  type UnitCategoryId,
} from "@/lib/tools/unit-core";

const SIGNIFICANT_OPTIONS = [4, 6, 8, 10, 12, 15];

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy method
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

function tabClass(active: boolean): string {
  return `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
    active
      ? "bg-brand-600 text-white"
      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
  }`;
}

export default function UnitConverterTool() {
  const [categoryId, setCategoryId] = useState<UnitCategoryId>("length");
  const [input, setInput] = useState("1");
  const [fromId, setFromId] = useState(() => getUnitCategory("length").defaultFrom);
  const [toId, setToId] = useState(() => getUnitCategory("length").defaultTo);
  const [significant, setSignificant] = useState(10);
  const [group, setGroup] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const category = getUnitCategory(categoryId);
  const fromUnit = category.units.find((u) => u.id === fromId) ?? category.units[0];
  const toUnit =
    category.units.find((u) => u.id === toId) ?? category.units[1] ?? category.units[0];

  const parsed = useMemo(() => parseQuantity(input), [input]);
  const hasInput = input.trim() !== "";

  const result = useMemo(
    () => (parsed === null ? null : convertValue(fromUnit, toUnit, parsed)),
    [parsed, fromUnit, toUnit],
  );

  const rows = useMemo(
    () =>
      category.units.map((unit) => ({
        unit,
        value: parsed === null ? null : convertValue(fromUnit, unit, parsed),
      })),
    [category, fromUnit, parsed],
  );

  const oneUnitHint = useMemo(() => {
    if (category.nonLinear) return null;
    const value = convertValue(fromUnit, toUnit, 1);
    return `1 ${fromUnit.symbol} = ${formatNumber(value, significant, group)} ${toUnit.symbol}`;
  }, [category, fromUnit, toUnit, significant, group]);

  const belowAbsoluteZero =
    category.id === "temperature" &&
    parsed !== null &&
    fromUnit.toBase(parsed) < -273.15 - 1e-9;

  const copy = useCallback(async (key: string, text: string) => {
    const ok = await copyText(text);
    if (!ok) return;
    setCopiedKey(key);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopiedKey(null), 1500);
  }, []);

  const selectCategory = (id: UnitCategoryId) => {
    const next = getUnitCategory(id);
    setCategoryId(next.id);
    setFromId(next.defaultFrom);
    setToId(next.defaultTo);
  };

  const swap = () => {
    setFromId(toUnit.id);
    setToId(fromUnit.id);
  };

  const expression =
    parsed !== null && result !== null
      ? `${formatNumber(parsed, significant, group)} ${fromUnit.symbol} = ${formatNumber(result, significant, group)} ${toUnit.symbol}`
      : "";

  return (
    <div className="space-y-6">
      <section className="card space-y-5 p-5" aria-label="Unit converter">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Measurement category">
          {UNIT_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={c.id === categoryId}
              onClick={() => selectCategory(c.id)}
              className={tabClass(c.id === categoryId)}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="uc-value" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Value
          </label>
          <input
            id="uc-value"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="e.g. 12.5, 1e6, 3/8 or 2 1/2"
            className="input mt-2 w-full text-lg"
            aria-invalid={hasInput && parsed === null}
          />
          {hasInput && parsed === null && (
            <p className="mt-1 text-sm text-red-700 dark:text-red-300" role="alert">
              That isn&apos;t a number I can read. Try 12.5, 1,234.5, 1e6, 3/8 or 2 1/2.
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <div>
            <label htmlFor="uc-from" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              From
            </label>
            <select
              id="uc-from"
              className="input mt-2 w-full"
              value={fromUnit.id}
              onChange={(event) => setFromId(event.target.value)}
            >
              {category.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label} ({unit.symbol})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn-secondary justify-self-center"
            onClick={swap}
            aria-label="Swap the from and to units"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M7 4 3 8l4 4" />
              <path d="M3 8h14" />
              <path d="m17 20 4-4-4-4" />
              <path d="M21 16H7" />
            </svg>
            <span className="ml-2">Swap</span>
          </button>

          <div>
            <label htmlFor="uc-to" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              To
            </label>
            <select
              id="uc-to"
              className="input mt-2 w-full"
              value={toUnit.id}
              onChange={(event) => setToId(event.target.value)}
            >
              {category.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label} ({unit.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          className="rounded-xl bg-brand-50 p-4 dark:bg-brand-950"
          aria-live="polite"
        >
          {parsed !== null && result !== null ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-xl font-semibold text-slate-900 sm:text-2xl dark:text-slate-100">
                  {expression}
                </p>
                {oneUnitHint && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{oneUnitHint}</p>
                )}
                {!Number.isFinite(result) && (
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                    This value can&apos;t be converted (for example, zero fuel economy).
                  </p>
                )}
                {belowAbsoluteZero && (
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                    That temperature is below absolute zero, which is physically impossible.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void copy("value", formatNumber(result, significant, false))}
                  disabled={!Number.isFinite(result)}
                >
                  {copiedKey === "value" ? "Copied" : "Copy value"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => void copy("expression", expression)}
                  disabled={!Number.isFinite(result)}
                >
                  {copiedKey === "expression" ? "Copied" : "Copy sentence"}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Enter a number above to see the result.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="uc-sig" className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Significant digits
            </label>
            <select
              id="uc-sig"
              className="input"
              value={significant}
              onChange={(event) => setSignificant(Number(event.target.value))}
            >
              {SIGNIFICANT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-900 dark:text-slate-100">
            <input
              type="checkbox"
              checked={group}
              onChange={(event) => setGroup(event.target.checked)}
              className="h-4 w-4 accent-brand-600"
            />
            Group digits (1,234,567)
          </label>
        </div>
      </section>

      <section className="card p-5" aria-label={`${category.name} in every unit`}>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {parsed !== null
            ? `${formatNumber(parsed, significant, group)} ${fromUnit.symbol} in every ${category.name.toLowerCase()} unit`
            : `All ${category.name.toLowerCase()} units`}
        </h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Select a row to use it as the target unit.
        </p>
        <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
          {rows.map(({ unit, value }) => {
            const active = unit.id === toUnit.id;
            const display = value === null ? "—" : formatNumber(value, significant, group);
            return (
              <li key={unit.id} className="flex items-center gap-2 py-2">
                <button
                  type="button"
                  onClick={() => setToId(unit.id)}
                  aria-pressed={active}
                  className={`flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    active
                      ? "bg-brand-50 dark:bg-brand-950"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <span className="min-w-0 truncate text-slate-700 dark:text-slate-300">
                    {unit.label} <span className="text-slate-500 dark:text-slate-500">({unit.symbol})</span>
                  </span>
                  <span className="shrink-0 break-all font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {display}
                  </span>
                </button>
                <button
                  type="button"
                  className="btn-ghost shrink-0"
                  disabled={value === null || !Number.isFinite(value)}
                  onClick={() =>
                    value !== null && void copy(`row-${unit.id}`, formatNumber(value, significant, false))
                  }
                  aria-label={`Copy ${unit.label} value`}
                >
                  {copiedKey === `row-${unit.id}` ? "Copied" : "Copy"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        Everything is calculated in your browser. Nothing you type is uploaded.
      </p>
    </div>
  );
}
