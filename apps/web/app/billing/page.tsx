import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCtx } from "../../lib/services/ctx";
import { accessOk, getSubscription, trialDaysLeft } from "../../lib/services/billing";
import { billingEnabled } from "../../lib/stripe";
import { PlanCards } from "../../components/PlanCards";
import { GroveLogo } from "../../components/Logo";
import { CheckoutButton, PortalButton } from "./BillingButtons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Billing", robots: { index: false } };

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ interval?: string; done?: string }> }) {
  const ctx = await getCtx();
  if (!billingEnabled()) redirect("/today");
  const { interval, done } = await searchParams;
  const yearly = interval === "year";
  const [sub, ok] = await Promise.all([getSubscription(ctx.workspace.id), accessOk(ctx)]);
  const subscribed = !!sub?.stripeSubscriptionId && sub.status !== "canceled";
  const left = trialDaysLeft(sub?.trialEndsOn ?? null, ctx.today);
  const isOwner = ctx.role === "owner";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <Link href="/today" aria-label="Grove home"><GroveLogo size={32} /></Link>
      <h1 className="mt-8 text-3xl font-bold">Billing</h1>
      <p className="mt-1 text-sm text-muted">{ctx.workspace.name}</p>

      {done && <p role="status" className="card mt-6 p-4">Thanks. Your trial is starting. It can take a few seconds to show up here.</p>}

      {subscribed ? (
        <section className="card mt-6 p-5">
          <h2 className="font-bold capitalize">{sub?.plan} plan · {sub?.status === "trialing" ? "free trial" : sub?.status?.replace("_", " ")}</h2>
          {sub?.status === "trialing" && left != null && <p className="mt-1 text-sm text-muted">{left} {left === 1 ? "day" : "days"} left in your trial. You are charged when it ends.</p>}
          {sub?.cancelAtPeriodEnd && <p className="mt-1 text-sm text-muted">Set to cancel at the end of the current period.</p>}
          {sub?.status === "past_due" && <p className="mt-1 text-sm text-overdue">The last payment failed. Update your card to keep Grove running.</p>}
          <div className="mt-4">{isOwner ? <PortalButton label="Manage subscription" /> : <p className="text-sm text-muted">Only the workspace owner can change billing.</p>}</div>
          {ok && <p className="mt-4 text-sm"><Link href="/today" className="font-semibold underline">Back to Grove</Link></p>}
        </section>
      ) : (
        <>
          <p className="mt-6 max-w-xl text-muted">
            {sub?.status === "canceled" ? "Your subscription ended. Pick a plan to keep going." : "Pick a plan to start your free trial. Your card is saved now and charged when the trial ends."}
          </p>
          {isOwner ? (
            <>
              <div className="mt-6 flex w-fit rounded-lg bg-surface-2 p-1 text-sm font-semibold" role="group" aria-label="Billing period">
                <Link href="/billing" className={`rounded-md px-3 py-1 ${!yearly ? "bg-surface shadow-sm" : "text-muted"}`}>Monthly</Link>
                <Link href="/billing?interval=year" className={`rounded-md px-3 py-1 ${yearly ? "bg-surface shadow-sm" : "text-muted"}`}>Yearly</Link>
              </div>
              <div className="mt-6"><PlanCards interval={yearly ? "year" : "month"} action={(plan) => <CheckoutButton plan={plan} interval={yearly ? "year" : "month"} />} /></div>
            </>
          ) : (
            <p className="card mt-6 p-6 text-muted">Ask your workspace owner to start the subscription.</p>
          )}
        </>
      )}
    </div>
  );
}
