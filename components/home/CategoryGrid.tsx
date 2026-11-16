import Link from "next/link";
import Icon from "@/components/ui/Icon";
import type { Category, CategorySlug } from "@/lib/types";

interface Props {
  categories: (Category & { count: number })[];
}

export default function CategoryGrid({ categories }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={`/category/${c.slug}`}
          className="card group flex flex-col gap-3 p-6 transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-lg dark:hover:border-brand-600"
        >
          <div className="flex items-center justify-between">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
              <Icon name={c.icon} size={24} />
            </span>
            <span className="chip">{c.count} tools</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
              {c.name}
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{c.tagline}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
