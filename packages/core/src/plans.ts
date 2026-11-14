import { TIERS, type Tier } from "./types";

/**
 * Grove pricing, set from competitor research in Nov 2026 (see docs/pricing.md). Change prices here and nowhere else. All amounts are US cents.
 * Checkout builds its price lines from this file, so the Stripe dashboard needs no products or price ids.
 */
export const PLAN_KEYS = ["solo", "team", "dealership", "included", "comped"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];
/** Plans a customer can buy. "included" comes with an Evergreen website package, "comped" is free (our own team, demo and review accounts). */
export const SELLABLE_PLANS = ["solo", "team", "dealership"] as const;
export type SellablePlan = (typeof SELLABLE_PLANS)[number];

export const INTERVALS = ["month", "year"] as const;
export type Interval = (typeof INTERVALS)[number];

export const TRIAL_DAYS = 14;
/** Paying yearly costs this many months. */
export const YEARLY_MONTHS = 10;

export interface PlanDef {
  key: SellablePlan;
  label: string;
  blurb: string;
  /** Flat monthly price for the base unit: the whole workspace for solo, one user for team, one rooftop for dealership. */
  baseCents: number;
  /** Users covered by the base price. */
  includedUsers: number;
  /** Minimum billed base units. */
  minUnits: number;
  /** Price of each user beyond what the base covers. Null when the base unit is itself a user (team). */
  extraUserCents: number | null;
  /** Largest number of users, or null for no cap. */
  maxUsers: number | null;
  /** Shown in the unit name, for example "per user" or "per rooftop". */
  unit: string;
}

export const PLANS: Record<SellablePlan, PlanDef> = {
  solo: { key: "solo", label: "Solo", blurb: "One person, a clean lead CRM.", baseCents: 1200, includedUsers: 1, minUnits: 1, extraUserCents: null, maxUsers: 1, unit: "flat" },
  team: { key: "team", label: "Team", blurb: "A small team sharing one pipeline.", baseCents: 1000, includedUsers: 1, minUnits: 2, extraUserCents: null, maxUsers: null, unit: "per user" },
  dealership: { key: "dealership", label: "Dealership", blurb: "Per store, with lead rules built for dealerships.", baseCents: 29900, includedUsers: 10, minUnits: 1, extraUserCents: 1500, maxUsers: null, unit: "per rooftop" },
};

/** Users that come free with each Evergreen website tier. Ultra-Lite and Basic do not include Grove; those clients buy it at the standalone price. */
export const INCLUDED_SEATS: Record<Tier, number> = { "Ultra-Lite": 0, Basic: 0, Growth: 3, Elite: 5 };
export function includedSeatsForTier(tier: string): number {
  return (TIERS as readonly string[]).includes(tier) ? INCLUDED_SEATS[tier as Tier] : 0;
}

export interface LineItem {
  /** What the customer sees on the invoice. */
  label: string;
  /** Per unit, per interval, in cents. */
  unitCents: number;
  quantity: number;
}

/** Lines to bill for a plan. `units` is users for team and rooftops for dealership. `users` is the headcount. */
export function priceLines(plan: SellablePlan, input: { units?: number; users: number }, interval: Interval): LineItem[] {
  const p = PLANS[plan];
  const factor = interval === "year" ? YEARLY_MONTHS : 1;
  const units = Math.max(p.minUnits, plan === "team" ? input.users : (input.units ?? 1));
  const lines: LineItem[] = [{ label: plan === "team" ? "Grove Team user" : plan === "dealership" ? "Grove Dealership rooftop" : "Grove Solo", unitCents: p.baseCents * factor, quantity: units }];
  if (p.extraUserCents != null) {
    const extra = Math.max(0, input.users - p.includedUsers * units);
    if (extra > 0) lines.push({ label: "Extra user", unitCents: p.extraUserCents * factor, quantity: extra });
  }
  return lines;
}

export function totalCents(lines: LineItem[]): number {
  return lines.reduce((a, l) => a + l.unitCents * l.quantity, 0);
}

export function dollars(cents: number): string {
  return Number.isInteger(cents / 100) ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

/** Can another user be added? Returns a reason when not. */
export function seatCheck(input: { plan: PlanKey; users: number; includedSeats?: number }): { ok: true } | { ok: false; reason: string } {
  const next = input.users + 1;
  if (input.plan === "solo") return { ok: false, reason: "Solo is for one person. Switch to Team to add people." };
  if (input.plan === "included") {
    const cap = input.includedSeats ?? 1;
    return next <= cap ? { ok: true } : { ok: false, reason: `Your website package includes ${cap} Grove ${cap === 1 ? "user" : "users"}. Ask Evergreen about adding more.` };
  }
  return { ok: true };
}

export type BillingStatus = "trialing" | "active" | "past_due" | "canceled" | "incomplete" | "comped" | "none";

/** Whether a workspace may use Grove right now. Past due keeps working during Stripe's retry window. */
export function hasAccess(input: { plan: PlanKey; status: BillingStatus; trialEndsOn?: string | null; today: string }): boolean {
  if (input.plan === "comped" || input.plan === "included" || input.status === "comped") return true;
  if (input.status === "active" || input.status === "past_due") return true;
  if (input.status === "trialing") return !input.trialEndsOn || input.trialEndsOn >= input.today;
  return false;
}
