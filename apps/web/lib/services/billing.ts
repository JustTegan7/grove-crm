import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type Stripe from "stripe";
import { memberships, subscriptions } from "@grove/db";
import {
  INTERVALS,
  PLANS,
  SELLABLE_PLANS,
  TRIAL_DAYS,
  hasAccess,
  priceLines,
  seatCheck,
  addDays,
  type BillingStatus,
  type PlanKey,
} from "@grove/core";
import { db } from "../db";
import { appUrl, billingEnabled, stripe } from "../stripe";
import { requireRole, type Ctx } from "./ctx";
import { loadMembers } from "./workspace";

export class BillingRequiredError extends Error {
  constructor() {
    super("This workspace needs an active subscription. An owner can manage billing on the web.");
  }
}

export async function getSubscription(workspaceId: string) {
  const [s] = await db().select().from(subscriptions).where(eq(subscriptions.workspaceId, workspaceId));
  return s ?? null;
}

/** Whether this workspace may use Grove now. Always true while billing is off. */
export async function requireAccess(ctx: Ctx) {
  if (!(await accessOk(ctx))) throw new BillingRequiredError();
}

export async function accessOk(ctx: Ctx): Promise<boolean> {
  if (!billingEnabled()) return true;
  const s = await getSubscription(ctx.workspace.id);
  if (!s) return false;
  return hasAccess({ plan: s.plan as PlanKey, status: s.status as BillingStatus, trialEndsOn: s.trialEndsOn, today: ctx.today });
}

const checkoutInput = z.object({
  plan: z.enum(SELLABLE_PLANS),
  interval: z.enum(INTERVALS).default("month"),
  units: z.coerce.number().int().min(1).max(50).default(1),
});

/** Starts a Stripe Checkout with a card-required free trial. Returns the URL to send the owner to. */
export async function createCheckout(ctx: Ctx, raw: unknown): Promise<{ url: string }> {
  requireRole(ctx, ["owner"]);
  const { plan, interval, units } = checkoutInput.parse(raw);
  const members = await loadMembers(ctx.workspace.id);
  const users = members.length;
  const def = PLANS[plan];
  if (def.maxUsers != null && users > def.maxUsers) throw new Error(`${def.label} is for ${def.maxUsers} ${def.maxUsers === 1 ? "person" : "people"}. You have ${users} on the team, so pick Team.`);

  const lines = priceLines(plan, { units, users }, interval);
  const s = stripe();
  const existing = await getSubscription(ctx.workspace.id);
  const session = await s.checkout.sessions.create({
    mode: "subscription",
    payment_method_collection: "always",
    ...(existing?.stripeCustomerId ? { customer: existing.stripeCustomerId } : { customer_email: ctx.email }),
    client_reference_id: ctx.workspace.id,
    line_items: lines.map((l, i) => ({
      quantity: l.quantity,
      price_data: {
        currency: "usd",
        unit_amount: l.unitCents,
        recurring: { interval },
        product_data: { name: l.label, metadata: { role: i === 0 ? "base" : "extra" } },
      },
    })),
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { workspaceId: ctx.workspace.id, plan, interval, units: String(units) },
    },
    metadata: { workspaceId: ctx.workspace.id },
    allow_promotion_codes: true,
    success_url: `${appUrl()}/billing?done=1`,
    cancel_url: `${appUrl()}/billing`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout page. Try again.");
  return { url: session.url };
}

/** Stripe's hosted page for changing the card, switching plan, or canceling. */
export async function createPortal(ctx: Ctx): Promise<{ url: string }> {
  requireRole(ctx, ["owner"]);
  const sub = await getSubscription(ctx.workspace.id);
  if (!sub?.stripeCustomerId) throw new Error("There is no subscription to manage yet.");
  const session = await stripe().billingPortal.sessions.create({ customer: sub.stripeCustomerId, return_url: `${appUrl()}/billing` });
  return { url: session.url };
}

/** Can the owner add one more person to this workspace? Throws with a reason when not. */
export async function assertCanAddUser(ctx: Ctx, pendingInvites: number) {
  if (!billingEnabled()) return;
  const sub = await getSubscription(ctx.workspace.id);
  if (!sub) return;
  const members = await loadMembers(ctx.workspace.id);
  const check = seatCheck({ plan: sub.plan as PlanKey, users: members.length + pendingInvites, includedSeats: sub.includedSeats });
  if (!check.ok) throw new Error(check.reason);
}

function mapStatus(s: string): BillingStatus {
  if (s === "trialing" || s === "active" || s === "past_due" || s === "incomplete") return s;
  if (s === "unpaid" || s === "canceled" || s === "incomplete_expired" || s === "paused") return "canceled";
  return "incomplete";
}

/** Copies a Stripe subscription onto our row. Called from the webhook only. */
async function applySubscription(sub: Stripe.Subscription) {
  const workspaceId = sub.metadata?.workspaceId;
  if (!workspaceId) return;
  const first = sub.items.data[0] as unknown as { current_period_end?: number } | undefined;
  const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end ?? first?.current_period_end;
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const plan = (SELLABLE_PLANS as readonly string[]).includes(sub.metadata.plan ?? "") ? sub.metadata.plan : "team";
  await db()
    .update(subscriptions)
    .set({
      plan,
      status: mapStatus(sub.status),
      interval: sub.metadata.interval === "year" ? "year" : "month",
      units: Number(sub.metadata.units) || 1,
      stripeCustomerId: customer,
      stripeSubscriptionId: sub.id,
      trialEndsOn: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString().slice(0, 10) : null,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.workspaceId, workspaceId));
}

/** Verifies and handles a Stripe webhook. Throws on a bad signature so Stripe sees a 400. */
export async function handleWebhook(payload: string, signature: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signature) throw new Error("Missing webhook secret or signature.");
  const event = stripe().webhooks.constructEvent(payload, signature, secret);
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await applySubscription(event.data.object);
      break;
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode === "subscription" && typeof session.subscription === "string") {
        await applySubscription(await stripe().subscriptions.retrieve(session.subscription));
      }
      break;
    }
    default:
      break;
  }
}

/**
 * Keeps the paid quantity in line with the team. Team bills one unit per user (minimum 2). Dealership bills
 * extra users beyond what each rooftop covers. Best effort: a Stripe hiccup must never block adding someone.
 */
export async function syncSeats(workspaceId: string) {
  if (!billingEnabled()) return;
  try {
    const sub = await getSubscription(workspaceId);
    if (!sub?.stripeSubscriptionId || (sub.plan !== "team" && sub.plan !== "dealership")) return;
    const n = (
      await db()
        .select({ id: memberships.id })
        .from(memberships)
        .where(and(eq(memberships.workspaceId, workspaceId), isNull(memberships.deletedAt)))
    ).length;
    const plan = sub.plan;
    const lines = priceLines(plan, { units: sub.units, users: n }, sub.interval === "year" ? "year" : "month");
    const s = stripe();
    const live = await s.subscriptions.retrieve(sub.stripeSubscriptionId, { expand: ["items.data.price.product"] });
    for (const item of live.items.data) {
      const product = item.price.product as Stripe.Product;
      const role = product.metadata?.role;
      const want = role === "extra" ? (lines[1]?.quantity ?? 0) : lines[0].quantity;
      if (role === "extra" && want === 0) {
        await s.subscriptionItems.del(item.id, { proration_behavior: "create_prorations" });
      } else if (item.quantity !== want) {
        await s.subscriptionItems.update(item.id, { quantity: want, proration_behavior: "create_prorations" });
      }
    }
  } catch (e) {
    console.error("syncSeats failed", e);
  }
}

/** Stops billing when a workspace is deleted, so nobody is charged for something that no longer exists. */
export async function cancelSubscription(workspaceId: string) {
  if (!billingEnabled()) return;
  const sub = await getSubscription(workspaceId);
  if (!sub?.stripeSubscriptionId) return;
  try {
    await stripe().subscriptions.cancel(sub.stripeSubscriptionId);
  } catch (e) {
    console.error("cancelSubscription failed", e);
  }
}

export function trialDaysLeft(trialEndsOn: string | null, today: string): number | null {
  if (!trialEndsOn) return null;
  let n = 0;
  while (addDays(today, n) < trialEndsOn && n < 400) n++;
  return Math.max(0, n);
}
