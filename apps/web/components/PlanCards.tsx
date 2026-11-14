import { PLANS, SELLABLE_PLANS, TRIAL_DAYS, YEARLY_MONTHS, dollars, type Interval, type SellablePlan } from "@grove/core";

function priceText(plan: SellablePlan, interval: Interval) {
  const p = PLANS[plan];
  const f = interval === "year" ? YEARLY_MONTHS : 1;
  const per = interval === "year" ? "year" : "month";
  return `${dollars(p.baseCents * f)}/${per}`;
}

function detail(plan: SellablePlan) {
  const p = PLANS[plan];
  if (plan === "solo") return "One user. Everything in Grove.";
  if (plan === "team") return `Per user, minimum ${p.minUnits} users. Add people any time.`;
  return `Per rooftop, covers ${p.includedUsers} users. Extra users ${dollars(p.extraUserCents ?? 0)} each per month.`;
}

/** The three plans with prices. `action` renders the button under each plan, or nothing on the public page. */
export function PlanCards({ interval, action }: { interval: Interval; action?: (plan: SellablePlan) => React.ReactNode }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {SELLABLE_PLANS.map((key) => (
        <section key={key} className="card flex flex-col p-5" aria-labelledby={`plan-${key}`}>
          <h2 id={`plan-${key}`} className="text-lg font-bold">{PLANS[key].label}</h2>
          <p className="mt-1 text-sm text-muted">{PLANS[key].blurb}</p>
          <p className="mt-4 text-3xl font-bold">{priceText(key, interval)}</p>
          <p className="text-sm text-muted">{PLANS[key].unit === "flat" ? "flat" : PLANS[key].unit}</p>
          <p className="mt-3 flex-1 text-sm">{detail(key)}</p>
          {action && <div className="mt-4">{action(key)}</div>}
        </section>
      ))}
      <p className="text-sm text-muted md:col-span-3">
        {TRIAL_DAYS}-day free trial on every plan, card required. Pay yearly and get 2 months free.
      </p>
    </div>
  );
}
