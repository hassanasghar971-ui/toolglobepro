import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { getAllTools, getToolBySlug } from "@/lib/tools";
import { TOOL_COMPONENTS } from "@/components/tools/tool-map";
import ToolPageShell from "@/components/tools/ToolPageShell";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllTools().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) return {};
  return buildMetadata({
    title: tool.metaTitle,
    description: tool.metaDescription,
    path: `/tools/${tool.slug}`,
    keywords: tool.keywords,
  });
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  const ToolComponent = TOOL_COMPONENTS[slug];

  if (!tool || !ToolComponent) notFound();

  return (
    <ToolPageShell tool={tool}>
      <ToolComponent />
    </ToolPageShell>
  );
}
