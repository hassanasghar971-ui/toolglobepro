"use client";

import { useMemo, useState } from "react";
import {
  CURRENCIES,
  EMPTY_RESULT,
  compute,
  formatMoney,
  monthsToText,
  parseNum,
  toCsv,
  validate,
  yearlySummary,
} from "@/lib/emi-engine";

function downloadCsv(csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "loan-schedule.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function EmiCalculatorTool() {
  const [amount, setAmount] = useState<string>("250000");
  const [rateText, setRateText] = useState<string>("7.5");
  const [tenureText, setTenureText] = useState<string>("20");
  const [unit, setUnit] = useState<string>("years");
  const [currency, setCurrency] = useState<string>("USD");
  const [extraText, setExtraText] = useState<string>("");
  const [view, setView] = useState<string>("yearly");
  const [notice, setNotice] = useState<string>("");

  const principal = parseNum(amount);
  const rate = parseNum(rateText);
  const tenure = parseNum(tenureText);
  const extra = extraText.trim() === "" ? 0 : parseNum(extraText);
  const months = unit === "years" ? Math.round(tenure * 12) : Math.round(tenure);
  const error = validate(principal, rate, months, extra);

  const result = useMemo(
    () => (error === "" ? compute(principal, rate, months, extra) : EMPTY_RESULT),
    [error, principal, rate, months, extra],
  );
  const yearly = useMemo(() => yearlySummary(result.rows), [result.rows]);

  const money = (v: number) => formatMoney(v, currency);
  const hasResult = error === "" && result.rows.length > 0;
  const principalPct = hasResult && result.totalPaid > 0 ? (principal / result.totalPaid) * 100 : 0;

  async function copySummary() {
    const text =
      "Loan " +
      money(principal) +
      " at " +
      rateText +
      "% for " +
      monthsToText(months) +
      ". Monthly payment: " +
      money(result.emi) +
      ". Total interest: " +
      money(result.totalInterest) +
      ". Total paid: " +
      money(result.totalPaid) +
      ".";
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Summary copied");
    } catch {
      setNotice("Copy failed. Select the numbers and copy them manually.");
    }
    window.setTimeout(() => setNotice(""), 2200);
  }

  return (
    <div className="space-y-6">
      <div className="card p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="emi-amount" className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Loan amount
            </label>
            <input
              id="emi-amount"
              className="input mt-2 w-full"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="emi-currency" className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Currency
            </label>
            <select
              id="emi-currency"
              className="input mt-2 w-full"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="emi-rate" className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Annual interest rate (%)
            </label>
            <input
              id="emi-rate"
              className="input mt-2 w-full"
              inputMode="decimal"
              value={rateText}
              onChange={(e) => setRateText(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="emi-tenure" className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Loan term
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="emi-tenure"
                className="input w-full"
                inputMode="decimal"
                value={tenureText}
                onChange={(e) => setTenureText(e.target.value)}
              />
              <select
                aria-label="Term unit"
                className="input"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                <option value="years">Years</option>
                <option value="months">Months</option>
              </select>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="emi-extra" className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Extra monthly payment (optional)
            </label>
            <input
              id="emi-extra"
              className="input mt-2 w-full"
              inputMode="decimal"
              placeholder="0"
              value={extraText}
              onChange={(e) => setExtraText(e.target.value)}
            />
          </div>
        </div>

        {error !== "" ? (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {hasResult ? (
        <div className="card p-5 sm:p-6">
          <div className="text-sm text-slate-600 dark:text-slate-400">Monthly payment (EMI)</div>
          <div className="mt-1 text-4xl font-bold tabular-nums text-slate-900 dark:text-white" aria-live="polite">
            {money(result.emi)}
          </div>
          {extra > 0 ? (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              With your extra payment you pay {money(result.emi + extra)} per month.
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{money(principal)}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Loan amount</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{money(result.totalInterest)}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Total interest</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{money(result.totalPaid)}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Total paid</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <div className="text-lg font-bold text-slate-900 dark:text-white">{monthsToText(result.payoffMonths)}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Time to pay off</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full bg-emerald-500" style={{ width: principalPct + "%" }} />
              <div className="h-full bg-rose-500" style={{ width: 100 - principalPct + "%" }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Principal {principalPct.toFixed(1)}%</span>
              <span>Interest {(100 - principalPct).toFixed(1)}%</span>
            </div>
          </div>

          {extra > 0 ? (
            <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
              Your extra payment saves about {money(result.interestSaved)} in interest and shortens the loan by{" "}
              {monthsToText(result.monthsSaved)}.
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" className="btn-primary" onClick={() => void copySummary()}>
              Copy summary
            </button>
            <button type="button" className="btn-secondary" onClick={() => downloadCsv(toCsv(result.rows))}>
              Download schedule (CSV)
            </button>
            {notice ? <span className="text-sm text-slate-600 dark:text-slate-400">{notice}</span> : null}
          </div>
        </div>
      ) : null}

      {hasResult ? (
        <div className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Payment schedule</h2>
            <div className="flex gap-2">
              <button
                type="button"
                className={"chip" + (view === "yearly" ? " ring-2 ring-slate-900 dark:ring-white" : "")}
                onClick={() => setView("yearly")}
              >
                By year
              </button>
              <button
                type="button"
                className={"chip" + (view === "monthly" ? " ring-2 ring-slate-900 dark:ring-white" : "")}
                onClick={() => setView("monthly")}
              >
                By month
              </button>
            </div>
          </div>

          <div className="mt-3 max-h-96 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[520px] text-right text-sm tabular-nums">
              <thead className="bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{view === "yearly" ? "Year" : "Month"}</th>
                  <th className="px-3 py-2 font-medium">Payment</th>
                  <th className="px-3 py-2 font-medium">Principal</th>
                  <th className="px-3 py-2 font-medium">Interest</th>
                  <th className="px-3 py-2 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="text-slate-800 dark:text-slate-200">
                {view === "yearly"
                  ? yearly.map((row) => (
                      <tr key={row.year} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-2 text-left">{row.year}</td>
                        <td className="px-3 py-2">{money(row.payment)}</td>
                        <td className="px-3 py-2">{money(row.principal)}</td>
                        <td className="px-3 py-2">{money(row.interest)}</td>
                        <td className="px-3 py-2">{money(row.balance)}</td>
                      </tr>
                    ))
                  : result.rows.map((row) => (
                      <tr key={row.month} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-2 text-left">{row.month}</td>
                        <td className="px-3 py-2">{money(row.payment)}</td>
                        <td className="px-3 py-2">{money(row.principal)}</td>
                        <td className="px-3 py-2">{money(row.interest)}</td>
                        <td className="px-3 py-2">{money(row.balance)}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Assumes a fixed rate, monthly payments at the end of each month and no fees. Your lender&apos;s figures may differ slightly.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default EmiCalculatorTool;
