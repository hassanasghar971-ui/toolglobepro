import dynamic from "next/dynamic";
import type { ComponentType } from "react";

/**
 * TOOL COMPONENT MAP: slug → interactive client component (code-split per tool).
 * Add each new tool here AND in lib/tools/index.ts.
 */
export const TOOL_COMPONENTS: Record<string, ComponentType> = {
  "word-counter": dynamic(() => import("./WordCounterTool")),
};
