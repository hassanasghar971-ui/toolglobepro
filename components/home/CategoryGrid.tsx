import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { getActiveCategories, getToolsByCategory } from "@/lib/tools";

interface CategoryGridProps {
  heading?: string;
  description?: string;
}

export function CategoryGrid({
  heading = "Browse by category",
  description = "Jump straight to the kind of tool you need. Every category lists free tools that run in your browser.",
}: CategoryGridProps) {
  const categories = getActiveCategories();

  return (
    <section aria-labelledby="category-grid-heading">
      <div className="mx-auto max-w-2xl text-center">
        <h2
          id="category-grid-heading"
          className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white"
        >
          {heading}
        </h2>
        <p className="mt-3 text-base text-slate-600 dark:text-slate-300">{description}</p>
      </div>
      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => {
          const count = getToolsByCategory(c.slug).length;
          return (
            <li key={c.slug} className="flex">
              <Link
                href={`/category/${c.slug}`}
                className="card group flex w-full flex-col p-6 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <span className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
                  <Icon name={c.icon} size={24} />
                </span>
                <span className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{c.name}</span>
                <span className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {c.tagline}
                </span>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 dark:text-brand-300">
                  {count} {count === 1 ? "tool" : "tools"}
                  <Icon name="arrow-right" size={16} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default CategoryGrid;
