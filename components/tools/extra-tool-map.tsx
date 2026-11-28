"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

function ExtraSkeleton() {
  return (
    <div className="card animate-pulse p-6" aria-hidden="true">
      <div className="h-6 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mt-4 h-32 w-full rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mt-4 h-10 w-1/4 rounded bg-slate-200 dark:bg-slate-700" />
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

const EmiCalculatorTool = dynamic(() => import("./EmiCalculatorTool"), {
  loading: () => <ExtraSkeleton />,
});

const MetaTagGeneratorTool = dynamic(() => import("./MetaTagGeneratorTool"), {
  loading: () => <ExtraSkeleton />,
});

export const EXTRA_TOOL_COMPONENTS: Record<string, ComponentType> = {
  "percentage-calculator": PercentageCalculatorTool,
  "pomodoro-timer": PomodoroTimerTool,
  "social-media-character-counter": SocialMediaCharacterCounterTool,
  "emi-calculator": EmiCalculatorTool,
  "meta-tag-generator": MetaTagGeneratorTool,
};
