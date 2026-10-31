"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TIERS } from "@grove/core";
import {
  assignOwnerAction,
  deleteContactAction,
  logActivityAction,
  markRepliedAction,
  moveStageAction,
  updateContactAction,
} from "../../app/(app)/actions";
import { ReminderDialog, type MemberOpt } from "./Dialogs";
import { IconBell, IconPhone } from "./Icons";
import { useAct } from "./useAct";

export type ProfileContact = {
  id: string;
  name: string;
  niche: string | null;
  source: string | null;
  stageId: string;
  ownerId: string;
  contactName: string | null;
  contactRole: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  social: string | null;
  notes: string | null;
  tier: string | null;
  siteUrl: string | null;
  launchDate: string | null;
  checkinFrequencyDays: number | null;
  cadenceActive: boolean;
};

export function ProfileActions({
  contact,
  stages,
  members,
  today,
  canDelete,
}: {
  contact: ProfileContact;
  stages: { id: string; label: string }[];
  members: MemberOpt[];
  today: string;
  canDelete: boolean;
}) {
  const { act, pending } = useAct();
  const router = useRouter();
  const [rem, setRem] = useState(false);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="pf-stage">Stage</label>
          <select id="pf-stage" className="input" value={contact.stageId} disabled={pending} onChange={(e) => act(() => moveStageAction(contact.id, e.target.value))}>
            {stages.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pf-owner">Owner</label>
          <select id="pf-owner" className="input" value={contact.ownerId} disabled={pending} onChange={(e) => act(() => assignOwnerAction(contact.id, e.target.value))}>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {contact.phone && <a href={`tel:${contact.phone}`} className="btn btn-soft btn-sm"><IconPhone /> Call</a>}
        <button type="button" className="btn btn-soft btn-sm" onClick={() => setRem(true)}><IconBell /> Reminder</button>
        {contact.cadenceActive && (
          <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => act(() => markRepliedAction(contact.id))}>They replied</button>
        )}
        {canDelete && (
          <button
            type="button"
            className="btn btn-danger btn-sm ml-auto"
            disabled={pending}
            onClick={() => {
              if (confirm(`Delete ${contact.name}? This removes it and its tasks.`)) act(() => deleteContactAction(contact.id), () => router.push("/businesses"));
            }}
          >
            Delete
          </button>
        )}
      </div>
      <ReminderDialog open={rem} onClose={() => setRem(false)} businesses={[{ id: contact.id, name: contact.name }]} today={today} contactId={contact.id} />
    </div>
  );
}

function Field({ name, label, value, type = "text", placeholder }: { name: string; label: string; value: string | number | null; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="label" htmlFor={`f-${name}`}>{label}</label>
      <input id={`f-${name}`} name={name} type={type} defaultValue={value ?? ""} placeholder={placeholder} className="input" />
    </div>
  );
}

export function ProfileForm({ contact, isClient }: { contact: ProfileContact; isClient: boolean }) {
  const { act, pending } = useAct();
  return (
    <form action={(f) => act(() => updateContactAction(f))} className="space-y-6">
      <input type="hidden" name="id" value={contact.id} />
      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 text-sm font-bold">Business</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="name" label="Business name" value={contact.name} />
          <Field name="niche" label="Niche" value={contact.niche} />
          <Field name="source" label="How we found them" value={contact.source} />
          <Field name="website" label="Website, Yelp or Facebook" value={contact.website} />
        </div>
      </fieldset>
      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 text-sm font-bold">Contact</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="contactName" label="Owner or manager name" value={contact.contactName} />
          <Field name="contactRole" label="Their role" value={contact.contactRole} placeholder="Owner, manager..." />
          <Field name="phone" label="Business phone" value={contact.phone} type="tel" />
          <Field name="email" label="Email" value={contact.email} type="email" />
        </div>
        <div>
          <label className="label" htmlFor="f-social">Socials</label>
          <textarea id="f-social" name="social" defaultValue={contact.social ?? ""} rows={2} className="input" placeholder="Instagram, Facebook, TikTok links" />
        </div>
      </fieldset>
      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 text-sm font-bold">Site and plan</legend>
        <div>
          <span className="label">Subscription tier</span>
          <div className="flex flex-wrap gap-2">
            <label className="pill cursor-pointer bg-surface-2 px-3 py-1 text-sm has-[:checked]:bg-primary has-[:checked]:text-primary-fg">
              <input type="radio" name="tier" value="" defaultChecked={!contact.tier} className="sr-only" /> None
            </label>
            {TIERS.map((t) => (
              <label key={t} className="pill cursor-pointer bg-surface-2 px-3 py-1 text-sm has-[:checked]:bg-primary has-[:checked]:text-primary-fg">
                <input type="radio" name="tier" value={t} defaultChecked={contact.tier === t} className="sr-only" /> {t}
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field name="siteUrl" label="Live site URL" value={contact.siteUrl} />
          <Field name="launchDate" label="Launch date" value={contact.launchDate} type="date" />
          <div>
            <label className="label" htmlFor="f-freq">Client check-ins</label>
            <select id="f-freq" name="checkinFrequencyDays" defaultValue={contact.checkinFrequencyDays ?? ""} className="input">
              <option value="">Default (monthly)</option>
              <option value="30">Monthly</option>
              <option value="60">Every other month</option>
            </select>
            {!isClient && <p className="mt-1 text-xs text-muted">Used once they become a client.</p>}
          </div>
        </div>
      </fieldset>
      <fieldset className="card space-y-2 p-5">
        <legend className="px-1 text-sm font-bold">Notes</legend>
        <label htmlFor="f-notes" className="sr-only">Notes</label>
        <textarea id="f-notes" name="notes" defaultValue={contact.notes ?? ""} rows={5} className="input" placeholder="Anything worth remembering about this business" />
      </fieldset>
      <div className="sticky bottom-20 flex justify-end md:bottom-4">
        <button className="btn btn-primary shadow-lg" disabled={pending}>{pending ? "Saving..." : "Save changes"}</button>
      </div>
    </form>
  );
}

export function LogBox({ contactId }: { contactId: string }) {
  const { act, pending } = useAct();
  const [key, setKey] = useState(0);
  return (
    <form key={key} action={(f) => act(() => logActivityAction(f), () => setKey((k) => k + 1))} className="space-y-2">
      <input type="hidden" name="contactId" value={contactId} />
      <label htmlFor="log-body" className="sr-only">What happened</label>
      <input id="log-body" name="body" required className="input" placeholder="Left a voicemail, sent the mockup..." />
      <div className="flex gap-2">
        <label htmlFor="log-type" className="sr-only">Type</label>
        <select id="log-type" name="type" className="input flex-1" defaultValue="call">
          <option value="call">Call</option>
          <option value="text">Text</option>
          <option value="email">Email</option>
          <option value="note">Note</option>
        </select>
        <button className="btn btn-soft" disabled={pending}>Log it</button>
      </div>
    </form>
  );
}
