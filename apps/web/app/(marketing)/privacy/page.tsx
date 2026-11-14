import type { Metadata } from "next";
import { Section } from "../../../components/sections/Section";
import { pageMetadata } from "../../../lib/seo";
import { siteConfig } from "../../../lib/site-config";

export const metadata: Metadata = pageMetadata({ title: "Privacy", description: "How Grove handles your data.", path: "/privacy" });

const LIST = "list-disc space-y-1 pl-5";
const H = "pt-4 text-base font-semibold text-ink";

export default function PrivacyPage() {
  return (
    <Section heading="Privacy">
      <div className="mx-auto max-w-2xl space-y-4 text-sm text-muted">
        <p>Grove is a customer management system made by {siteConfig.parent}. This page explains what Grove collects, why, and how to have it deleted. Last updated November 2026.</p>

        <h2 className={H}>What Grove collects</h2>
        <ul className={LIST}>
          <li>Your account: name, email address and a password (stored hashed, never in plain text).</li>
          <li>What your team enters: business names, contact names, phone numbers, email addresses, notes, tasks, message templates and the pipeline stage of each business.</li>
          <li>Files and photos you attach to a business. They are stored privately and only people in your workspace can open them.</li>
          <li>If you turn on daily reminders in the phone app, a push notification token for your device and your time zone, so the reminder arrives at the right hour.</li>
          <li>If you join the waitlist, your email, only to tell you when Grove is ready.</li>
          <li>Billing, when it applies: payments are handled by Stripe. Grove never sees or stores your card number.</li>
        </ul>

        <h2 className={H}>What Grove does not collect</h2>
        <ul className={LIST}>
          <li>No financing, credit, Social Security or loan data. Grove is built never to store it.</li>
          <li>No advertising, no ad identifiers and no tracking across other apps or sites.</li>
          <li>We do not sell your data.</li>
        </ul>

        <h2 className={H}>Camera and photos</h2>
        <p>The phone app asks for the camera only when you scan a login QR code or take a photo to attach to a business. It asks for your photo library only when you choose a photo to attach. Grove does not read your camera or photos at any other time.</p>

        <h2 className={H}>Who handles data for us</h2>
        <p>Grove uses a small set of providers to run: Vercel (hosting and private file storage), Neon (database), Resend (email), Stripe (payments) and Expo (delivering push notifications). They process data only to provide those services.</p>

        <h2 className={H}>How long we keep it</h2>
        <p>Your data stays while your account is active. When a business is moved to Recycle Bin or Do Not Contact, the person details (contact name, role, phone, email and social links) are cleared after 28 days, and the business name and history are kept. Deleted accounts are removed as described below.</p>

        <h2 className={H}>Deleting your account</h2>
        <p>
          You can delete your account at any time from the More tab in the phone app, or by emailing us. See{" "}
          <a className="underline" href="/delete-account">how to delete your account and data</a>.
        </p>

        <h2 className={H}>Contact</h2>
        <p>
          Questions about privacy: <a className="underline" href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a>.
        </p>
      </div>
    </Section>
  );
}
