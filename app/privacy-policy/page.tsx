import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";
import LegalLayout from "@/components/layout/LegalLayout";
import { PrivacyChoicesButton } from "@/components/ads/ConsentBanner";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description: "How ToolGlobe Pro handles your data: browser-side processing, advertising cookies, GDPR rights for EU/UK users and CCPA rights for California residents.",
  path: "/privacy-policy",
  keywords: ["privacy policy", "GDPR", "CCPA", "toolglobe pro privacy"],
});

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy" description="How ToolGlobe Pro handles your data." path="/privacy-policy">
      <p>
        This policy explains what information {SITE.name} (&quot;we&quot;, &quot;us&quot;) handles when you visit{" "}
        {SITE.url} and use our tools, and the choices you have. The short version: the content you process in our tools stays on your device.
      </p>
      <h2>1. The content you process</h2>
      <p>
        Text, files and other inputs you enter into our tools are processed locally in your browser. We do not upload, receive, store or inspect them. Closing the tab clears them. A few tools are different by nature. For example, the IP Address Finder has to ask a third-party geolocation service about your connection. Any such exception is stated on that tool&apos;s page.
      </p>
      <h2>2. Information we and our providers collect</h2>
      <ul>
        <li>
          <strong>Technical logs.</strong> Our hosting provider may automatically record standard request data such as IP address, browser type, pages requested and timestamps for security and reliability.
        </li>
        <li>
          <strong>Local storage on your device.</strong> We store your theme preference, your advertising consent choice and a small advertising frequency-cap timestamp. These stay in your browser and are not used to identify you.
        </li>
        <li>
          <strong>Messages you send us.</strong> If you contact us by email or WhatsApp, we receive what you choose to send and use it only to reply.
        </li>
      </ul>
      <h2>3. Advertising</h2>
      <p>
        {SITE.name} is funded by advertising delivered by Adsterra (native banners and a social bar notification-style unit). Ad networks may use cookies, device identifiers and similar technologies to deliver and measure ads. We do not control the data they collect; see{" "}
        <a href="https://adsterra.com/privacy-policy/" target="_blank" rel="noopener noreferrer">
          Adsterra&apos;s privacy policy
        </a>
        . To limit repetition, the social bar is shown at most once per session and once every 30 minutes.
      </p>
      <h2>4. Visitors in the EU, EEA, UK and Switzerland (GDPR)</h2>
      <p>
        If we detect that you are browsing from Europe, advertising scripts are <strong>not loaded until you give consent</strong> (Article 6(1)(a) GDPR). You can accept or reject with equal ease, and change your mind at any time using the &quot;Your Privacy Choices&quot; link in the footer. You also have the right to access, correct, erase, restrict or port personal data we hold, to object to processing, and to complain to your local data protection authority. Because the site is hosted on a global network, data such as your IP address may be processed outside your country under appropriate safeguards.
      </p>
      <h2>5. California and other US states (CCPA/CPRA)</h2>
      <p>
        Advertising technology may count as a &quot;sale&quot; or &quot;sharing&quot; of personal information under California law. You can opt out at any time with the control below. We also honour the Global Privacy Control (GPC) signal from your browser as a valid opt-out. We do not knowingly sell personal information for money, and we will not discriminate against you for exercising your rights. California residents may request to know or delete personal information we hold, and may use an authorised agent, via our <Link href="/contact">contact page</Link>.
      </p>
      <p>
        <PrivacyChoicesButton className="btn-secondary" label="Do Not Sell or Share My Personal Information" />
      </p>
      <h2>6. Children</h2>
      <p>
        Our tools are general-purpose and not directed at children under 13 (or under 16 where local law sets a higher age). We do not knowingly collect personal information from children.
      </p>
      <h2>7. Retention and security</h2>
      <p>
        We keep very little: hosting logs are retained for the period set by our provider, and messages you send are kept only as long as needed to respond. Pages are served over HTTPS and tools run client-side, which reduces the data exposed in the first place.
      </p>
      <h2>8. Changes to this policy</h2>
      <p>
        We may update this policy as the site evolves. The date at the top shows the latest revision; material changes will be reflected here.
      </p>
      <h2>9. Contact</h2>
      <p>
        Questions or requests: <a href={`mailto:${SITE.owner.email}`}>{SITE.owner.email}</a> or via WhatsApp on {SITE.owner.whatsapp[0].display}. Operator: {SITE.owner.name}.
      </p>
    </LegalLayout>
  );
}
