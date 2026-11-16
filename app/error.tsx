"use client";

import { useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
        <Icon name="alert" size={28} />
      </div>
      <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">Something went wrong</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-400">
        An unexpected error interrupted this page. Your data never left your device. Please try again.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          <Icon name="refresh" size={18} /> Try again
        </button>
        <Link href="/" className="btn-secondary">
          Go home
        </Link>
      </div>
    </div>
  );
}
