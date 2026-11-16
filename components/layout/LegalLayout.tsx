import type { ReactNode } from "react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import { webPageSchema } from "@/lib/schema";
import { LEGAL_UPDATED_ISO, LEGAL_UPDATED_LABEL } from "@/lib/site";

export default function LegalLayout({
  title,
  description,
  path,
  children,
}: {
  title: string;
  description: string;
  path: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <JsonLd data={webPageSchema({ name: title, description, path, modified: LEGAL_UPDATED_ISO })} />
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: title, href: path },
        ]}
      />
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">{title}</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Last updated: <time dateTime={LEGAL_UPDATED_ISO}>{LEGAL_UPDATED_LABEL}</time>
      </p>
      <div className="article">{children}</div>
    </div>
  );
}
