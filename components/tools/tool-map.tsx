"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { ToolSlug } from "@/lib/tools";

/*
  Maps every registered tool slug to its <PascalSlug>Tool component.

  - Components are code-split with next/dynamic but still server-rendered
    (no ssr: false), so tool pages stay fully indexable.
  - Record<ToolSlug, ...> makes a missing mapping a compile-time error.
*/

function ToolSkeleton() {
  return (
    <div className="card" aria-busy="true" aria-live="polite">
      <div className="h-6 w-1/3 animate-pulse rounded bg-current opacity-10" />
      <div className="mt-4 h-40 w-full animate-pulse rounded bg-current opacity-10" />
      <div className="mt-4 h-10 w-32 animate-pulse rounded bg-current opacity-10" />
      <span className="sr-only">Loading tool…</span>
    </div>
  );
}

const MarkdownPreviewerTool = dynamic(
  () =>
    import("./markdown-previewer/MarkdownPreviewerTool").then(
      (mod) => mod.MarkdownPreviewerTool,
    ),
  { loading: () => <ToolSkeleton /> },
);

const CsvToJsonTool = dynamic(
  () => import("./csv-to-json/CsvToJsonTool").then((mod) => mod.CsvToJsonTool),
  { loading: () => <ToolSkeleton /> },
);

const UrlEncoderDecoderTool = dynamic(
  () =>
    import("./url-encoder-decoder/UrlEncoderDecoderTool").then(
      (mod) => mod.UrlEncoderDecoderTool,
    ),
  { loading: () => <ToolSkeleton /> },
);

const ImageFormatConverterTool = dynamic(() => import("./ImageFormatConverterTool"));

export const TOOL_COMPONENTS: Record<ToolSlug, ComponentType> = {
  "markdown-previewer": MarkdownPreviewerTool,
  "csv-to-json": CsvToJsonTool,
  "url-encoder-decoder": UrlEncoderDecoderTool,
  "image-format-converter": ImageFormatConverterTool,
};

export function getToolComponent(slug: string): ComponentType | null {
  return Object.prototype.hasOwnProperty.call(TOOL_COMPONENTS, slug)
    ? TOOL_COMPONENTS[slug as ToolSlug]
    : null;
}

/* Use from a Server Component page: <ToolRenderer slug={tool.slug} />. */
export function ToolRenderer({ slug }: { slug: string }) {
  const Component = getToolComponent(slug);
  if (!Component) return null;
  return <Component />;
}
