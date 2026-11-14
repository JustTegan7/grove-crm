"use client";

import { setVisibilityAction } from "../../app/(app)/actions";
import { useAct } from "./useAct";

export function VisibilityForm({ current }: { current: "team" | "own" }) {
  const { act, pending } = useAct();
  return (
    <form className="mt-4 flex flex-wrap items-end gap-2" action={(f) => act(() => setVisibilityAction(f))}>
      <div className="min-w-64 flex-1">
        <label className="label" htmlFor="visibility">Who can see what</label>
        <select id="visibility" name="visibility" className="input" defaultValue={current}>
          <option value="team">Everyone sees every business and task</option>
          <option value="own">Salespeople see only their own</option>
        </select>
      </div>
      <button className="btn btn-primary btn-sm" disabled={pending}>Save</button>
    </form>
  );
}
