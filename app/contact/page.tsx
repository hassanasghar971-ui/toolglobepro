import { buildMetadata } from "@/lib/seo";
import { SITE, LEGAL_UPDATED_ISO, whatsappLink } from "@/lib/site";
import { webPageSchema } from "@/lib/schema";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import Icon from "@/components/ui/Icon";
import ContactForm from "@/components/contact/ContactForm";

export const metadata = buildMetadata({
  title: "Contact ToolGlobe Pro",
  description: "Get in touch with Hassan Asghar, the developer of ToolGlobe Pro, by email or WhatsApp. Report a bug, request a tool or ask about partnerships.",
  path: "/contact",
  keywords: ["contact toolglobe pro", "report a bug", "request a tool"],
});

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <JsonLd
        data={webPageSchema({
          name: "Contact ToolGlobe Pro",
          description: "Ways to contact the ToolGlobe Pro developer.",
          path: "/contact",
          type: "ContactPage",
          modified: LEGAL_UPDATED_ISO,
        })}
      />
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Contact", href: "/contact" },
        ]}
      />
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        Contact us
      </h1>
      <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-400">
        Found a bug, need a tool that doesn&apos;t exist yet, or want to talk about a partnership? Message{" "}
        {SITE.owner.name} directly. Every message is read by a real person.
      </p>
      <div className="mt-10 grid gap-8 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <a
            href={`mailto:${SITE.owner.email}`}
            className="card flex items-start gap-4 p-5 transition hover:border-brand-400"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
              <Icon name="mail" />
            </span>
            <span>
              <span className="block font-semibold text-slate-900 dark:text-white">Email</span>
              <span className="block break-all text-sm text-slate-600 dark:text-slate-400">
                {SITE.owner.email}
              </span>
            </span>
          </a>
          {SITE.owner.whatsapp.map((w) => (
            <a
              key={w.number}
              href={whatsappLink(w.number)}
              target="_blank"
              rel="noopener noreferrer"
              className="card flex items-start gap-4 p-5 transition hover:border-brand-400"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                <Icon name="message" />
              </span>
              <span>
                <span className="block font-semibold text-slate-900 dark:text-white">{w.label}</span>
                <span className="block text-sm text-slate-600 dark:text-slate-400">{w.display}</span>
              </span>
            </a>
          ))}
          <p className="px-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Privacy-related requests (EU/UK GDPR or California CCPA) are handled through the same channels. Please mention &quot;Privacy request&quot; in your message.
          </p>
        </div>
        <div className="card p-5 sm:p-7 lg:col-span-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Send a message</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            This form opens your own email app or WhatsApp with the message prefilled, so nothing is stored on our servers.
          </p>
          <div className="mt-6">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
