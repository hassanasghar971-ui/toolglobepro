import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { getAllTools, getToolBySlug } from "@/lib/tools";
import { TOOL_COMPONENTS } from "@/components/tools/tool-map";
import ToolPageShell from "@/components/tools/ToolPageShell";

export const dynamicParams = false;

/* Build-time guard: a tool listed in the registry must have a component
   in tool-map. If one is missing, the build fails and names it, instead
   of silently serving a 404 page. */
export function generateStaticParams() {
  const all = getAllTools();
  const missing = all.filter((t) => !TOOL_COMPONENTS[t.slug]).map((t) => t.slug);
  if (missing.length > 0) {
    throw new Error("tool-map is missing a component for: " + missing.join(", "));
  }
  return all.map((t) => ({ slug: t.slug }));
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
