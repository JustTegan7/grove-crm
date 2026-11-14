"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startWorkspaceAction } from "./actions";

const TYPES = [
  { value: "small_business", label: "Small business", hint: "A shop or service company with a few people." },
  { value: "dealership", label: "Dealership", hint: "Appointments, showroom visits and sold-customer check-ins." },
  { value: "door_to_door", label: "Door to door", hint: "Quick visits logged from the street." },
  { value: "big_business", label: "Big business", hint: "Larger team with managers and salespeople." },
] as const;

export function StartForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const r = await startWorkspaceAction(new FormData(e.currentTarget));
    if (!r.ok) {
      setPending(false);
      setError(r.error);
      return;
    }
    router.replace("/today");
    router.refresh();
  }

  return (
    <div className="card w-full max-w-md p-6">
      <h1 className="text-2xl font-bold">Set up your grove</h1>
      <p className="mt-1 text-sm text-muted">Pick what fits best. You can change stages and messages later.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="workspaceName">Business name</label>
          <input className="input" id="workspaceName" name="workspaceName" required minLength={2} maxLength={120} />
        </div>
        <fieldset>
          <legend className="label">What kind of team are you?</legend>
          <div className="mt-2 space-y-2">
            {TYPES.map((t, i) => (
              <label key={t.value} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 has-[:checked]:border-primary">
                <input type="radio" name="accountType" value={t.value} defaultChecked={i === 0} className="mt-1" />
                <span>
                  <span className="block text-sm font-semibold">{t.label}</span>
                  <span className="block text-xs text-muted">{t.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p className="text-sm text-overdue" role="alert">{error}</p>}
        <button className="btn btn-primary w-full" disabled={pending}>{pending ? "One sec..." : "Create workspace"}</button>
      </form>
    </div>
  );
}
