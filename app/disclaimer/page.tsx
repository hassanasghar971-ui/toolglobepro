import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";
import LegalLayout from "@/components/layout/LegalLayout";

export const metadata = buildMetadata({
  title: "Disclaimer",
  description: "Important notes on the accuracy of ToolGlobe Pro results, browser memory limits for large files, advertising and third-party links.",
  path: "/disclaimer",
  keywords: ["disclaimer", "toolglobe pro disclaimer"],
});

export default function DisclaimerPage() {
  return (
    <LegalLayout title="Disclaimer" description="Important notes about using ToolGlobe Pro." path="/disclaimer">
      <p>
        The information and tools on {SITE.name} are provided for general informational and utility purposes. Please read the points below before relying on any result.
      </p>
      <h2>Accuracy of results</h2>
      <p>
        We work hard to make the tools correct, but we cannot guarantee that every output is free of error. Word and sentence counts follow common conventions that differ slightly between software. IP geolocation is an estimate based on third-party databases and can be off by many miles. Always verify important results independently.
      </p>
      <h2>Not professional advice</h2>
      <p>
        Nothing on this site is legal, financial, security-audit or other professional advice. A generated password is only as safe as how you store and use it; follow current best practice and use a reputable password manager for important accounts.
      </p>
      <h2>Large files and your device</h2>
      <p>
        Our file tools are engineered to handle files up to 600MB in the browser by processing them in chunks. Performance still depends on your device, available memory and browser. On older or low-memory devices, very large files may be slow or fail. Keep a copy of your original file; we are not responsible for lost or corrupted data.
      </p>
      <h2>Advertising and external links</h2>
      <p>
        Ads are supplied by third parties and appear because they help fund the free tools. Their appearance is not an endorsement. We are not responsible for the content, products or privacy practices of advertisers or linked websites.
      </p>
      <h2>No affiliation</h2>
      <p>
        Product and company names mentioned on this site belong to their respective owners and are used for identification only.
      </p>
      <h2>Spotted a problem?</h2>
      <p>
        If you find an error, please tell us through the <Link href="/contact">contact page</Link> and we will fix it. See also our <Link href="/terms-and-conditions">Terms</Link> and{" "}
        <Link href="/privacy-policy">Privacy Policy</Link>.
      </p>
    </LegalLayout>
  );
}
