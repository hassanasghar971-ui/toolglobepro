"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  COUNTRIES,
  DEFAULT_DIAL,
  DEFAULT_LABEL,
  LABEL_MAX,
  MESSAGE_TEMPLATES,
  MESSAGE_WARN_CHARS,
  buildLinks,
  buildNumber,
} from "@/lib/whatsapp-link-engine";

type RowProps = {
  id: string;
  title: string;
  note: string;
  value: string;
  copied: string;
  onCopy: (id: string, value: string) => void;
};

function OutputRow(props: RowProps) {
  const { id, title, note, value, copied, onCopy } = props;
  const done = copied === id;
  return (
    <div className="rounded-xl border border-black/10 p-3 dark:border-white/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs opacity-70">{note}</p>
        </div>
        <button type="button" className="btn-secondary shrink-0" onClick={() => onCopy(id, value)}>
          {done ? "Copied" : "Copy"}
        </button>
      </div>
      <textarea
        readOnly
        rows={3}
        className="input mt-2 font-mono text-xs"
        aria-label={title}
        value={value}
        onFocus={(e) => e.currentTarget.select()}
      />
    </div>
  );
}

export default function WhatsAppLinkGeneratorTool() {
  const [dial, setDial] = useState(DEFAULT_DIAL);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [label, setLabel] = useState(DEFAULT_LABEL);
  const [copied, setCopied] = useState("");
  const timerRef = useRef(0);

  const num = useMemo(() => buildNumber(dial, phone), [dial, phone]);
  const links = useMemo(
    () => buildLinks(num.ready ? num.digits : "", message, label),
    [num, message, label],
  );

  useEffect(() => {
    return () => {
      window.clearTimeout(timerRef.current);
    };
  }, []);

  async function copyValue(id: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
    } catch {
      setCopied("failed");
    }
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(""), 2000);
  }

  function clearAll() {
    setDial(DEFAULT_DIAL);
    setPhone("");
    setMessage("");
    setLabel(DEFAULT_LABEL);
    setCopied("");
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="wa-country" className="mb-1 block text-sm font-medium">
              Country code
            </label>
            <select
              id="wa-country"
              className="input"
              value={dial}
              onChange={(e) => setDial(e.target.value)}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.dial}>
                  {c.name} (+{c.dial})
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="wa-phone" className="mb-1 block text-sm font-medium">
              Phone number
            </label>
            <input
              id="wa-phone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              className="input"
              placeholder="0345 1098607 or +44 7911 123456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        {num.error !== "" && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {num.error}
          </p>
        )}
        {num.hint !== "" && (
          <p className="text-sm text-amber-700 dark:text-amber-400">{num.hint}</p>
        )}
        {num.ready && (
          <p className="text-sm">
            Full number: <strong>+{num.digits}</strong>
          </p>
        )}

        <div>
          <label htmlFor="wa-message" className="mb-1 block text-sm font-medium">
            Pre-filled message (optional)
          </label>
          <textarea
            id="wa-message"
            rows={4}
            className="input"
            placeholder="Hi! I would like to know more about..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {MESSAGE_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                className="chip"
                onClick={() => setMessage(t.text)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs opacity-70">
            {message.length} characters
            {message.length > MESSAGE_WARN_CHARS
              ? ". Very long messages can break the link in some apps. Try to keep it shorter."
              : ""}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="wa-label" className="mb-1 block text-sm font-medium">
              Button or link text
            </label>
            <input
              id="wa-label"
              type="text"
              maxLength={LABEL_MAX}
              className="input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button type="button" className="btn-ghost" onClick={clearAll}>
              Clear all
            </button>
          </div>
        </div>
      </div>

      <div className="card space-y-4 p-5">
        <h2 className="text-lg font-semibold">Your links</h2>
        {num.ready ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={links.short}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Test on WhatsApp
              </a>
              <span className="text-xs opacity-70">Opens in a new tab. Nothing is sent until you press send.</span>
            </div>
            {copied === "failed" && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                The browser blocked copying. Tap the box and copy the text manually.
              </p>
            )}
            <OutputRow
              id="short"
              title="wa.me link"
              note="The standard click-to-chat link. Best for bios and messages."
              value={links.short}
              copied={copied}
              onCopy={copyValue}
            />
            <OutputRow
              id="api"
              title="api.whatsapp.com link"
              note="The longer form. Use it if a platform rejects wa.me links."
              value={links.api}
              copied={copied}
              onCopy={copyValue}
            />
            <OutputRow
              id="html"
              title="HTML link"
              note="A plain link for any web page."
              value={links.html}
              copied={copied}
              onCopy={copyValue}
            />
            <OutputRow
              id="button"
              title="HTML button"
              note="A styled button with inline CSS. You can change the colours."
              value={links.button}
              copied={copied}
              onCopy={copyValue}
            />
            <OutputRow
              id="markdown"
              title="Markdown link"
              note="For README files, blogs and docs."
              value={links.markdown}
              copied={copied}
              onCopy={copyValue}
            />
            <p className="text-sm opacity-80">
              Need a scannable code? Copy the wa.me link and paste it into the{" "}
              <Link href="/tools/qr-code-generator" className="underline">
                QR Code Generator
              </Link>
              .
            </p>
          </>
        ) : (
          <p className="text-sm opacity-70">
            Enter a valid phone number above and your links will appear here.
          </p>
        )}
      </div>
    </div>
  );
}
