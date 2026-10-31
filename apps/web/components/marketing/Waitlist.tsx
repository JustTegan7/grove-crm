"use client";

import { useActionState } from "react";
import { joinWaitlist, type WaitlistState } from "../../app/(marketing)/actions";

export function Waitlist() {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, { status: "idle" });
  if (state.status === "ok" || state.status === "exists") {
    return (
      <p className="card mx-auto max-w-md p-5 text-center font-semibold" role="status">
        {state.status === "ok" ? "You are on the list. We will email you when Grove opens up." : "You are already on the list. We will be in touch."}
      </p>
    );
  }
  return (
    <form action={action} className="mx-auto flex max-w-md flex-col gap-2 sm:flex-row">
      <label htmlFor="waitlist-email" className="sr-only">Email</label>
      <input id="waitlist-email" name="email" type="email" required placeholder="you@business.com" className="input flex-1" />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Joining..." : "Join the waitlist"}</button>
      {state.status === "error" && <p className="text-sm text-overdue sm:basis-full" role="alert">{state.message}</p>}
    </form>
  );
}
