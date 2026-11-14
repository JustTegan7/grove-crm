import type { Metadata } from "next";
import { Section } from "../../../components/sections/Section";
import { pageMetadata } from "../../../lib/seo";
import { siteConfig } from "../../../lib/site-config";

export const metadata: Metadata = pageMetadata({ title: "Delete your account", description: "How to delete your Grove account and data.", path: "/delete-account" });

const LIST = "list-decimal space-y-1 pl-5";
const H = "pt-4 text-base font-semibold text-ink";

export default function DeleteAccountPage() {
  return (
    <Section heading="Delete your account">
      <div className="mx-auto max-w-2xl space-y-4 text-sm text-muted">
        <p>You can delete your Grove account and your data yourself, or ask us to do it.</p>

        <h2 className={H}>In the app</h2>
        <ol className={LIST}>
          <li>Sign in to the Grove phone app.</li>
          <li>Open the More tab.</li>
          <li>Tap Delete my account and type your email address to confirm.</li>
        </ol>

        <h2 className={H}>By email</h2>
        <p>
          If you cannot sign in, email <a className="underline" href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a> from the address on your account with the subject line Delete my account. We delete it within 30 days and confirm by reply.
        </p>

        <h2 className={H}>What gets deleted</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Your login, name and email, and any push notification token for your devices.</li>
          <li>If you are the only person in your workspace, the whole workspace goes too: businesses, contacts, notes, tasks, templates, files and photos, and any subscription is cancelled.</li>
          <li>If teammates remain, your businesses and tasks are handed to a teammate so their work is not lost. Notes and history stay, without your name.</li>
        </ul>
        <p>Deletion cannot be undone.</p>
      </div>
    </Section>
  );
}
