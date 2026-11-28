"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

function ExtraSkeleton() {
  return (
    <div className="card p-6" aria-busy="true">
      <div className="h-6 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mt-4 h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      <span className="sr-only">Loading tool…</span>
    </div>
  );
}

const PercentageCalculatorTool = dynamic(() => import("./PercentageCalculatorTool"), {
  loading: () => <ExtraSkeleton />,
});

const PomodoroTimerTool = dynamic(() => import("./PomodoroTimerTool"), {
  loading: () => <ExtraSkeleton />,
});

const SocialMediaCharacterCounterTool = dynamic(() => import("./SocialMediaCharacterCounterTool"), {
  loading: () => <ExtraSkeleton />,
});

export const EXTRA_TOOL_COMPONENTS: Record<string, ComponentType> = {
  "percentage-calculator": PercentageCalculatorTool,
  "pomodoro-timer": PomodoroTimerTool,
  "social-media-character-counter": SocialMediaCharacterCounterTool,
};
