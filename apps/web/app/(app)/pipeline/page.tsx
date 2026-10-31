import type { Metadata } from "next";
import Link from "next/link";
import { getCtx } from "../../../lib/services/ctx";
import { listContacts } from "../../../lib/services/contacts";
import { loadMembers, loadStages } from "../../../lib/services/workspace";
import { PipelineBoard } from "../../../components/app/PipelineBoard";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ owner?: string }> }) {
  const ctx = await getCtx();
  const { owner } = await searchParams;
  const [stages, members] = await Promise.all([loadStages(ctx.workspace.id), loadMembers(ctx.workspace.id)]);
  const ownerId = owner && members.some((m) => m.id === owner) ? owner : undefined;
  const rows = await listContacts(ctx, { ownerId });
  const chip = (href: string, label: string, on: boolean) => (
    <Link key={href} href={href} className={`pill px-3 py-1 text-sm ${on ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted"}`}>
      {label}
    </Link>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Pipeline</h1>
        <div className="flex flex-wrap gap-2" aria-label="Owner filter">
          {chip("/pipeline", "Everyone", !ownerId)}
          {members.map((m) => chip(`/pipeline?owner=${m.id}`, m.id === ctx.userId ? "Mine" : m.name, ownerId === m.id))}
        </div>
      </div>
      <p className="mb-5 mt-1 text-sm text-muted">Drag a card, or use its stage menu. Grove handles the follow-ups when a stage changes.</p>
      <PipelineBoard
        today={ctx.today}
        stages={stages.map((s) => ({ id: s.id, label: s.label, color: s.color, group: s.group }))}
        cards={rows.map((r) => {
          const m = members.find((x) => x.id === r.ownerId);
          return { id: r.id, name: r.name, niche: r.niche, stageId: r.stageId, nextDue: r.nextDue, owner: m ? { name: m.name, color: m.color } : undefined };
        })}
      />
    </div>
  );
}
