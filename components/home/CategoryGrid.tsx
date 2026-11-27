import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { getActiveCategories, getToolsByCategory } from "@/lib/tools";
import type { CategoryWithCount } from "@/lib/tools";

export interface CategoryGridProps {
  categories?: readonly CategoryWithCount[];
  heading?: string;
  description?: string;
}

export function CategoryGrid(props: CategoryGridProps) {
  const list = props.categories ?? getActiveCategories();
  const heading = props.heading ?? "Browse tools by category";
  const description =
    props.description ??
    "Every tool runs in your browser. Pick a category to see all of its tools.";

  if (list.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="category-grid-heading">
      <div className="mb-6">
        <h2
          id="category-grid-heading"
          className="text-2xl font-bold tracking-tight sm:text-3xl"
        >
          {heading}
        </h2>
        <p className="mt-2 max-w-2xl text-sm opacity-80 sm:text-base">
          {description}
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => {
          const tools = getToolsByCategory(c.slug);
          const preview = tools
            .slice(0, 3)
            .map((t) => t.name)
            .join(", ");
          const label = tools.length === 1 ? "tool" : "tools";

          return (
            <li key={c.slug}>
              <Link
                href={"/category/" + c.slug}
                className="card group block h-full p-5 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                    <Icon name={c.icon} size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-base font-semibold">
                      {c.name}
                    </span>
                    <span className="block text-xs opacity-70">
                      {tools.length} {label}
                    </span>
                  </span>
                </span>
                {preview.length > 0 ? (
                  <span className="mt-3 block text-sm opacity-80">
                    {preview}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default CategoryGrid;
