import type { Metadata } from "next";
import Link from "next/link";
import { PlanCards } from "../../../components/PlanCards";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Grove is a clean, cheap lead CRM. Solo, Team and Dealership plans with a 14-day free trial.",
};

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ interval?: string }> }) {
  const { interval } = await searchParams;
  const yearly = interval === "year";
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-4xl font-bold">Simple pricing</h1>
      <p className="mt-2 text-muted">A CRM with nothing in the way. Start free for 14 days.</p>
      <div className="mt-6 flex w-fit rounded-lg bg-surface-2 p-1 text-sm font-semibold" role="group" aria-label="Billing period">
        <Link href="/pricing" className={`rounded-md px-3 py-1 ${!yearly ? "bg-surface shadow-sm" : "text-muted"}`}>Monthly</Link>
        <Link href="/pricing?interval=year" className={`rounded-md px-3 py-1 ${yearly ? "bg-surface shadow-sm" : "text-muted"}`}>Yearly</Link>
      </div>
      <div className="mt-8"><PlanCards interval={yearly ? "year" : "month"} /></div>
      <p className="mt-8 text-sm text-muted">
        Already have a Grove login? <Link href="/login" className="font-semibold underline">Log in</Link> and choose a plan from the billing page.
      </p>
    </div>
  );
}
