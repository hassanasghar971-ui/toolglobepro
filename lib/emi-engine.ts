export interface ScheduleRow {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

export interface YearRow {
  year: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

export interface LoanResult {
  emi: number;
  rows: ScheduleRow[];
  baseRows: ScheduleRow[];
  totalInterest: number;
  totalPaid: number;
  payoffMonths: number;
  baseInterest: number;
  interestSaved: number;
  monthsSaved: number;
}

export interface CurrencyOption {
  code: string;
  name: string;
}

export const MAX_MONTHS = 600;
export const MAX_AMOUNT = 10000000000;

export const CURRENCIES: readonly CurrencyOption[] = [
  { code: "USD", name: "US dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British pound" },
  { code: "CAD", name: "Canadian dollar" },
  { code: "AUD", name: "Australian dollar" },
  { code: "INR", name: "Indian rupee" },
  { code: "PKR", name: "Pakistani rupee" },
  { code: "AED", name: "UAE dirham" },
  { code: "SAR", name: "Saudi riyal" },
];

export const EMPTY_RESULT: LoanResult = {
  emi: 0,
  rows: [],
  baseRows: [],
  totalInterest: 0,
  totalPaid: 0,
  payoffMonths: 0,
  baseInterest: 0,
  interestSaved: 0,
  monthsSaved: 0,
};

export function parseNum(text: string): number {
  const cleaned = text.replace(/[,\s]/g, "");
  if (cleaned === "") return Number.NaN;
  return Number(cleaned);
}

export function validate(principal: number, rate: number, months: number, extra: number): string {
  if (!Number.isFinite(principal)) return "Enter a loan amount.";
  if (principal <= 0) return "The loan amount must be greater than 0.";
  if (principal > MAX_AMOUNT) return "The loan amount is too large.";
  if (!Number.isFinite(rate)) return "Enter an interest rate. Use 0 for an interest-free loan.";
  if (rate < 0) return "The interest rate cannot be negative.";
  if (rate > 100) return "The interest rate must be 100% or less.";
  if (!Number.isFinite(months)) return "Enter the loan term.";
  if (months < 1) return "The loan term must be at least 1 month.";
  if (months > MAX_MONTHS) return "The loan term can be at most 50 years (600 months).";
  if (!Number.isFinite(extra)) return "Extra payment must be a number.";
  if (extra < 0) return "Extra payment cannot be negative.";
  return "";
}

export function calcEmi(principal: number, annualRatePct: number, months: number): number {
  if (months <= 0) return 0;
  const r = annualRatePct / 1200;
  if (r === 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
}

export function buildSchedule(
  principal: number,
  annualRatePct: number,
  months: number,
  extra: number,
): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  const emi = calcEmi(principal, annualRatePct, months);
  const r = annualRatePct / 1200;
  let balance = principal;
  let month = 0;
  while (balance > 0.005 && month < MAX_MONTHS) {
    month += 1;
    const interest = balance * r;
    let payment = emi + extra;
    let last = payment >= balance + interest - 0.005;
    if (month >= months) last = true;
    if (last) payment = balance + interest;
    const paidPrincipal = payment - interest;
    balance = last ? 0 : balance - paidPrincipal;
    rows.push({ month, payment, interest, principal: paidPrincipal, balance });
  }
  return rows;
}

export function summarize(rows: readonly ScheduleRow[]): { interest: number; paid: number } {
  let interest = 0;
  let paid = 0;
  for (const row of rows) {
    interest += row.interest;
    paid += row.payment;
  }
  return { interest, paid };
}

export function compute(principal: number, rate: number, months: number, extra: number): LoanResult {
  const emi = calcEmi(principal, rate, months);
  const baseRows = buildSchedule(principal, rate, months, 0);
  const rows = extra > 0 ? buildSchedule(principal, rate, months, extra) : baseRows;
  const base = summarize(baseRows);
  const cur = summarize(rows);
  return {
    emi,
    rows,
    baseRows,
    totalInterest: cur.interest,
    totalPaid: cur.paid,
    payoffMonths: rows.length,
    baseInterest: base.interest,
    interestSaved: Math.max(0, base.interest - cur.interest),
    monthsSaved: Math.max(0, baseRows.length - rows.length),
  };
}

export function yearlySummary(rows: readonly ScheduleRow[]): YearRow[] {
  const out: YearRow[] = [];
  let year = 0;
  let payment = 0;
  let interest = 0;
  let principal = 0;
  let balance = 0;
  for (const row of rows) {
    const y = Math.ceil(row.month / 12);
    if (y !== year && year !== 0) {
      out.push({ year, payment, interest, principal, balance });
      payment = 0;
      interest = 0;
      principal = 0;
    }
    year = y;
    payment += row.payment;
    interest += row.interest;
    principal += row.principal;
    balance = row.balance;
  }
  if (year !== 0) out.push({ year, payment, interest, principal, balance });
  return out;
}

export function toCsv(rows: readonly ScheduleRow[]): string {
  const lines: string[] = ["Month,Payment,Principal,Interest,Balance"];
  for (const row of rows) {
    lines.push(
      row.month +
        "," +
        row.payment.toFixed(2) +
        "," +
        row.principal.toFixed(2) +
        "," +
        row.interest.toFixed(2) +
        "," +
        row.balance.toFixed(2),
    );
  }
  return lines.join("\n");
}

export function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return currency + " " + value.toFixed(2);
  }
}

export function monthsToText(total: number): string {
  const y = Math.floor(total / 12);
  const m = total % 12;
  const parts: string[] = [];
  if (y > 0) parts.push(y + (y === 1 ? " year" : " years"));
  if (m > 0) parts.push(m + (m === 1 ? " month" : " months"));
  return parts.length === 0 ? "0 months" : parts.join(" ");
}
