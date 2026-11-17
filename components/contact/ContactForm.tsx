"use client";

import { useId, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Link from "next/link";

const CONTACT_EMAIL = "hassanasghar7868686@gmail.com";

const WHATSAPP_CONTACTS = [
  { label: "WhatsApp 1", display: "+92 345 1098607", digits: "923451098607" },
  { label: "WhatsApp 2", display: "+92 349 7726469", digits: "923497726469" },
] as const;

const TOPICS = [
  "General question",
  "Bug report",
  "Tool suggestion",
  "Feature request",
  "Privacy / data request",
  "Advertising & partnerships",
  "Other",
] as const;

const MAX_MESSAGE_LENGTH = 2000;
const MAILTO_BODY_LIMIT = 1500;

interface FormValues {
  name: string;
  email: string;
  topic: string;
  message: string;
  website: string;
  consent: boolean;
}

type FieldName = "name" | "email" | "message" | "consent";
type FormErrors = Partial<Record<FieldName, string>>;

interface Status {
  type: "idle" | "success" | "error";
  text: string;
}

const INITIAL_VALUES: FormValues = {
  name: "",
  email: "",
  topic: TOPICS[0],
  message: "",
  website: "",
  consent: false,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (values.name.trim().length < 2) errors.name = "Please enter your name (at least 2 characters).";
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = "Please enter a valid email address.";
  const messageLength = values.message.trim().length;
  if (messageLength < 10) errors.message = "Your message should be at least 10 characters long.";
  else if (messageLength > MAX_MESSAGE_LENGTH) {
    errors.message = `Please keep your message under ${MAX_MESSAGE_LENGTH} characters.`;
  }
  if (!values.consent) errors.consent = "Please confirm you agree to the privacy notice.";
  return errors;
}

function buildMessage(values: FormValues): string {
  return [
    "Hello Hassan,",
    "",
    values.message.trim(),
    "",
    "—",
    `Name: ${values.name.trim()}`,
    `Email: ${values.email.trim()}`,
    `Topic: ${values.topic}`,
    "Sent via the ToolGlobe Pro contact form",
  ].join("\n");
}

const inputClass =
  "block w-full rounded-xl border bg-white px-4 py-2.5 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-2 focus:outline-offset-0 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500";
const inputOkClass = "border-slate-300 focus:border-indigo-500 focus:outline-indigo-500/40 dark:border-slate-700";
const inputErrorClass = "border-red-400 focus:border-red-500 focus:outline-red-500/40 dark:border-red-500/70";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-800 dark:text-slate-200";
const errorTextClass = "mt-1.5 text-sm text-red-600 dark:text-red-400";

export function ContactForm() {
  const uid = useId();
  const ids = {
    name: `${uid}-name`,
    email: `${uid}-email`,
    topic: `${uid}-topic`,
    message: `${uid}-message`,
    website: `${uid}-website`,
    consent: `${uid}-consent`,
  };

  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<Status>({ type: "idle", text: "" });

  const updateField =
    (field: keyof FormValues) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const target = event.target;
      const nextValue = target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value;
      setValues((current) => ({ ...current, [field]: nextValue }));
      if (field in errors) {
        setErrors((current) => {
          const next = { ...current };
          delete next[field as FieldName];
          return next;
        });
      }
      if (status.type !== "idle") setStatus({ type: "idle", text: "" });
    };

  const runValidation = (): boolean => {
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setStatus({ type: "error", text: "Please fix the highlighted fields and try again." });
      const firstField = (["name", "email", "message", "consent"] as const).find((key) => found[key]);
      if (firstField) document.getElementById(ids[firstField])?.focus();
      return false;
    }
    return true;
  };

  const isBot = values.website.trim() !== "";

  const sendEmail = () => {
    if (!runValidation()) return;
    if (isBot) {
      setStatus({ type: "success", text: "Thanks! Your message has been prepared." });
      return;
    }
    const subject = `[ToolGlobe Pro] ${values.topic} — ${values.name.trim()}`;
    let body = buildMessage(values);
    if (body.length > MAILTO_BODY_LIMIT) {
      body = `${body.slice(0, MAILTO_BODY_LIMIT)}…\n\n(Message shortened. Use the “Copy message” button for the full text.)`;
    }
    const url = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
    setStatus({
      type: "success",
      text: `Your email app should now open with the message addressed to ${CONTACT_EMAIL}. If nothing happens, use “Copy message” and email us manually.`,
    });
  };

  const sendWhatsApp = (digits: string) => {
    if (!runValidation()) return;
    if (isBot) {
      setStatus({ type: "success", text: "Thanks! Your message has been prepared." });
      return;
    }
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(buildMessage(values))}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setStatus({ type: "success", text: "WhatsApp is opening in a new tab with your message ready to send." });
  };

  const copyMessage = async () => {
    if (!runValidation()) return;
    try {
      await navigator.clipboard.writeText(
        `To: ${CONTACT_EMAIL}\nSubject: [ToolGlobe Pro] ${values.topic}\n\n${buildMessage(values)}`,
      );
      setStatus({ type: "success", text: "Message copied to your clipboard. Paste it into any email or chat app." });
    } catch {
      setStatus({ type: "error", text: "Couldn't access the clipboard. Please select and copy your message manually." });
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendEmail();
  };

  const handleReset = () => {
    setValues(INITIAL_VALUES);
    setErrors({});
    setStatus({ type: "idle", text: "" });
  };

  const fieldClass = (field: FieldName) => `${inputClass} ${errors[field] ? inputErrorClass : inputOkClass}`;
  const remaining = MAX_MESSAGE_LENGTH - values.message.length;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900"
        aria-label="Contact form"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor={ids.name} className={labelClass}>Your name</label>
            <input
              id={ids.name}
              name="name"
              type="text"
              autoComplete="name"
              value={values.name}
              onChange={updateField("name")}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? `${ids.name}-error` : undefined}
              className={fieldClass("name")}
              placeholder="Jane Doe"
            />
            {errors.name && <p id={`${ids.name}-error`} className={errorTextClass}>{errors.name}</p>}
          </div>

          <div>
            <label htmlFor={ids.email} className={labelClass}>Your email</label>
            <input
              id={ids.email}
              name="email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={updateField("email")}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? `${ids.email}-error` : undefined}
              className={fieldClass("email")}
              placeholder="you@example.com"
            />
            {errors.email && <p id={`${ids.email}-error`} className={errorTextClass}>{errors.email}</p>}
          </div>
        </div>

        <div>
          <label htmlFor={ids.topic} className={labelClass}>Topic</label>
          <select
            id={ids.topic}
            name="topic"
            value={values.topic}
            onChange={updateField("topic")}
            className={`${inputClass} ${inputOkClass}`}
          >
            {TOPICS.map((topic) => (
              <option key={topic} value={topic}>{topic}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor={ids.message} className={labelClass}>Message</label>
            <span className={`text-xs tabular-nums ${remaining < 0 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`} aria-live="polite">
              {remaining} characters left
            </span>
          </div>
          <textarea
            id={ids.message}
            name="message"
            rows={6}
            value={values.message}
            onChange={updateField("message")}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? `${ids.message}-error` : undefined}
            className={`${fieldClass("message")} resize-y`}
            placeholder="How can we help? Tell us about the tool, the bug or the idea…"
          />
          {errors.message && <p id={`${ids.message}-error`} className={errorTextClass}>{errors.message}</p>}
        </div>

        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label htmlFor={ids.website}>Leave this field empty</label>
          <input
            id={ids.website}
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={updateField("website")}
          />
        </div>

        <div>
          <div className="flex items-start gap-3">
            <input
              id={ids.consent}
              name="consent"
              type="checkbox"
              checked={values.consent}
              onChange={updateField("consent")}
              aria-invalid={Boolean(errors.consent)}
              aria-describedby={errors.consent ? `${ids.consent}-error` : undefined}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor={ids.consent} className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              I understand that my message will be sent through my own email app or WhatsApp, and that ToolGlobe Pro does
              not store it on any server. I have read the{" "}
              <Link href="/privacy-policy" className="font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400">
                Privacy Policy
              </Link>
              .
            </label>
          </div>
          {errors.consent && <p id={`${ids.consent}-error`} className={errorTextClass}>{errors.consent}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          >
            Send via email
          </button>
          {WHATSAPP_CONTACTS.map((contact) => (
            <button
              key={contact.digits}
              type="button"
              onClick={() => sendWhatsApp(contact.digits)}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              {contact.label}
            </button>
          ))}
          <button
            type="button"
            onClick={copyMessage}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Copy message
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="text-sm font-medium text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
          >
            Reset
          </button>
        </div>

        <div aria-live="polite" role={status.type === "error" ? "alert" : "status"}>
          {status.type !== "idle" && (
            <p className={status.type === "success" ? "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200" : "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"}>
              {status.text}
            </p>
          )}
        </div>
      </form>

      <aside className="space-y-4" aria-label="Direct contact options">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Prefer to reach out directly?</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Hassan Asghar, creator of ToolGlobe Pro, reads every message personally.
          </p>

          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="font-medium text-slate-500 dark:text-slate-400">Email</dt>
              <dd className="mt-0.5">
                <a href={`mailto:${CONTACT_EMAIL}`} className="break-all font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400">
                  {CONTACT_EMAIL}
                </a>
              </dd>
            </div>
            {WHATSAPP_CONTACTS.map((contact) => (
              <div key={contact.digits}>
                <dt className="font-medium text-slate-500 dark:text-slate-400">{contact.label}</dt>
                <dd className="mt-0.5">
                  <a href={`https://wa.me/${contact.digits}`} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400">
                    {contact.display}
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
          <p className="font-semibold text-slate-800 dark:text-slate-100">Typical response time</p>
          <p className="mt-1">Within 24–48 hours. For bug reports, please mention your browser, device and the tool you were using.</p>
        </div>
      </aside>
    </div>
  );
}

export default ContactForm;
