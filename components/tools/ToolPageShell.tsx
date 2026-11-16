import type { ReactNode } from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import FaqList from "@/components/ui/FaqList";
import Icon from "@/components/ui/Icon";
import JsonLd from "@/components/seo/JsonLd";
import AdSlot from "@/components/ads/AdSlot";
import ToolCard from "./ToolCard";
import { getCategory } from "@/lib/categories";
import { toolSchema } from "@/lib/schema";
import { getRelatedTools, toSummary } from "@/lib/tools";
import type { ToolDefinition } from "@/lib/types";

export default function ToolPageShell({ tool, children }: { tool: ToolDefinition; children: ReactNode }) {
  const category = getCategory(tool.category);
  const related = getRelatedTools(tool, 3).map(toSummary);

  const crumbs = [
    { name: "Home", href: "/" },
    ...(category ? [{ name: category.name, href: `/category/${category.slug}` }] : []),
    { name: tool.name, href: `/tools/${tool.slug}` },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      <JsonLd data={toolSchema(tool)} />
      <Breadcrumbs items={crumbs} />
      <header className="mt-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          {tool.h1}
        </h1>
        <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-400">{tool.tagline}</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          <li className="chip">
            <Icon name="check" size={14} /> Free forever
          </li>
          <li className="chip">
            <Icon name="lock" size={14} /> Runs in your browser
          </li>
          {tool.maxFileMB ? (
            <li className="chip">
              <Icon name="upload" size={14} /> Files up to {tool.maxFileMB}MB
            </li>
          ) : null}
        </ul>
      </header>

      <section aria-label={`${tool.name} tool`} className="card mt-8 p-4 sm:p-6">
        {children}
      </section>

      <AdSlot slot="inline" className="mt-8" />

      <article className="article mt-12 max-w-3xl">
        <p className="text-lg!">{tool.intro}</p>
        <h2>How to use the {tool.name.toLowerCase()}</h2>
        <ol>
          {tool.howTo.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {tool.sections.map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            {s.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </section>
        ))}
      </article>

      <div className="mt-12 max-w-3xl">
        <FaqList faqs={tool.faqs} />
      </div>

      {related.length > 0 && (
        <section className="mt-14" aria-labelledby="related-heading">
          <h2 id="related-heading" className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            More free tools
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((t) => (
              <ToolCard key={t.slug} tool={t} />
            ))}
          </div>
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            Looking for something else? <Link href="/#tools" className="font-medium text-brand-700 underline dark:text-brand-300">Browse every tool</Link>.
          </p>
        </section>
      )}

      <AdSlot slot="footer" className="mt-12" />

      <p className="mt-10 text-xs text-slate-400">
        Last updated: <time dateTime={tool.dateModified}>{tool.dateModified}</time>
      </p>
    </div>
  );
}
