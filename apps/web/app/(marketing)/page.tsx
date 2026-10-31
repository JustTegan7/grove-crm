import Link from "next/link";
import { Container } from "../../components/layout/Container";
import { Section } from "../../components/sections/Section";
import { TodayDemo } from "../../components/marketing/TodayDemo";
import { Waitlist } from "../../components/marketing/Waitlist";

const TYPICAL = ["Dashboard", "Leads", "Contacts", "Accounts", "Deals", "Forecasts", "Campaigns", "Sequences", "Reports", "Workflows", "Quotes", "Products", "Cases", "Files", "Marketplace", "Settings"];
const GROVE = ["Today", "Pipeline", "Businesses", "Tasks"];

const FAQ = [
  { q: "What is Grove?", a: "Grove is a customer management system (that is the CMS in thegrovecms.com) for small sales teams. It keeps your leads, your clients and your follow-ups in one clean place." },
  { q: "How do the automatic follow-ups work?", a: "Add a lead and Grove schedules the follow-ups for you: Day 1 email, Day 3 call, Day 5 text, Day 10 email and Day 14 call. Check one off and the next one shows up. When they reply, the follow-ups stop and you take it from there." },
  { q: "Does it send messages for me?", a: "Not yet. Today Grove reminds you who to contact, when and how. Template emails and reviewed texts are next on the roadmap." },
  { q: "Is there a phone app?", a: "Grove works in your phone's browser now. A native iPhone app is planned." },
  { q: "Who is it for?", a: "Small businesses and agencies first, then dealerships. Grove is built by a team that chases leads every day." },
];

export default function Home() {
  return (
    <>
      <section className="overflow-hidden py-16 sm:py-24">
        <Container className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="pill bg-surface-2 text-muted">Customer management, simplified</p>
            <h1 className="mt-5 text-5xl font-extrabold leading-[1.05] sm:text-6xl">
              A CRM with <span className="mark">nothing</span> in the way.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              Grove tells you who to follow up with today, keeps every business in one tidy profile, and moves your pipeline forward without the clutter.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#waitlist" className="btn btn-primary">Join the waitlist</a>
              <Link href="/login" className="btn btn-soft">Log in</Link>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <TodayDemo />
          </div>
        </Container>
      </section>

      <Section id="why" eyebrow="Why grove" heading="Four things on screen. Not twenty six." description="Most CRMs bury the one thing you need under menus you never use. Grove keeps the full power one click away and out of your way.">
        <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
          <div className="card p-5">
            <p className="text-sm font-semibold text-muted">A typical CRM sidebar</p>
            <ul className="mt-3 grid grid-cols-2 gap-1 text-sm text-muted">
              {TYPICAL.map((i) => <li key={i} className="truncate">{i}</li>)}
              <li className="col-span-2 text-xs">...and ten more</li>
            </ul>
          </div>
          <div className="card border-primary p-5">
            <p className="text-sm font-semibold">Grove</p>
            <ul className="mt-3 space-y-2">
              {GROVE.map((i) => <li key={i} className="font-display text-xl font-bold">{i}</li>)}
            </ul>
          </div>
        </div>
      </Section>

      <Section id="how" eyebrow="How it works" heading="Add it. Follow up. Close it." className="bg-surface-2">
        <ol className="grid gap-6 sm:grid-cols-3">
          {[
            ["Add a lead", "Just a business name and a phone number. Everything else can wait."],
            ["Follow the plan", "Grove lines up the Day 1, 3, 5, 10 and 14 touches. Today shows exactly what is due."],
            ["Hand off when they reply", "One tap and the follow-ups stop. The lead is yours to work, with every note in one place."],
          ].map(([t, d], i) => (
            <li key={t} className="card p-6">
              <span className="font-display text-3xl font-extrabold text-muted">{i + 1}</span>
              <h3 className="mt-2 text-xl font-bold">{t}</h3>
              <p className="mt-2 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section eyebrow="Our story" heading="Built by people who chase leads every day">
        <p className="mx-auto max-w-2xl text-center text-muted">
          Grove started inside Evergreen Digital Co., a small web agency that needed a CRM that did not fight back. We tried the big ones and spent more time clicking than calling. So we built the one we wanted: the follow-ups we actually use, the details we actually need, and nothing else.
        </p>
      </Section>

      <Section id="faq" eyebrow="FAQ" heading="Questions">
        <div className="mx-auto max-w-2xl space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="card group p-5">
              <summary className="cursor-pointer list-none font-semibold">{f.q}</summary>
              <p className="mt-3 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      <Section id="waitlist" eyebrow="Early access" heading="Get Grove for your team" description="We are rolling Grove out to a few teams at a time. Leave your email and we will reach out.">
        <Waitlist />
      </Section>
    </>
  );
}
