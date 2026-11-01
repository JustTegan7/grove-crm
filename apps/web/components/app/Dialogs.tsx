"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createContactAction, createReminderAction, findDuplicatesAction } from "../../app/(app)/actions";
import { useAct } from "./useAct";

export type MemberOpt = { id: string; name: string; color: string; role: string };
export type BizOpt = { id: string; name: string };

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line p-0 shadow-2xl" aria-label={title}>
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-lg font-bold">{title}</h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">Close</button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto p-5">{open && children}</div>
    </dialog>
  );
}

export function NewLeadDialog({ open, onClose, members, meId }: { open: boolean; onClose: () => void; members: MemberOpt[]; meId: string }) {
  const { act, pending } = useAct();
  const router = useRouter();
  const [more, setMore] = useState(false);
  // null = not checked yet. A non-empty list means we warned once; the next submit adds anyway.
  const [dups, setDups] = useState<{ id: string; name: string; reason: string }[] | null>(null);
  const [checking, startCheck] = useTransition();

  function create(f: FormData) {
    act(() => createContactAction(f), (r) => {
      onClose();
      setMore(false);
      setDups(null);
      if (r.id) router.push(`/businesses/${r.id}`);
    });
  }

  function submit(f: FormData) {
    if (dups && dups.length) return create(f);
    startCheck(async () => {
      const found = await findDuplicatesAction(String(f.get("name") ?? ""), String(f.get("phone") ?? ""));
      if (found.length) setDups(found);
      else create(f);
    });
  }

  function close() {
    setDups(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={close} title="New lead">
      <form className="space-y-4" action={submit} onChange={(e) => { const n = (e.target as unknown as HTMLInputElement).name; if (n === "name" || n === "phone") setDups(null); }}>
        <div>
          <label className="label" htmlFor="nl-name">Business name</label>
          <input id="nl-name" name="name" className="input" required autoFocus />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="nl-phone">Phone</label>
            <input id="nl-phone" name="phone" className="input" type="tel" />
          </div>
          <div>
            <label className="label" htmlFor="nl-owner">Owner</label>
            <select id="nl-owner" name="ownerId" className="input" defaultValue={meId}>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>
        {!more ? (
          <button type="button" className="text-sm font-semibold text-muted underline" onClick={() => setMore(true)}>Add more details</button>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="nl-contact">Contact name</label><input id="nl-contact" name="contactName" className="input" /></div>
            <div><label className="label" htmlFor="nl-email">Email</label><input id="nl-email" name="email" type="email" className="input" /></div>
            <div><label className="label" htmlFor="nl-niche">Niche</label><input id="nl-niche" name="niche" className="input" placeholder="Salon, coffee shop..." /></div>
            <div><label className="label" htmlFor="nl-source">How we found them</label><input id="nl-source" name="source" className="input" placeholder="Walk-in, Google Maps..." /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="nl-web">Website, Yelp or Facebook</label><input id="nl-web" name="website" className="input" /></div>
          </div>
        )}
        {dups && dups.length > 0 && (
          <div role="alert" className="rounded-lg border border-today/40 bg-today/10 p-3 text-sm">
            <p className="font-semibold">This might already be in Grove:</p>
            <ul className="mt-1 space-y-1">
              {dups.map((d) => (
                <li key={d.id}>
                  <Link href={`/businesses/${d.id}`} onClick={close} className="font-semibold underline">{d.name}</Link>
                  <span className="text-muted"> ({d.reason})</span>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-muted">Open it instead, or press Add anyway.</p>
          </div>
        )}
        <p className="text-xs text-muted">Grove schedules the Day 1, 3, 5, 10 and 14 follow-ups for you.</p>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={close}>Cancel</button>
          <button className="btn btn-primary" disabled={pending || checking}>
            {pending || checking ? "Adding..." : dups && dups.length ? "Add anyway" : "Add lead"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ReminderDialog({ open, onClose, businesses, today, contactId }: { open: boolean; onClose: () => void; businesses: BizOpt[]; today: string; contactId?: string }) {
  const { act, pending } = useAct();
  return (
    <Modal open={open} onClose={onClose} title="Set a reminder">
      <form className="space-y-4" action={(f) => act(() => createReminderAction(f), () => onClose())}>
        <div>
          <label className="label" htmlFor="rm-title">What</label>
          <input id="rm-title" name="title" className="input" required autoFocus placeholder="Send the proposal" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="rm-biz">Business</label>
            <select id="rm-biz" name="contactId" className="input" defaultValue={contactId ?? ""}>
              <option value="">None</option>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="rm-day">Day</label>
            <input id="rm-day" name="dueDate" type="date" className="input" min={today} defaultValue={today} required />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="rm-note">Why (optional)</label>
          <textarea id="rm-note" name="note" className="input" rows={2} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={pending}>{pending ? "Saving..." : "Set reminder"}</button>
        </div>
      </form>
    </Modal>
  );
}
