import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { SITE, LEGAL_UPDATED_ISO, whatsappLink } from "@/lib/site";
import { webPageSchema } from "@/lib/schema";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";

export const metadata = buildMetadata({
  title: "About ToolGlobe Pro",
  description: "ToolGlobe Pro is a collection of free, private, browser-based online tools built by Hassan Asghar. Learn why nothing you use here is uploaded to a server.",
  path: "/about",
  keywords: ["about toolglobe pro", "private online tools", "Hassan Asghar"],
});

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <JsonLd
        data={webPageSchema({
          name: "About ToolGlobe Pro",
          description: "Who builds ToolGlobe Pro and how it works.",
          path: "/about",
          type: "AboutPage",
          modified: LEGAL_UPDATED_ISO,
        })}
      />
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "About", href: "/about" },
        ]}
      />
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        About ToolGlobe Pro
      </h1>
      <div className="article">
        <p>
          ToolGlobe Pro started with a simple annoyance: every time I needed a quick utility, such as counting the words in a draft or tidying a block of JSON, the &quot;free&quot; tool I found asked me to upload my data to someone else&apos;s server. For anything remotely sensitive, that never sat right with me.
        </p>
        <p>
          So I built the kind of toolbox I wanted to use myself: fast, clean, free, and honest about what happens to your data. In short, nothing happens to it. Your text and files stay in your browser.
        </p>
        <h2>How it works</h2>
        <p>
          Modern browsers are far more capable than most people realise. ToolGlobe Pro uses Web Workers to keep heavy jobs off the main thread, the Streams API to read files piece by piece, and chunked processing so that large inputs, up to 600MB in our file tools, don&apos;t lock up your tab. Because the work runs on your device, there is no upload queue and no waiting on a remote server.
        </p>
        <h2>What we stand for</h2>
        <ul>
          <li>
            <strong>Privacy first.</strong> Your content is processed locally. Where a tool must contact a third-party service (an IP lookup, for example), the tool page says so plainly.
          </li>
          <li>
            <strong>Genuinely free.</strong> No accounts, paywalls or daily limits. A small amount of advertising covers the hosting and development time.
          </li>
          <li>
            <strong>Useful explanations.</strong> Each tool comes with practical, human-written guidance, so you know what the output means and when to trust it.
          </li>
          <li>
            <strong>Respect for your choices.</strong> Visitors in the EU, UK and California get clear consent and opt-out controls for advertising. Read the{" "}
            <Link href="/privacy-policy">Privacy Policy</Link> for the details.
          </li>
        </ul>
        <h2>Who is behind it</h2>
        <p>
          ToolGlobe Pro is designed, built and maintained by <strong>{SITE.owner.name}</strong>, an independent web developer. I read every message, so if you spot a bug, want a new tool or have a partnership idea, reach out through the <Link href="/contact">contact page</Link>, by email at <a href={`mailto:${SITE.owner.email}`}>{SITE.owner.email}</a>, or on WhatsApp at{" "}
          <a href={whatsappLink(SITE.owner.whatsapp[0].number)} rel="noopener noreferrer" target="_blank">
            {SITE.owner.whatsapp[0].display}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
