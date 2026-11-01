import type { Metadata } from "next";
import { getCtx } from "../../../lib/services/ctx";
import { loadMembers, loadStages } from "../../../lib/services/workspace";
import { ImportWizard } from "../../../components/app/ImportWizard";

export const metadata: Metadata = { title: "Import" };

export default async function ImportPage() {
  const ctx = await getCtx();
  if (ctx.role === "salesperson") {
    return (
      <div>
        <h1 className="text-3xl font-bold">Import</h1>
        <p className="card mt-6 p-10 text-center text-muted">Only owners and managers can import businesses.</p>
      </div>
    );
  }
  const [stages, members] = await Promise.all([loadStages(ctx.workspace.id), loadMembers(ctx.workspace.id)]);
  return (
    <div>
      <h1 className="text-3xl font-bold">Import from CSV</h1>
      <p className="mt-1 text-muted">Bring in your Google Sheets tracker. In Sheets use File, Download, Comma separated values (.csv).</p>
      <ImportWizard
        meId={ctx.userId}
        stages={stages.map((s) => ({ id: s.id, label: s.label, isDefaultNew: s.isDefaultNew }))}
        members={members.map((m) => ({ id: m.id, name: m.name }))}
      />
    </div>
  );
}
