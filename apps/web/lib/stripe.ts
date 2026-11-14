import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Billing is off until GROVE_BILLING=on and a Stripe key is set, so merging this code changes nothing on its own. */
export function billingEnabled() {
  return process.env.GROVE_BILLING === "on" && !!process.env.STRIPE_SECRET_KEY;
}

export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not connected yet. Add STRIPE_SECRET_KEY to the Vercel project.");
  return (client ??= new Stripe(process.env.STRIPE_SECRET_KEY));
}

export function appUrl() {
  return process.env.BETTER_AUTH_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
}
