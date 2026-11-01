import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCtx } from "../../../../lib/services/ctx";
import { getContact, NotFoundError } from "../../../../lib/services/contacts";
import { loadMembers, loadStages, loadSteps } from "../../../../lib/services/workspace";
import { ProfileActions, ProfileForm, LogBox } from "../../../../components/app/Profile";
import { TaskRow } from "../../../../components/app/TaskRow";
import { ChannelIcon } from "../../../../components/app/Icons";
import { FilesBox } from "../../../../components/app/FilesBox";
import { listFiles } from "../../../../lib/services/files";
import { addDays } from "@grove/core";

export const metadata: Metadata = { title: "Business" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function BusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const ctx = await getCtx();
  let data;
  try {
    data = await getContact(ctx, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const { contact: c, openTasks, history } = data;
  const [stages, steps, members, files] = await Promise.all([loadStages(ctx.workspace.id), loadSteps(ctx.workspace.id), loadMembers(ctx.workspace.id), listFiles(ctx, c.id)]);
  const stage = stages.find((s) => s.id === c.stageId);
  const nextStepId = openTasks.find((t) => t.kind === "followup")?.cadenceStepId;
  const owner = members.find((m) => m.id === c.ownerId);

  return (
    <div className="space-y-6">
      <Link href="/businesses" className="text-sm text-muted hover:text-fg">← Businesses</Link>

      <header className="card space-y-4 p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">{c.name}</h1>
            {stage && (
              <span className="pill bg-surface-2">
                <span className="h-2 w-2 rounded-full" style={{ background: stage.color }} />
                {stage.label}
              </span>
            )}
            {c.tier && <span className="pill bg-accent text-accent-fg">{c.tier}</span>}
          </div>
          <p className="mt-1 text-sm text-muted">
            {[c.niche, c.source && `Found via ${c.source}`, owner && `Owner: ${owner.name}`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <ProfileActions
          contact={{ ...c, cadenceActive: c.cadenceActive }}
          stages={stages.map((s) => ({ id: s.id, label: s.label }))}
          members={members.map((m) => ({ id: m.id, name: m.name, color: m.color, role: m.role }))}
          today={ctx.today}
          canDelete={ctx.role !== "salesperson"}
        />
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="order-2 lg:order-1">
          <ProfileForm contact={c} isClient={stage?.checkinDays != null} />
        </div>

        <div className="order-1 space-y-6 lg:order-2">
          <section className="card p-5" aria-labelledby="h-next">
            <h2 id="h-next" className="mb-3 font-bold">Next up</h2>
            {openTasks.length ? (
              <ul className="space-y-2">
                {openTasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    showBusiness={false}
                    today={ctx.today}
                    task={{ id: t.id, kind: t.kind, channel: t.channel, title: t.title, note: t.note, dueDate: t.dueDate, done: false, contactId: c.id, contactName: c.name, contactPhone: c.phone }}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nothing scheduled.</p>
            )}
          </section>

          {c.cadenceActive && c.cadenceStartedOn && (
            <section className="card p-5" aria-labelledby="h-plan">
              <h2 id="h-plan" className="mb-3 font-bold">Follow-up plan</h2>
              <ol className="space-y-2 text-sm">
                {steps.map((s) => {
                  const done = c.cadenceDone.includes(s.id);
                  const next = s.id === nextStepId;
                  return (
                    <li key={s.id} className={`flex items-center gap-3 ${done ? "text-muted line-through" : ""}`}>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${done ? "bg-primary text-primary-fg" : next ? "border-2 border-primary" : "border border-line"}`}>
                        {done ? "✓" : ""}
                      </span>
                      <ChannelIcon channel={s.channel} />
                      <span className="flex-1 font-semibold">Day {s.day} {s.channel}</span>
                      <span className="text-xs text-muted">
                        {new Date(addDays(c.cadenceStartedOn!, s.day - 1) + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          <FilesBox
            contactId={c.id}
            files={files.map((f) => ({
              id: f.id,
              name: f.name,
              contentType: f.contentType,
              size: f.size,
              date: f.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: ctx.workspace.timezone }),
            }))}
          />

          <section className="card space-y-4 p-5" aria-labelledby="h-activity">
            <h2 id="h-activity" className="font-bold">Activity</h2>
            <LogBox contactId={c.id} />
            <ol className="space-y-3 border-l border-line pl-4">
              {history.map((a) => {
                const who = members.find((m) => m.id === a.actorId)?.name;
                return (
                  <li key={a.id} className="text-sm">
                    <p>
                      <span className="pill mr-1 bg-surface-2 capitalize text-muted">{a.type}</span>
                      {a.body}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {who ? `${who} · ` : ""}
                      {a.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: ctx.workspace.timezone })}
                    </p>
                  </li>
                );
              })}
              {history.length === 0 && <li className="text-sm text-muted">No activity yet.</li>}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
