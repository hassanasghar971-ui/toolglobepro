import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";
import LegalLayout from "@/components/layout/LegalLayout";

export const metadata = buildMetadata({
  title: "Terms and Conditions",
  description: "The terms for using ToolGlobe Pro's free online tools, including acceptable use, intellectual property, warranty disclaimers and limits of liability.",
  path: "/terms-and-conditions",
  keywords: ["terms and conditions", "terms of use", "toolglobe pro terms"],
});

export default function TermsPage() {
  return (
    <LegalLayout title="Terms and Conditions" description="The terms for using ToolGlobe Pro." path="/terms-and-conditions">
      <p>
        By accessing or using {SITE.name} at {SITE.url} you agree to these Terms. If you do not agree, please do not use the site.
      </p>
      <h2>1. The service</h2>
      <p>
        {SITE.name} offers free online utilities that run in your web browser. We may add, change or remove tools, or suspend the site, at any time without notice.
      </p>
      <h2>2. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use the tools for anything unlawful, or to process content you have no right to use;</li>
        <li>attempt to disrupt, overload, scrape at abusive volume, or probe the site&apos;s security;</li>
        <li>copy or republish our written content, branding or code as your own;</li>
        <li>interfere with advertising in a way that misrepresents impressions or clicks.</li>
      </ul>
      <h2>3. Your content</h2>
      <p>
        You keep all rights to the text and files you process. Because processing happens in your browser, we do not receive that content and claim no licence to it. You are responsible for keeping your own backups of anything important.
      </p>
      <h2>4. Intellectual property</h2>
      <p>
        The site design, logo, written guidance and source code are owned by {SITE.owner.name} or used under licence. You may link to any page freely.
      </p>
      <h2>5. No warranty</h2>
      <p>
        The tools are provided &quot;as is&quot; and &quot;as available&quot;, without warranties of any kind, express or implied, including accuracy, fitness for a particular purpose and uninterrupted availability. Results, such as word counts, geolocation estimates or generated passwords, should be checked before you rely on them for important decisions. See the{" "}
        <Link href="/disclaimer">Disclaimer</Link>.
      </p>
      <h2>6. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, {SITE.owner.name} and {SITE.name} are not liable for any indirect, incidental, special or consequential damages, or for loss of data, profits or goodwill, arising from your use of, or inability to use, the site. Nothing in these Terms limits liability that cannot be limited by law, including your statutory consumer rights.
      </p>
      <h2>7. Third-party advertising and links</h2>
      <p>
        The site displays third-party ads and may link to external sites. We don&apos;t endorse or control them and are not responsible for their content or practices. Advertising is governed by our{" "}
        <Link href="/privacy-policy">Privacy Policy</Link>.
      </p>
      <h2>8. Changes</h2>
      <p>
        We may revise these Terms from time to time. Continued use after a revision means you accept the updated Terms.
      </p>
      <h2>9. Governing law</h2>
      <p>
        These Terms are governed by the laws of the Islamic Republic of Pakistan, without prejudice to any mandatory consumer-protection rights you hold in your country of residence.
      </p>
      <h2>10. Contact</h2>
      <p>
        Questions about these Terms: <a href={`mailto:${SITE.owner.email}`}>{SITE.owner.email}</a>.
      </p>
    </LegalLayout>
  );
}
