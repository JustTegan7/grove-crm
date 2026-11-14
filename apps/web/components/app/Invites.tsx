"use client";

import { inviteMemberAction, revokeInviteAction } from "../../app/(app)/actions";
import { useAct } from "./useAct";

export function InviteForm() {
  const { act, pending } = useAct();
  return (
    <form className="mt-4 flex flex-wrap items-end gap-2" action={(f) => act(() => inviteMemberAction(f))}>
      <div className="min-w-56 flex-1">
        <label className="label" htmlFor="invite-email">Email</label>
        <input id="invite-email" name="email" type="email" required className="input" autoComplete="off" />
      </div>
      <div>
        <label className="label" htmlFor="invite-role">Role</label>
        <select id="invite-role" name="role" className="input" defaultValue="salesperson">
          <option value="salesperson">Salesperson</option>
          <option value="manager">Manager</option>
        </select>
      </div>
      <button className="btn btn-primary btn-sm" disabled={pending}>Send invite</button>
    </form>
  );
}

export function InviteRow({ id, email, role }: { id: string; email: string; role: string }) {
  const { act, pending } = useAct();
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="min-w-0 truncate"><span className="font-semibold">{email}</span> <span className="text-muted capitalize">· {role} · pending</span></span>
      <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => act(() => revokeInviteAction(id))}>Remove</button>
    </li>
  );
}
