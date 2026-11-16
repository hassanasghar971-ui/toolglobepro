import Link from "next/link";
import Icon from "./Icon";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";

export default function Breadcrumbs({ items }: { items: { name: string; href: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <JsonLd data={breadcrumbSchema(items)} />
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.href} className="flex items-center gap-1.5">
              {last ? (
                <span aria-current="page" className="font-medium text-slate-800 dark:text-slate-200">
                  {item.name}
                </span>
              ) : (
                <>
                  <Link href={item.href} className="hover:text-brand-700 hover:underline dark:hover:text-brand-300">
                    {item.name}
                  </Link>
                  <Icon name="chevron-right" size={14} />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
