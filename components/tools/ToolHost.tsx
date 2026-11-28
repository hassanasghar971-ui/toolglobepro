"use client";

import { TOOL_COMPONENTS } from "./tool-map";

interface Props {
  slug: string;
}

export default function ToolHost({ slug }: Props) {
  const Component = TOOL_COMPONENTS[slug];

  if (!Component) {
    return (
      <div className="card p-6" role="alert">
        <p className="font-semibold text-slate-900 dark:text-white">This tool could not be loaded.</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Please reload the page. If the problem continues, contact us and mention: {slug}
        </p>
      </div>
    );
  }

  return <Component />;
}
