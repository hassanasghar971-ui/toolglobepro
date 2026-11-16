"use client";

import { useMemo, useState } from "react";
import ToolCard from "@/components/tools/ToolCard";
import Icon from "@/components/ui/Icon";
import type { ToolSummary, CategorySlug } from "@/lib/types";

interface Props {
  tools: ToolSummary[];
  categories: { slug: string; name: string; count: number }[];
}

export default function ToolExplorer({ tools, categories }: Props) {
  const [query, setQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>("all");

  const filtered = useMemo(() => {
    return tools.filter((t) => {
      const matchCat = selectedCat === "all" || t.category === selectedCat;
      const q = query.toLowerCase();
      const matchQuery =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.tagline.toLowerCase().includes(q) ||
        t.keywords.some((k) => k.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }, [tools, query, selectedCat]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Icon name="search" size={18} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools..."
            aria-label="Search tools"
            className="input pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCat("all")}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
              selectedCat === "all"
                ? "bg-brand-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            All tools ({tools.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => setSelectedCat(c.slug)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                selectedCat === c.slug
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {c.name} ({c.count})
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => (
          <ToolCard key={t.slug} tool={t} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center text-slate-500 dark:text-slate-400">
          No tools found matching your search. Try a different keyword.
        </div>
      )}
    </div>
  );
}
