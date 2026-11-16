import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";
import { itemListSchema } from "@/lib/schema";
import { getActiveCategories, getAllTools, toSummary } from "@/lib/tools";
import type { FaqItem } from "@/lib/types";
import JsonLd from "@/components/seo/JsonLd";
import Icon from "@/components/ui/Icon";
import FaqList from "@/components/ui/FaqList";
import ToolExplorer from "@/components/home/ToolExplorer";
import CategoryGrid from "@/components/home/CategoryGrid";
import AdSlot from "@/components/ads/AdSlot";

export const metadata = buildMetadata({
  title: `${SITE.name} – Free Online Tools That Run in Your Browser`,
  absoluteTitle: true,
  description:
    "Free, private online tools for writers, developers and marketers. Count words, format JSON, generate passwords and more. No sign-up, no uploads, files up to 600MB.",
  path: "/",
  keywords: [
    "free online tools",
    "browser based tools",
    "word counter",
    "json formatter",
    "password generator",
    "base64 encoder",
    "private online utilities",
  ],
});

const HOME_FAQS: FaqItem[] = [
  {
    q: "Are the tools on ToolGlobe Pro really free?",
    a: "Yes. Every tool is free to use with no account, no trial period and no hidden limits on how often you use it. The site is supported by a small number of ads, which is what keeps it free.",
  },
  {
    q: "Are my files or text uploaded to your servers?",
    a: "No. The tools process your text and files directly inside your browser using your own device's memory and processor. Nothing you type or drop in is sent to us. The only exception is a tool that needs the internet by nature, like an IP lookup, and that is clearly stated on its page.",
  },
  {
    q: "How big can the files be?",
    a: "Our file-based tools are built to handle up to 600MB by reading files in small chunks rather than loading everything at once. Very large files still depend on your device, so a modern laptop or desktop with a few spare gigabytes of RAM will give the smoothest experience.",
  },
  {
    q: "Do I need to install anything?",
    a: "Nothing at all. The tools work in current versions of Chrome, Edge, Firefox and Safari on desktop, tablet and phone.",
  },
  {
    q: "How can I suggest a new tool or report a bug?",
    a: "Use the contact page to email or WhatsApp the developer directly. Real requests from real users decide what gets built next.",
  },
];

export default function HomePage() {
  const tools = getAllTools();
  const summaries = tools.map(toSummary);
  const categories = getActiveCategories();

  return (
    <>
      <JsonLd
        data={itemListSchema(
          "ToolGlobe Pro tools",
          tools.map((t) => ({ name: t.name, path: `/tools/${t.slug}` })),
        )}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-brand-50 via-white to-white dark:from-brand-950/40 dark:via-slate-950 dark:to-slate-950"
        />
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <p className="chip mx-auto">
            <Icon name="lock" size={14} /> Private by design · Runs in your browser
          </p>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            Free online tools that{" "}
            <span className="bg-linear-to-r from-brand-600 to-cyan-500 bg-clip-text text-transparent">
              never upload your files
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-400">
            Word counters, JSON formatters, password generators and more. Everything runs on your
            own device, so it is fast, private and works with files up to 600MB.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="#tools" className="btn-primary px-6 py-3 text-base">
              Browse all tools <Icon name="arrow-right" size={18} />
            </a>
            <Link href="/about" className="btn-secondary px-6 py-3 text-base">
              How it works
            </Link>
          </div>
          <ul className="mx-auto mt-10 grid max-w-3xl gap-3 text-sm text-slate-600 sm:grid-cols-3 dark:text-slate-400">
            {[
              { icon: "shield", text: "No sign-up, no tracking of your content" },
              { icon: "zap", text: "Instant results, zero waiting on servers" },
              { icon: "upload", text: "Handles large files up to 600MB" },
            ].map((b) => (
              <li key={b.text} className="flex items-center justify-center gap-2">
                <Icon
                  name={b.icon as "shield" | "zap" | "upload"}
                  size={18}
                  className="text-brand-600 dark:text-brand-400"
                />
                {b.text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Tool explorer */}
      <section id="tools" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          All tools
        </h2>
        <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
          Pick a tool and start straight away. Use the filters or search to narrow things down.
        </p>
        <div className="mt-8">
          <ToolExplorer
            tools={summaries}
            categories={categories.map((c) => ({ slug: c.slug, name: c.name, count: c.count }))}
          />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <AdSlot slot="inline" />
      </div>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          Browse by category
        </h2>
        <div className="mt-8">
          <CategoryGrid categories={categories} />
        </div>
      </section>

      {/* Editorial content */}
      <section className="border-t border-slate-200 bg-slate-50 py-14 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="article mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mt-0!">Online tools without the usual trade-offs</h2>
          <p>
            Most free online utilities ask you to upload your document to a server you know nothing
            about, wait for it to come back, and hope nobody keeps a copy. That is a poor deal when
            you are working with a client contract, a private dataset or an unreleased draft.
          </p>
          <p>
            ToolGlobe Pro takes the opposite approach. The heavy lifting happens inside your browser
            tab, using background workers and streaming so that even a few hundred megabytes
            don&apos;t freeze the page. Your content stays on your device from start to finish, and
            you can even disconnect from the internet after the page loads and most tools will keep
            working.
          </p>
          <p>
            The collection is built for the jobs people actually search for every day: checking an
            essay against a word limit, tidying a JSON response before sending it to a teammate,
            creating a strong password, or turning a headline into a clean URL slug. Each tool
            page includes plain-English guidance, so you understand what the result means and not
            only how to get it.
          </p>
          <p>
            ToolGlobe Pro is independently built and maintained by {SITE.owner.name}. If something
            doesn&apos;t work the way you expect, or there is a tool you wish existed, the{" "}
            <Link href="/contact">contact page</Link> goes straight to the developer.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <FaqList faqs={HOME_FAQS} title="Frequently asked questions" />
      </section>
    </>
  );
}
