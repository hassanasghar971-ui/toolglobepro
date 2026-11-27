"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

function ExtraSkeleton() {
  return (
    <div className="card" aria-busy="true" aria-live="polite">
      <div className="h-6 w-1/3 animate-pulse rounded bg-current opacity-10" />
      <div className="mt-4 h-40 w-full animate-pulse rounded bg-current opacity-10" />
      <span className="sr-only">Loading tool…</span>
    </div>
  );
}

const PercentageCalculatorTool = dynamic(
  () => import("./PercentageCalculatorTool"),
  { loading: () => <ExtraSkeleton /> },
);

export const EXTRA_TOOL_COMPONENTS: Record<string, ComponentType> = {
  "percentage-calculator": PercentageCalculatorTool,
};
