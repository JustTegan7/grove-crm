import type { Metadata } from "next";
import Link from "next/link";
import { addDays } from "@grove/core";
import { getCtx } from "../../../lib/services/ctx";
import { listOpenTasks } from "../../../lib/services/tasks";
import { stageCounts } from "../../../lib/services/contacts";
import { loadMembers, loadStages } from "../../../lib/services/workspace";
import { toTaskView } from "../../../lib/views";
import { TaskRow } from "../../../components/app/TaskRow";

export const metadata: Metadata = { title: "Today" };

function greeting(tz: string) {
  const h = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: tz }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ who?: string }> }) {
  const ctx = await getCtx();
  const { who } = await searchParams;
  const mine = who !== "all";
  const [open, members, stages, counts] = await Promise.all([
    listOpenTasks(ctx, { mine, until: addDays(ctx.today, 7) }),
    loadMembers(ctx.workspace.id),
    loadStages(ctx.workspace.id),
    stageCounts(ctx),
  ]);
  const views = open.map((t) => toTaskView(t, members));
  const overdue = views.filter((t) => t.dueDate < ctx.today);
  const dueToday = views.filter((t) => t.dueDate === ctx.today);
  const soon = views.filter((t) => t.dueDate > ctx.today);
  const total = counts.reduce((a, c) => a + c.count, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted">
              {new Date(ctx.today + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}
            </p>
            <h1 className="text-3xl font-bold">
              {greeting(ctx.workspace.timezone)}, {ctx.name.split(" ")[0]}
            </h1>
          </div>
          <div className="flex rounded-lg bg-surface-2 p-1 text-sm font-semibold" role="group" aria-label="Whose tasks">
            <Link href="/today" className={`rounded-md px-3 py-1 ${mine ? "bg-surface shadow-sm" : "text-muted"}`} aria-current={mine ? "true" : undefined}>
              Mine
            </Link>
            <Link href="/today?who=all" className={`rounded-md px-3 py-1 ${!mine ? "bg-surface shadow-sm" : "text-muted"}`} aria-current={!mine ? "true" : undefined}>
              Everyone
            </Link>
          </div>
        </div>

        {overdue.length + dueToday.length === 0 ? (
          <div className="card mt-8 p-10 text-center">
            <p className="font-display text-2xl font-bold">You are all clear.</p>
            <p className="mt-2 text-sm text-muted">Nothing due today. Add a lead or enjoy the quiet.</p>
          </div>
        ) : (
          <>
            {overdue.length > 0 && (
              <section className="mt-8" aria-labelledby="h-overdue">
                <h2 id="h-overdue" className="mb-3 text-sm font-bold uppercase tracking-wider text-overdue">
                  Overdue · {overdue.length}
                </h2>
                <ul className="space-y-2">
                  {overdue.map((t) => (
                    <TaskRow key={t.id} task={t} today={ctx.today} />
                  ))}
                </ul>
              </section>
            )}
            {dueToday.length > 0 && (
              <section className="mt-8" aria-labelledby="h-today">
                <h2 id="h-today" className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">
                  Due today · {dueToday.length}
                </h2>
                <ul className="space-y-2">
                  {dueToday.map((t) => (
                    <TaskRow key={t.id} task={t} today={ctx.today} />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {soon.length > 0 && (
          <details className="mt-8">
            <summary className="cursor-pointer text-sm font-bold uppercase tracking-wider text-muted">Coming up · {soon.length}</summary>
            <ul className="mt-3 space-y-2">
              {soon.map((t) => (
                <TaskRow key={t.id} task={t} today={ctx.today} />
              ))}
            </ul>
          </details>
        )}
      </div>

      <aside className="space-y-4">
        <div className="card p-5">
          <h2 className="font-bold">Your grove</h2>
          <p className="text-sm text-muted">
            {total} {total === 1 ? "business" : "businesses"}
          </p>
          {total > 0 && (
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              {stages.map((s) => {
                const n = counts.find((c) => c.stageId === s.id)?.count ?? 0;
                return n ? <div key={s.id} style={{ width: `${(n / total) * 100}%`, background: s.color }} /> : null;
              })}
            </div>
          )}
          <ul className="mt-3 space-y-1 text-sm">
            {stages.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                <span className="flex-1 text-muted">{s.label}</span>
                <span className="font-semibold">{counts.find((c) => c.stageId === s.id)?.count ?? 0}</span>
              </li>
            ))}
          </ul>
          <Link href="/pipeline" className="btn btn-soft btn-sm mt-4 w-full">
            Open pipeline
          </Link>
        </div>
        <p className="px-1 text-xs text-muted">Tip: press N anywhere to add a lead.</p>
      </aside>
    </div>
  );
}
