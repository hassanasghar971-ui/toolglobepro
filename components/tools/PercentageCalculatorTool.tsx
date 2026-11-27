"use client";

import { useEffect, useRef, useState } from "react";
import {
  DIGIT_CHOICES,
  DIRECTIONS,
  EMPTY_RESULT,
  PERCENT_MODES,
  QUICK_PERCENTS,
  calculate,
  formatNumber,
  getMode,
  parseNumber,
} from "@/lib/percentage-calculator-engine";

export function PercentageCalculatorTool() {
  const [modeId, setModeId] = useState("of");
  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");
  const [direction, setDirection] = useState("increase");
  const [digits, setDigits] = useState(2);
  const [copyNote, setCopyNote] = useState("");
  const timer = useRef(0);

  useEffect(() => {
    return () => {
      window.clearTimeout(timer.current);
    };
  }, []);

  const mode = getMode(modeId);
  const numA = parseNumber(textA);
  const numB = parseNumber(textB);
  const ready = !Number.isNaN(numA) && !Number.isNaN(numB);
  const result = ready
    ? calculate(modeId, numA, numB, direction, digits)
    : EMPTY_RESULT;
  const badA = textA.trim() !== "" && Number.isNaN(numA);
  const badB = textB.trim() !== "" && Number.isNaN(numB);
  const showQuick = modeId === "of" && !Number.isNaN(numB);

  function loadExample() {
    setTextA(mode.placeholderA);
    setTextB(mode.placeholderB);
  }

  function clearAll() {
    setTextA("");
    setTextB("");
    setCopyNote("");
  }

  function swapValues() {
    setTextA(textB);
    setTextB(textA);
  }

  async function copyResult() {
    if (!result.ok) {
      return;
    }
    try {
      await navigator.clipboard.writeText(result.display);
      setCopyNote("Copied");
    } catch {
      setCopyNote("Copy failed. Select the number and copy it manually.");
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopyNote(""), 2200);
  }

  return (
    <div className="space-y-6">
      <section className="card p-5 sm:p-6" aria-label="Percentage calculator">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Calculation type">
          {PERCENT_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={m.id === modeId ? "btn-primary" : "btn-secondary"}
              aria-pressed={m.id === modeId}
              onClick={() => setModeId(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <p className="mt-5 text-lg font-semibold">{mode.prompt}</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pc-a" className="mb-1 block text-sm font-medium">
              {mode.labelA}
            </label>
            <input
              id="pc-a"
              className="input w-full"
              inputMode="decimal"
              autoComplete="off"
              placeholder={mode.placeholderA}
              value={textA}
              onChange={(e) => setTextA(e.target.value)}
              aria-invalid={badA}
            />
            {badA ? (
              <p className="mt-1 text-sm text-red-600">Enter a valid number.</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="pc-b" className="mb-1 block text-sm font-medium">
              {mode.labelB}
            </label>
            <input
              id="pc-b"
              className="input w-full"
              inputMode="decimal"
              autoComplete="off"
              placeholder={mode.placeholderB}
              value={textB}
              onChange={(e) => setTextB(e.target.value)}
              aria-invalid={badB}
            />
            {badB ? (
              <p className="mt-1 text-sm text-red-600">Enter a valid number.</p>
            ) : null}
          </div>
        </div>

        {modeId === "adjust" ? (
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Direction">
            {DIRECTIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                className={d.id === direction ? "btn-primary" : "btn-secondary"}
                aria-pressed={d.id === direction}
                onClick={() => setDirection(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="pc-digits" className="text-sm font-medium">
            Decimal places
          </label>
          <select
            id="pc-digits"
            className="input w-24"
            value={digits}
            onChange={(e) => setDigits(Number(e.target.value))}
          >
            {DIGIT_CHOICES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <button type="button" className="btn-secondary" onClick={loadExample}>
            Try an example
          </button>
          <button type="button" className="btn-secondary" onClick={swapValues}>
            Swap X and Y
          </button>
          <button type="button" className="btn-ghost" onClick={clearAll}>
            Clear
          </button>
        </div>
      </section>

      <section className="card p-5 sm:p-6" aria-live="polite">
        {result.ok ? (
          <div>
            <p className="text-sm font-medium opacity-70">Result</p>
            <p className="mt-1 break-words text-4xl font-bold tracking-tight">
              {result.display}
            </p>
            <p className="mt-2">{result.headline}</p>
            <p className="mt-3 text-sm opacity-70">Formula: {result.formula}</p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
              {result.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            {result.note !== "" ? (
              <p className="mt-3 text-sm opacity-80">{result.note}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" className="btn-primary" onClick={copyResult}>
                Copy result
              </button>
              {copyNote !== "" ? (
                <span className="text-sm opacity-80">{copyNote}</span>
              ) : null}
            </div>
          </div>
        ) : result.message !== "" ? (
          <p role="alert" className="text-sm text-red-600">
            {result.message}
          </p>
        ) : (
          <p className="text-sm opacity-70">
            Enter both numbers to see the answer, or press Try an example.
          </p>
        )}
      </section>

      {showQuick ? (
        <section className="card p-5 sm:p-6">
          <h3 className="text-base font-semibold">
            Common percentages of {formatNumber(numB, 8)}
          </h3>
          <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {QUICK_PERCENTS.map((p) => (
              <div
                key={p}
                className="rounded-lg border border-black/10 p-2 text-sm dark:border-white/10"
              >
                <dt className="opacity-70">{p}%</dt>
                <dd className="font-semibold">
                  {formatNumber((numB * p) / 100, digits)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  );
}

export default PercentageCalculatorTool;
