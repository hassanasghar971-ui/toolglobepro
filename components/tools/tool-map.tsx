"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { ToolSlug } from "@/lib/tools";
import { EXTRA_TOOL_COMPONENTS } from "./extra-tool-map";

/*
  Maps every registered tool slug to its <PascalSlug>Tool component.
  - Components are code-split with next/dynamic but still server-rendered
    (no ssr: false), so tool pages stay fully indexable.
  - New tools are added in extra-tool-map.tsx and merged at the bottom.
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

const WordCounterTool = dynamic(
  () => import("./WordCounterTool"),
  { loading: () => <ToolSkeleton /> },
);
const IpLookupTool = dynamic(
  () => import("./IpLookupTool"),
  { loading: () => <ToolSkeleton /> },
);
const PasswordGeneratorTool = dynamic(
  () => import("./PasswordGeneratorTool"),
  { loading: () => <ToolSkeleton /> },
);
const Base64ConverterTool = dynamic(
  () => import("./Base64ConverterTool"),
  { loading: () => <ToolSkeleton /> },
);
const JsonFormatterTool = dynamic(
  () => import("./JsonFormatterTool"),
  { loading: () => <ToolSkeleton /> },
);
const SlugGeneratorTool = dynamic(
  () => import("./SlugGeneratorTool"),
  { loading: () => <ToolSkeleton /> },
);
const QrCodeGeneratorTool = dynamic(
  () => import("./QrCodeGeneratorTool"),
  { loading: () => <ToolSkeleton /> },
);
const HashGeneratorTool = dynamic(
  () => import("./HashGeneratorTool"),
  { loading: () => <ToolSkeleton /> },
);
const CaseConverterTool = dynamic(
  () => import("./CaseConverterTool"),
  { loading: () => <ToolSkeleton /> },
);
const ImageCompressorTool = dynamic(
  () => import("./ImageCompressorTool"),
  { loading: () => <ToolSkeleton /> },
);
const TextDiffCheckerTool = dynamic(
  () => import("./TextDiffCheckerTool"),
  { loading: () => <ToolSkeleton /> },
);
const LoremIpsumGeneratorTool = dynamic(
  () => import("./LoremIpsumGeneratorTool"),
  { loading: () => <ToolSkeleton /> },
);
const ColorConverterTool = dynamic(
  () => import("./ColorConverterTool"),
  { loading: () => <ToolSkeleton /> },
);
const UnitConverterTool = dynamic(
  () => import("./UnitConverterTool"),
  { loading: () => <ToolSkeleton /> },
);
const TimestampConverterTool = dynamic(
  () => import("./TimestampConverterTool"),
  { loading: () => <ToolSkeleton /> },
);
const MarkdownPreviewerTool = dynamic(
  () => import("./MarkdownPreviewerTool"),
  { loading: () => <ToolSkeleton /> },
);
const CsvToJsonTool = dynamic(
  () => import("./CsvToJsonTool"),
  { loading: () => <ToolSkeleton /> },
);
const UrlEncoderDecoderTool = dynamic(
  () => import("./UrlEncoderDecoderTool"),
  { loading: () => <ToolSkeleton /> },
);
const ImageFormatConverterTool = dynamic(
  () => import("./ImageFormatConverterTool"),
  { loading: () => <ToolSkeleton /> },
);
const ImageMetadataRemoverTool = dynamic(
  () => import("./ImageMetadataRemoverTool"),
  { loading: () => <ToolSkeleton /> },
);

export const TOOL_COMPONENTS: Record<ToolSlug, ComponentType> = {
  "word-counter": WordCounterTool,
  "ip-lookup": IpLookupTool,
  "password-generator": PasswordGeneratorTool,
  "base64-converter": Base64ConverterTool,
  "json-formatter": JsonFormatterTool,
  "slug-generator": SlugGeneratorTool,
  "qr-code-generator": QrCodeGeneratorTool,
  "hash-generator": HashGeneratorTool,
  "case-converter": CaseConverterTool,
  "image-compressor": ImageCompressorTool,
  "text-diff-checker": TextDiffCheckerTool,
  "lorem-ipsum-generator": LoremIpsumGeneratorTool,
  "color-converter": ColorConverterTool,
  "unit-converter": UnitConverterTool,
  "timestamp-converter": TimestampConverterTool,
  "markdown-previewer": MarkdownPreviewerTool,
  "csv-to-json": CsvToJsonTool,
  "url-encoder-decoder": UrlEncoderDecoderTool,
  "image-format-converter": ImageFormatConverterTool,
  "image-metadata-remover": ImageMetadataRemoverTool,
  ...EXTRA_TOOL_COMPONENTS,
};

export function getToolComponent(slug: string): ComponentType | null {
  return Object.prototype.hasOwnProperty.call(TOOL_COMPONENTS, slug)
    ? TOOL_COMPONENTS[slug as ToolSlug]
    : null;
}

/* Use from a Server Component page: ToolRenderer with a slug prop. */
export function ToolRenderer({ slug }: { slug: string }) {
  const Component = getToolComponent(slug);
  if (!Component) return null;
  return <Component />;
}
