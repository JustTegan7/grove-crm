import type { Metadata } from "next";
import { Section } from "../../../components/sections/Section";
import { pageMetadata } from "../../../lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Privacy", description: "How Grove handles your data.", path: "/privacy" });

export default function PrivacyPage() {
  return (
    <Section heading="Privacy">
      <div className="mx-auto max-w-2xl space-y-4 text-sm text-muted">
        <p>Grove is in early access and is used by invited teams only. This page will be replaced with a full, reviewed privacy policy before Grove opens to the public.</p>
        <p>Grove stores the business contact details your team enters so you can follow up with them. Grove never stores financing, credit, Social Security or loan data. We do not sell your data.</p>
        <p>If you join the waitlist, we store your email only to tell you when Grove is ready.</p>
      </div>
    </Section>
  );
}
