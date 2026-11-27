export interface PercentMode {
  id: string;
  label: string;
  prompt: string;
  labelA: string;
  labelB: string;
  placeholderA: string;
  placeholderB: string;
}

export interface CalcResult {
  ok: boolean;
  message: string;
  value: number;
  display: string;
  headline: string;
  formula: string;
  steps: string[];
  note: string;
}

export const DEFAULT_MODE: PercentMode = {
  id: "of",
  label: "X% of Y",
  prompt: "What is X percent of Y?",
  labelA: "Percentage (X)",
  labelB: "Number (Y)",
  placeholderA: "15",
  placeholderB: "240",
};

export const PERCENT_MODES: readonly PercentMode[] = [
  DEFAULT_MODE,
  {
    id: "what",
    label: "X is what % of Y",
    prompt: "X is what percent of Y?",
    labelA: "Part (X)",
    labelB: "Whole (Y)",
    placeholderA: "45",
    placeholderB: "180",
  },
  {
    id: "change",
    label: "% change",
    prompt: "What is the percentage change from X to Y?",
    labelA: "Starting value (X)",
    labelB: "Ending value (Y)",
    placeholderA: "80",
    placeholderB: "100",
  },
  {
    id: "adjust",
    label: "Add or subtract %",
    prompt: "Increase or decrease X by Y percent",
    labelA: "Amount (X)",
    labelB: "Percentage (Y)",
    placeholderA: "200",
    placeholderB: "20",
  },
  {
    id: "reverse",
    label: "X is Y% of what",
    prompt: "X is Y percent of what number?",
    labelA: "Known value (X)",
    labelB: "Percentage (Y)",
    placeholderA: "30",
    placeholderB: "25",
  },
  {
    id: "difference",
    label: "% difference",
    prompt: "What is the percentage difference between X and Y?",
    labelA: "First value (X)",
    labelB: "Second value (Y)",
    placeholderA: "50",
    placeholderB: "70",
  },
];

export const DIRECTIONS = [
  { id: "increase", label: "Increase" },
  { id: "decrease", label: "Decrease" },
] as const;

export const DIGIT_CHOICES = [0, 1, 2, 3, 4, 6] as const;

export const QUICK_PERCENTS = [1, 5, 10, 15, 20, 25, 30, 40, 50, 75] as const;

export const EMPTY_RESULT: CalcResult = {
  ok: false,
  message: "",
  value: Number.NaN,
  display: "",
  headline: "",
  formula: "",
  steps: [],
  note: "",
};

export function getMode(id: string): PercentMode {
  return PERCENT_MODES.find((m) => m.id === id) ?? DEFAULT_MODE;
}

export function parseNumber(text: string): number {
  const cleaned = text.replace(/[,\s]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") {
    return Number.NaN;
  }
  if (!/^-?\d*\.?\d*$/.test(cleaned)) {
    return Number.NaN;
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : Number.NaN;
}

export function formatNumber(value: number, digits: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  const text = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
  return text === "-0" ? "0" : text;
}

function fail(message: string): CalcResult {
  return {
    ok: false,
    message,
    value: Number.NaN,
    display: "",
    headline: "",
    formula: "",
    steps: [],
    note: "",
  };
}

function done(
  value: number,
  display: string,
  headline: string,
  formula: string,
  steps: string[],
  note: string,
): CalcResult {
  return { ok: true, message: "", value, display, headline, formula, steps, note };
}

export function calculate(
  modeId: string,
  a: number,
  b: number,
  direction: string,
  digits: number,
): CalcResult {
  const fa = formatNumber(a, 8);
  const fb = formatNumber(b, 8);
  const out = (v: number) => formatNumber(v, digits);

  if (modeId === "of") {
    const value = (a * b) / 100;
    return done(
      value,
      out(value),
      fa + "% of " + fb + " is " + out(value),
      "Y × X ÷ 100",
      [
        "Turn the percentage into a decimal: " + fa + " ÷ 100 = " + formatNumber(a / 100, 8),
        "Multiply by the number: " + formatNumber(a / 100, 8) + " × " + fb + " = " + out(value),
      ],
      "",
    );
  }

  if (modeId === "what") {
    if (b === 0) {
      return fail("The whole (Y) cannot be zero, because nothing can be a percentage of zero.");
    }
    const ratio = a / b;
    const value = ratio * 100;
    return done(
      value,
      out(value) + "%",
      fa + " is " + out(value) + "% of " + fb,
      "X ÷ Y × 100",
      [
        "Divide the part by the whole: " + fa + " ÷ " + fb + " = " + formatNumber(ratio, 8),
        "Multiply by 100: " + formatNumber(ratio, 8) + " × 100 = " + out(value) + "%",
      ],
      a > b && b > 0 ? "The part is larger than the whole, so the result is above 100%." : "",
    );
  }

  if (modeId === "change") {
    if (a === 0) {
      return fail("The starting value (X) cannot be zero, because a percentage change from zero is undefined.");
    }
    const diff = b - a;
    const ratio = diff / Math.abs(a);
    const value = ratio * 100;
    const word =
      value > 0
        ? "an increase of " + out(value) + "%"
        : value < 0
          ? "a decrease of " + out(Math.abs(value)) + "%"
          : "no change (0%)";
    return done(
      value,
      (value > 0 ? "+" : "") + out(value) + "%",
      "From " + fa + " to " + fb + " is " + word,
      "(Y − X) ÷ X × 100",
      [
        "Find the difference: " + fb + " − " + fa + " = " + formatNumber(diff, 8),
        "Divide by the starting value: " + formatNumber(diff, 8) + " ÷ " + formatNumber(Math.abs(a), 8) + " = " + formatNumber(ratio, 8),
        "Multiply by 100: " + formatNumber(ratio, 8) + " × 100 = " + out(value) + "%",
      ],
      a < 0
        ? "The starting value is negative, so the percentage is measured against its absolute value. The sign shows the direction of the move."
        : "",
    );
  }

  if (modeId === "adjust") {
    const change = (a * b) / 100;
    const down = direction === "decrease";
    const value = down ? a - change : a + change;
    const multiplier = down ? 1 - b / 100 : 1 + b / 100;
    return done(
      value,
      out(value),
      fa + (down ? " decreased by " : " increased by ") + fb + "% is " + out(value),
      down ? "X − X × Y ÷ 100" : "X + X × Y ÷ 100",
      [
        "Find the percentage amount: " + fb + "% of " + fa + " = " + formatNumber(change, 8),
        (down ? "Subtract it: " : "Add it: ") + fa + (down ? " − " : " + ") + formatNumber(change, 8) + " = " + out(value),
      ],
      "Shortcut: multiply the amount by " + formatNumber(multiplier, 8) + " to get the same answer in one step.",
    );
  }

  if (modeId === "reverse") {
    if (b === 0) {
      return fail("The percentage (Y) cannot be zero, because no number is zero percent of a value.");
    }
    const ratio = a / b;
    const value = ratio * 100;
    return done(
      value,
      out(value),
      fa + " is " + fb + "% of " + out(value),
      "X ÷ Y × 100",
      [
        "Divide the known value by the percentage: " + fa + " ÷ " + fb + " = " + formatNumber(ratio, 8),
        "Multiply by 100: " + formatNumber(ratio, 8) + " × 100 = " + out(value),
      ],
      "",
    );
  }

  if (modeId === "difference") {
    const mean = (a + b) / 2;
    if (mean === 0) {
      return fail("The average of the two numbers is zero, so a percentage difference is not defined.");
    }
    const gap = Math.abs(a - b);
    const value = (gap / Math.abs(mean)) * 100;
    return done(
      value,
      out(value) + "%",
      "The percentage difference between " + fa + " and " + fb + " is " + out(value) + "%",
      "Gap ÷ Average × 100",
      [
        "Find the gap between the two numbers: " + formatNumber(gap, 8),
        "Find their average: (" + fa + " + " + fb + ") ÷ 2 = " + formatNumber(mean, 8),
        "Divide the gap by the average and multiply by 100: " + out(value) + "%",
      ],
      "Percentage difference treats both numbers equally. Use % change when one of them is clearly the starting point.",
    );
  }

  return fail("Choose a calculation type.");
}
