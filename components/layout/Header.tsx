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
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;

  const links = [
    ...categories.slice(0, 4).map((c) => ({ href: `/category/${c.slug}`, label: c.name })),
    { href: "/about", label: "About" },
  ];

  const linkClass = (href: string) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      pathname === href || pathname.startsWith(`${href}/`)
        ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" aria-label="ToolGlobe Pro home" className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label="Primary" className="ml-6 hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <SearchDialog entries={searchIndex} />
          <ThemeToggle />
          <button
            type="button"
            className="btn-ghost size-10 px-0 lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpenFor(open ? null : pathname)}
          >
            <Icon name={open ? "x" : "menu"} size={22} />
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="animate-fade-in border-t border-slate-200 bg-white px-4 py-3 lg:hidden dark:border-slate-800 dark:bg-slate-950"
        >
          <ul className="flex flex-col gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={`block ${linkClass(l.href)}`}>
                  {l.label}
                </Link>
              </li>
            ))}
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
