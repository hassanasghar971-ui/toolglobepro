"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

function ExtraSkeleton() {
  return <div className="card animate-pulse" style={{ minHeight: 240 }} aria-busy="true" />;
}

const PercentageCalculatorTool = dynamic(() => import("./PercentageCalculatorTool"), {
  loading: () => <ExtraSkeleton />,
});
const PomodoroTimerTool = dynamic(() => import("./PomodoroTimerTool"), {
  loading: () => <ExtraSkeleton />,
});
const SocialMediaCharacterCounterTool = dynamic(
  () => import("./SocialMediaCharacterCounterTool"),
  { loading: () => <ExtraSkeleton /> },
);
const EmiCalculatorTool = dynamic(() => import("./EmiCalculatorTool"), {
  loading: () => <ExtraSkeleton />,
});
const MetaTagGeneratorTool = dynamic(() => import("./MetaTagGeneratorTool"), {
  loading: () => <ExtraSkeleton />,
});
const BrowserInfoTool = dynamic(() => import("./BrowserInfoTool"), {
  loading: () => <ExtraSkeleton />,
});
const TextFileSplitterTool = dynamic(() => import("./TextFileSplitterTool"), {
  loading: () => <ExtraSkeleton />,
});
const WhatsAppLinkGeneratorTool = dynamic(() => import("./WhatsAppLinkGeneratorTool"), {
  loading: () => <ExtraSkeleton />,
});

export const EXTRA_TOOL_COMPONENTS: Record<string, ComponentType> = {
  "percentage-calculator": PercentageCalculatorTool,
  "pomodoro-timer": PomodoroTimerTool,
  "social-media-character-counter": SocialMediaCharacterCounterTool,
  "emi-calculator": EmiCalculatorTool,
  "meta-tag-generator": MetaTagGeneratorTool,
  "browser-info": BrowserInfoTool,
  "text-file-splitter": TextFileSplitterTool,
  "whatsapp-link-generator": WhatsAppLinkGeneratorTool,
};
