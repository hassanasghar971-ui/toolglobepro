import Link from "next/link";
import Logo from "./Logo";
import Icon from "@/components/ui/Icon";
import { SITE, whatsappLink } from "@/lib/site";
import { getActiveCategories, getAllTools } from "@/lib/tools";
import { PrivacyChoicesButton } from "@/components/ads/ConsentBanner";

export default function Footer() {
  const categories = getActiveCategories();
  const tools = getAllTools().slice(0, 6);
  const year = new Date().getFullYear();

  const col = "text-sm text-slate-600 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300";

  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Link href="/" aria-label="ToolGlobe Pro home">
            <Logo />
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-400">
            Free, private online tools that run in your browser. No sign-up, no uploads, and files up to 600MB.
          </p>
          <ul className="mt-5 space-y-2 text-sm">
            <li>
              <a
                href={`mailto:${SITE.owner.email}`}
                className="inline-flex items-center gap-2 text-slate-600 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300"
              >
                <Icon name="mail" size={16} /> {SITE.owner.email}
              </a>
            </li>
            {SITE.owner.whatsapp.map((w) => (
              <li key={w.number}>
                <a
                  href={whatsappLink(w.number)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-slate-600 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300"
                >
                  <Icon name="message" size={16} /> {w.label}: {w.display}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <nav aria-label="Categories">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Categories</h2>
          <ul className="mt-4 space-y-2.5">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/category/${c.slug}`} className={col}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Popular tools">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Popular tools</h2>
          <ul className="mt-4 space-y-2.5">
            {tools.map((t) => (
              <li key={t.slug}>
                <Link href={`/tools/${t.slug}`} className={col}>
                  {t.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Company and legal">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Company</h2>
          <ul className="mt-4 space-y-2.5">
            {[
              ["/about", "About"],
              ["/contact", "Contact"],
              ["/privacy-policy", "Privacy Policy"],
              ["/terms-and-conditions", "Terms & Conditions"],
              ["/disclaimer", "Disclaimer"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className={col}>
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <PrivacyChoicesButton
                className={`${col} cursor-pointer text-left underline-offset-2 hover:underline`}
              />
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:px-6 dark:text-slate-400">
          <p>© {year} {SITE.name}. Built by {SITE.owner.name}.</p>
          <p>Your files are processed in your browser and are never uploaded.</p>
        </div>
      </div>
    </footer>
  );
}
