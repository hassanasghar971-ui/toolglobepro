"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import SearchDialog from "./SearchDialog";
import Icon from "@/components/ui/Icon";
import type { SearchEntry } from "@/lib/search";

interface Props {
  categories: { slug: string; name: string }[];
  searchIndex: SearchEntry[];
}

export default function Header({ categories, searchIndex }: Props) {
  const pathname = usePathname();
  /* Each state stores the pathname it was opened on, so a route change
     closes the menus automatically. Empty string means closed. */
  const [menuFor, setMenuFor] = useState("");
  const [catsFor, setCatsFor] = useState("");
  const menuOpen = menuFor === pathname;
  const catsOpen = catsFor === pathname;

  const featured = categories.slice(0, 3).map((c) => ({ href: `/category/${c.slug}`, label: c.name }));
  const links = [...featured, { href: "/about", label: "About" }];

  const linkClass = (href: string) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      pathname === href || pathname.startsWith(`${href}/`)
        ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
    }`;

  const triggerClass = `inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    catsOpen
      ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
  }`;

  return (
    <header
      className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/85"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setCatsFor("");
          setMenuFor("");
        }
      }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" aria-label="ToolGlobe Pro home" className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label="Primary" className="ml-6 hidden items-center gap-1 lg:flex">
          {featured.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)}>
              {l.label}
            </Link>
          ))}
          <button
            type="button"
            className={triggerClass}
            aria-expanded={catsOpen}
            aria-controls="all-categories"
            onClick={() => setCatsFor(catsOpen ? "" : pathname)}
          >
            All categories
            <span className={catsOpen ? "inline-flex rotate-180 transition-transform" : "inline-flex transition-transform"}>
              <Icon name="chevron-down" size={16} />
            </span>
          </button>
          <Link href="/about" className={linkClass("/about")}>
            About
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <SearchDialog entries={searchIndex} />
          <ThemeToggle />
          <button
            type="button"
            className="btn-ghost size-10 px-0 lg:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuFor(menuOpen ? "" : pathname)}
          >
            <Icon name={menuOpen ? "x" : "menu"} size={22} />
          </button>
        </div>
      </div>

      {catsOpen && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          className="fixed inset-0 -z-10 hidden cursor-default lg:block"
          onClick={() => setCatsFor("")}
        />
      )}

      {catsOpen && (
        <div
          id="all-categories"
          className="absolute inset-x-0 top-full hidden border-b border-slate-200 bg-white shadow-lg lg:block dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="mx-auto max-h-[70vh] max-w-6xl overflow-y-auto px-4 py-4 sm:px-6">
            <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/category/${c.slug}`}
                    className={`block ${linkClass(`/category/${c.slug}`)}`}
                    onClick={() => setCatsFor("")}
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {menuOpen && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="animate-fade-in max-h-[75vh] overflow-y-auto border-t border-slate-200 bg-white px-4 py-3 lg:hidden dark:border-slate-800 dark:bg-slate-950"
        >
          <p className="px-3 pb-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Categories
          </p>
          <ul className="flex flex-col gap-1">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/category/${c.slug}`} className={`block ${linkClass(`/category/${c.slug}`)}`}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-3 flex flex-col gap-1 border-t border-slate-200 pt-3 dark:border-slate-800">
            <li>
              <Link href="/about" className={`block ${linkClass("/about")}`}>
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className={`block ${linkClass("/contact")}`}>
                Contact
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
