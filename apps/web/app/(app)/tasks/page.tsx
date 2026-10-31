import type { Metadata } from "next";
import Link from "next/link";
import { addDays } from "@grove/core";
import { getCtx } from "../../../lib/services/ctx";
import { listOpenTasks, listRecentlyDone } from "../../../lib/services/tasks";
import { loadMembers } from "../../../lib/services/workspace";
import { toTaskView } from "../../../lib/views";
import { TaskRow, type TaskView } from "../../../components/app/TaskRow";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ owner?: string }> }) {
  const ctx = await getCtx();
  const { owner } = await searchParams;
  const members = await loadMembers(ctx.workspace.id);
  const ownerId = owner === "all" ? undefined : owner && members.some((m) => m.id === owner) ? owner : ctx.userId;
  const [open, done] = await Promise.all([listOpenTasks(ctx, { mine: false, ownerId }), listRecentlyDone(ctx, { ownerId })]);
  const views = open.map((t) => toTaskView(t, members));
  const week = addDays(ctx.today, 7);
  const groups: [string, TaskView[]][] = [
    ["Overdue", views.filter((t) => t.dueDate < ctx.today)],
    ["Today", views.filter((t) => t.dueDate === ctx.today)],
    ["This week", views.filter((t) => t.dueDate > ctx.today && t.dueDate <= week)],
    ["Later", views.filter((t) => t.dueDate > week)],
    ["Recently done", done.map((t) => toTaskView(t, members))],
  ];
  const chip = (href: string, label: string, on: boolean) => (
    <Link key={href} href={href} className={`pill px-3 py-1 text-sm ${on ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted"}`}>
      {label}
    </Link>
  );

  return (
    <div>
      <h1 className="text-3xl font-bold">Tasks</h1>
      <div className="mt-4 flex flex-wrap gap-2" aria-label="Owner filter">
        {chip("/tasks?owner=all", "Everyone", owner === "all")}
        {members.map((m) => chip(`/tasks?owner=${m.id}`, m.id === ctx.userId ? "Mine" : m.name, ownerId === m.id))}
      </div>
      {groups.map(([label, list]) =>
        list.length ? (
          <section key={label} className="mt-8">
            <h2 className={`mb-3 text-sm font-bold uppercase tracking-wider ${label === "Overdue" ? "text-overdue" : "text-muted"}`}>
              {label} · {list.length}
            </h2>
            <ul className="space-y-2">
              {list.map((t) => (
                <TaskRow key={t.id} task={t} today={ctx.today} />
              ))}
            </ul>
          </section>
        ) : null,
      )}
      {views.length === 0 && done.length === 0 && <p className="card mt-8 p-10 text-center text-muted">No tasks yet. Add a lead and Grove lines them up.</p>}
    </div>
  );
}
