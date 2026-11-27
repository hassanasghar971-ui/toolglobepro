"use client";

import { useSyncExternalStore } from "react";

interface Props {
  canonicalOrigin: string;
}

const subscribe = () => () => undefined;
const getHref = () => window.location.href;
const getServerHref = () => "";

export default function NotFoundInfo({ canonicalOrigin }: Props) {
  const href = useSyncExternalStore(subscribe, getHref, getServerHref);
  const sha = (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7);

  if (href === "") return null;

  const url = new URL(href);
  const wrongHost = url.origin !== canonicalOrigin;
  const fixed = canonicalOrigin + url.pathname + url.search;

  return (
    <div className="mx-auto mt-10 max-w-xl rounded-xl border border-slate-200 p-4 text-left text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400">
      <p className="font-semibold text-slate-900 dark:text-white">Why am I seeing this page?</p>
      <p className="mt-2 break-all">Address: {href}</p>
      <p className="mt-1">Site version: {sha === "" ? "unknown" : sha}</p>
      {wrongHost && (
        <div className="mt-3">
          <p>
            You are on {url.origin}, which is not the main address of this site. Try the same page
            on the main site:
          </p>
          <a href={fixed} className="btn-secondary mt-2">
            Open this page on the main site
          </a>
        </div>
      )}
    </div>
  );
}
