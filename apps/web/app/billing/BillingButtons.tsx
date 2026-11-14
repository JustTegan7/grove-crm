"use client";

import { useState } from "react";
import type { Interval, SellablePlan } from "@grove/core";
import { checkoutAction, portalAction } from "./actions";

export function CheckoutButton({ plan, interval }: { plan: SellablePlan; interval: Interval }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function go(f: FormData) {
    setPending(true);
    setError(null);
    const r = await checkoutAction(f);
    if (r.ok) window.location.assign(r.url);
    else {
      setPending(false);
      setError(r.error);
    }
  }
  return (
    <form action={go} className="space-y-2">
      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="interval" value={interval} />
      {plan === "dealership" && (
        <div>
          <label className="label" htmlFor="units">Rooftops</label>
          <input className="input" id="units" name="units" type="number" min={1} max={50} defaultValue={1} />
        </div>
      )}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Opening checkout..." : "Start free trial"}</button>
      {error && <p role="alert" className="text-sm text-overdue">{error}</p>}
    </form>
  );
}

export function PortalButton({ label }: { label: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function go() {
    setPending(true);
    setError(null);
    const r = await portalAction();
    if (r.ok) window.location.assign(r.url);
    else {
      setPending(false);
      setError(r.error);
    }
  }
  return (
    <div>
      <button className="btn btn-primary" onClick={go} disabled={pending}>{pending ? "Opening..." : label}</button>
      {error && <p role="alert" className="mt-2 text-sm text-overdue">{error}</p>}
    </div>
  );
}
