import Link from "next/link";
import type { Metadata } from "next";
import { getAllTools, toSummary } from "@/lib/tools";
import { SITE } from "@/lib/site";
import ToolCard from "@/components/tools/ToolCard";
import Icon from "@/components/ui/Icon";
import NotFoundInfo from "@/components/layout/NotFoundInfo";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you were looking for doesn't exist. Try one of our popular free online tools.",
};

export default function NotFound() {
  const tools = getAllTools().slice(0, 3).map(toSummary);
  const canonicalOrigin = new URL(SITE.url).origin;

  return (
    <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
      <p className="text-6xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">
        We couldn&apos;t find that page
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-400">
        The link may be old or mistyped. Head back home, or try one of these popular tools instead.
      </p>
      <Link href="/" className="btn-primary mt-8">
        <Icon name="home" size={18} /> Back to home
      </Link>
      <NotFoundInfo canonicalOrigin={canonicalOrigin} />
      <div className="mt-12 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <ToolCard key={t.slug} tool={t} />
        ))}
      </div>
    </div>
  );
}
