import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { collectionPageSchema } from "@/lib/schema";
import { getCategory } from "@/lib/categories";
import { getActiveCategories, getToolsByCategory, toSummary } from "@/lib/tools";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import Icon from "@/components/ui/Icon";
import ToolCard from "@/components/tools/ToolCard";
import AdSlot from "@/components/ads/AdSlot";

export const dynamicParams = false;

export function generateStaticParams() {
  return getActiveCategories().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return {};
  return buildMetadata({
    title: `Free ${category.name}`,
    description: category.description,
    path: `/category/${category.slug}`,
    keywords: category.keywords,
  });
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const tools = getToolsByCategory(category.slug);
  if (tools.length === 0) notFound();

  const others = getActiveCategories().filter((c) => c.slug !== category.slug);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <JsonLd
        data={collectionPageSchema(
          category,
          tools.map((t) => ({ name: t.name, path: `/tools/${t.slug}` })),
        )}
      />
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: category.name, href: `/category/${category.slug}` },
        ]}
      />
      <header className="mt-6 flex items-start gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
          <Icon name={category.icon} size={28} />
        </span>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            {category.name}
          </h1>
          <p className="mt-2 max-w-2xl text-lg text-slate-600 dark:text-slate-400">{category.tagline}</p>
        </div>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <ToolCard key={t.slug} tool={toSummary(t)} />
        ))}
      </div>

      <AdSlot slot="inline" className="mt-10" />

      <section className="article mt-12 max-w-3xl">
        <h2>About these tools</h2>
        {category.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </section>

      {others.length > 0 && (
        <nav aria-label="Other categories" className="mt-12">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Explore other categories</h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {others.map((c) => (
              <li key={c.slug}>
                <Link href={`/category/${c.slug}`} className="btn-secondary">
                  <Icon name={c.icon} size={16} /> {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
