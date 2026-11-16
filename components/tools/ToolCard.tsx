import Link from "next/link";
import Icon from "@/components/ui/Icon";
import type { ToolSummary } from "@/lib/types";

export default function ToolCard({ tool }: { tool: ToolSummary }) {
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="group card flex h-full flex-col gap-3 p-5 transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-lg dark:hover:border-brand-600"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex size-12 items-center justify-center rounded-xl bg-linear-to-br from-brand-50 to-cyan-50 text-brand-600 dark:from-brand-950 dark:to-cyan-950 dark:text-brand-300">
          <Icon name={tool.icon} size={24} />
        </span>
        {tool.maxFileMB ? <span className="chip">Up to {tool.maxFileMB}MB</span> : null}
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{tool.name}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{tool.tagline}</p>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">{tool.categoryName}</span>
        <span className="inline-flex items-center gap-1 font-semibold text-brand-700 dark:text-brand-300">
          Open tool <Icon name="arrow-right" size={14} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
