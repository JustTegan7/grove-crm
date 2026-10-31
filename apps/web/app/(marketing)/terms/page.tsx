import type { Metadata } from "next";
import { Section } from "../../../components/sections/Section";
import { pageMetadata } from "../../../lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Terms", description: "Terms for using Grove.", path: "/terms" });

export default function TermsPage() {
  return (
    <Section heading="Terms">
      <div className="mx-auto max-w-2xl space-y-4 text-sm text-muted">
        <p>Grove is in early access and offered to invited teams as is. Full terms of service will be posted here before Grove opens to the public.</p>
      </div>
    </Section>
  );
}
