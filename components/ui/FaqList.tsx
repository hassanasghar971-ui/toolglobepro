import Icon from "./Icon";
import JsonLd from "@/components/seo/JsonLd";
import { faqSchema } from "@/lib/schema";
import type { FaqItem } from "@/lib/types";

/** Native <details> keeps every answer in the HTML (crawlable) while staying interactive and accessible. */
export default function FaqList({
  faqs,
  title = "Frequently asked questions",
  withSchema = true,
}: {
  faqs: FaqItem[];
  title?: string;
  withSchema?: boolean;
}) {
  if (faqs.length === 0) return null;

  return (
    <section aria-labelledby="faq-heading">
      {withSchema && <JsonLd data={faqSchema(faqs)} />}
      <h2 id="faq-heading" className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        {title}
      </h2>
      <div className="mt-6 space-y-3">
        {faqs.map((f) => (
          <details key={f.q} className="group card open:border-brand-300 dark:open:border-brand-700">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 font-semibold text-slate-900 marker:hidden dark:text-white [&::-webkit-details-marker]:hidden">
              <span>{f.q}</span>
              <Icon
                name="chevron-down"
                size={20}
                className="shrink-0 text-slate-400 transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="px-5 pb-5 leading-7 text-slate-600 dark:text-slate-400">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
